import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsRelations,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { ServiceOrderStatus } from '../../common/enums/service-order-status.enum';
import { CustomersService } from '../customers/customers.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { StockService } from '../stock/stock.service';
import { ServiceOrder } from './entities/service-order.entity';
import { toPartLines, toSupplyLines } from './service-order-stock.util';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';

const ORDER_RELATIONS: FindOptionsRelations<ServiceOrder> = {
  customer: true,
  vehicle: true,
  services: { service: true },
  parts: { part: true },
  supplies: { supply: true },
  quote: true,
};

const MANUAL_TRANSITIONS: Partial<
  Record<ServiceOrderStatus, ServiceOrderStatus[]>
> = {
  [ServiceOrderStatus.RECEIVED]: [ServiceOrderStatus.IN_DIAGNOSIS],
  [ServiceOrderStatus.IN_PROGRESS]: [ServiceOrderStatus.FINISHED],
  [ServiceOrderStatus.FINISHED]: [ServiceOrderStatus.DELIVERED],
};

@Injectable()
export class ServiceOrdersService {
  constructor(
    @InjectRepository(ServiceOrder)
    private readonly serviceOrdersRepository: Repository<ServiceOrder>,
    private readonly customersService: CustomersService,
    private readonly vehiclesService: VehiclesService,
    private readonly stockService: StockService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateServiceOrderDto): Promise<ServiceOrder> {
    const customer = await this.customersService.findOne(dto.customerId);
    if (!customer.isActive) {
      throw new ConflictException(
        'Não é possível abrir uma ordem de serviço para um cliente inativo.',
      );
    }

    const vehicle = await this.vehiclesService.findOne(dto.vehicleId);
    if (!vehicle.isActive) {
      throw new ConflictException(
        'Não é possível abrir uma ordem de serviço para um veículo inativo.',
      );
    }
    if (vehicle.customerId !== customer.id) {
      throw new ConflictException(
        'O veículo informado não pertence a este cliente.',
      );
    }

    const order = this.serviceOrdersRepository.create({
      customerId: dto.customerId,
      vehicleId: dto.vehicleId,
      description: dto.description ?? null,
      status: ServiceOrderStatus.RECEIVED,
      statusDurations: {},
      statusChangedAt: new Date(),
    });
    const saved = await this.serviceOrdersRepository.save(order);
    return this.findOne(saved.id);
  }

  findAll(
    status?: ServiceOrderStatus,
    customerId?: string,
    vehicleId?: string,
    includeInactive = false,
  ): Promise<ServiceOrder[]> {
    const where: FindOptionsWhere<ServiceOrder> = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (vehicleId) where.vehicleId = vehicleId;
    if (!includeInactive) where.isActive = true;

    return this.serviceOrdersRepository.find({
      where,
      relations: ORDER_RELATIONS,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, manager?: EntityManager): Promise<ServiceOrder> {
    const repository = manager
      ? manager.getRepository(ServiceOrder)
      : this.serviceOrdersRepository;
    const order = await repository.findOne({
      where: { id },
      relations: ORDER_RELATIONS,
    });
    if (!order) {
      throw new NotFoundException('Ordem de serviço não encontrada.');
    }
    return order;
  }

  async findByNumber(
    number: string,
    manager?: EntityManager,
  ): Promise<ServiceOrder> {
    const repository = manager
      ? manager.getRepository(ServiceOrder)
      : this.serviceOrdersRepository;
    const order = await repository.findOne({
      where: { number: number.trim().toUpperCase() },
      relations: ORDER_RELATIONS,
    });
    if (!order) {
      throw new NotFoundException('Ordem de serviço não encontrada.');
    }
    return order;
  }

  async update(id: string, dto: UpdateServiceOrderDto): Promise<ServiceOrder> {
    const order = await this.findOne(id);

    if (dto.description !== undefined) order.description = dto.description;
    if (dto.isActive !== undefined) order.isActive = dto.isActive;

    await this.serviceOrdersRepository.update(id, {
      description: order.description,
      isActive: order.isActive,
    });
    return this.findOne(id);
  }

  async changeStatusManually(
    id: string,
    next: ServiceOrderStatus,
  ): Promise<ServiceOrder> {
    const order = await this.findOne(id);
    const allowed = MANUAL_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Não é possível mudar a ordem de serviço de ${order.status} para ${next}.`,
      );
    }

    await this.dataSource.transaction((manager) =>
      this.changeStatus(order, next, manager),
    );
    return this.findOne(id);
  }

  async changeStatus(
    order: ServiceOrder,
    next: ServiceOrderStatus,
    manager: EntityManager,
  ): Promise<ServiceOrder> {
    const now = new Date();
    const startedAt = new Date(order.statusChangedAt).getTime();
    const elapsed = Math.max(0, Math.round((now.getTime() - startedAt) / 1000));

    const durations = { ...(order.statusDurations ?? {}) };
    durations[order.status] = (durations[order.status] ?? 0) + elapsed;

    order.statusDurations = durations;
    order.status = next;
    order.statusChangedAt = now;

    await manager.update(ServiceOrder, order.id, {
      status: next,
      statusDurations: durations,
      statusChangedAt: now,
    });
    return order;
  }

  async remove(id: string): Promise<void> {
    const order = await this.findOne(id);

    await this.dataSource.transaction(async (manager) => {
      if (order.status === ServiceOrderStatus.AWAITING_APPROVAL) {
        await this.stockService.release(
          toPartLines(order),
          toSupplyLines(order),
          manager,
        );
      }
      order.isActive = false;
      await manager.update(ServiceOrder, order.id, { isActive: false });
    });
  }
}
