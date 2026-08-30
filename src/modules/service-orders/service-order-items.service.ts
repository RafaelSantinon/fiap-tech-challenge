import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  EntityTarget,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { ServiceOrderStatus } from '../../common/enums/service-order-status.enum';
import { ServicesService } from '../services/services.service';
import { PartsService } from '../parts/parts.service';
import { SuppliesService } from '../supplies/supplies.service';
import { ServiceOrder } from './entities/service-order.entity';
import { ServiceOrderService } from './entities/service-order-service.entity';
import { ServiceOrderPart } from './entities/service-order-part.entity';
import { ServiceOrderSupply } from './entities/service-order-supply.entity';
import { AddOrderServiceDto } from './dto/add-order-service.dto';
import { AddOrderPartDto } from './dto/add-order-part.dto';
import { AddOrderSupplyDto } from './dto/add-order-supply.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { ServiceOrdersService } from './service-orders.service';

const EDITABLE_STATUSES = [
  ServiceOrderStatus.RECEIVED,
  ServiceOrderStatus.IN_DIAGNOSIS,
];

@Injectable()
export class ServiceOrderItemsService {
  constructor(
    @InjectRepository(ServiceOrderService)
    private readonly orderServicesRepository: Repository<ServiceOrderService>,
    @InjectRepository(ServiceOrderPart)
    private readonly orderPartsRepository: Repository<ServiceOrderPart>,
    @InjectRepository(ServiceOrderSupply)
    private readonly orderSuppliesRepository: Repository<ServiceOrderSupply>,
    private readonly servicesService: ServicesService,
    private readonly partsService: PartsService,
    private readonly suppliesService: SuppliesService,
    private readonly serviceOrdersService: ServiceOrdersService,
  ) {}

  async addService(
    orderId: string,
    dto: AddOrderServiceDto,
    manager?: EntityManager,
  ): Promise<ServiceOrderService> {
    await this.assertOrderIsEditable(orderId);

    const service = await this.servicesService.findOne(dto.serviceId);
    if (!service.isActive) {
      throw new ConflictException(
        'Não é possível incluir um serviço inativo na ordem de serviço.',
      );
    }
    await this.assertServiceIsNew(orderId, dto.serviceId);

    const repository = this.repositoryFor(
      ServiceOrderService,
      this.orderServicesRepository,
      manager,
    );
    const item = repository.create({
      serviceOrderId: orderId,
      serviceId: dto.serviceId,
      quantity: dto.quantity,
      unitPrice: service.price,
      totalPrice: this.round(service.price * dto.quantity),
    });
    return repository.save(item);
  }

  async addPart(
    orderId: string,
    dto: AddOrderPartDto,
    manager?: EntityManager,
  ): Promise<ServiceOrderPart> {
    await this.assertOrderIsEditable(orderId);

    const part = await this.partsService.assertAvailable(
      dto.partId,
      dto.quantity,
    );
    if (!part.isActive) {
      throw new ConflictException(
        'Não é possível incluir uma peça inativa na ordem de serviço.',
      );
    }
    await this.assertPartIsNew(orderId, dto.partId);

    const repository = this.repositoryFor(
      ServiceOrderPart,
      this.orderPartsRepository,
      manager,
    );
    const item = repository.create({
      serviceOrderId: orderId,
      partId: dto.partId,
      quantity: dto.quantity,
      unitPrice: part.unitPrice,
      totalPrice: this.round(part.unitPrice * dto.quantity),
    });
    return repository.save(item);
  }

  async addSupply(
    orderId: string,
    dto: AddOrderSupplyDto,
    manager?: EntityManager,
  ): Promise<ServiceOrderSupply> {
    await this.assertOrderIsEditable(orderId);

    const supply = await this.suppliesService.assertAvailable(
      dto.supplyId,
      dto.quantity,
    );
    if (!supply.isActive) {
      throw new ConflictException(
        'Não é possível incluir um insumo inativo na ordem de serviço.',
      );
    }
    await this.assertSupplyIsNew(orderId, dto.supplyId);

    const repository = this.repositoryFor(
      ServiceOrderSupply,
      this.orderSuppliesRepository,
      manager,
    );
    const item = repository.create({
      serviceOrderId: orderId,
      supplyId: dto.supplyId,
      quantity: dto.quantity,
      unitPrice: supply.unitPrice,
      totalPrice: this.round(supply.unitPrice * dto.quantity),
    });
    return repository.save(item);
  }

  async updateService(
    orderId: string,
    itemId: string,
    dto: UpdateOrderItemDto,
  ): Promise<ServiceOrderService> {
    await this.assertOrderIsEditable(orderId);
    const item = await this.findServiceItem(orderId, itemId);

    item.quantity = dto.quantity;
    item.totalPrice = this.round(item.unitPrice * dto.quantity);
    return this.orderServicesRepository.save(item);
  }

  async updatePart(
    orderId: string,
    itemId: string,
    dto: UpdateOrderItemDto,
  ): Promise<ServiceOrderPart> {
    await this.assertOrderIsEditable(orderId);
    const item = await this.findPartItem(orderId, itemId);
    await this.partsService.assertAvailable(item.partId, dto.quantity);

    item.quantity = dto.quantity;
    item.totalPrice = this.round(item.unitPrice * dto.quantity);
    return this.orderPartsRepository.save(item);
  }

  async updateSupply(
    orderId: string,
    itemId: string,
    dto: UpdateOrderItemDto,
  ): Promise<ServiceOrderSupply> {
    await this.assertOrderIsEditable(orderId);
    const item = await this.findSupplyItem(orderId, itemId);
    await this.suppliesService.assertAvailable(item.supplyId, dto.quantity);

    item.quantity = dto.quantity;
    item.totalPrice = this.round(item.unitPrice * dto.quantity);
    return this.orderSuppliesRepository.save(item);
  }

  async removeService(orderId: string, itemId: string): Promise<void> {
    await this.assertOrderIsEditable(orderId);
    const item = await this.findServiceItem(orderId, itemId);
    await this.orderServicesRepository.remove(item);
  }

  async removePart(orderId: string, itemId: string): Promise<void> {
    await this.assertOrderIsEditable(orderId);
    const item = await this.findPartItem(orderId, itemId);
    await this.orderPartsRepository.remove(item);
  }

  async removeSupply(orderId: string, itemId: string): Promise<void> {
    await this.assertOrderIsEditable(orderId);
    const item = await this.findSupplyItem(orderId, itemId);
    await this.orderSuppliesRepository.remove(item);
  }

  private async assertOrderIsEditable(orderId: string): Promise<ServiceOrder> {
    const order = await this.serviceOrdersService.findOne(orderId);
    if (!order.isActive) {
      throw new ConflictException(
        'Não é possível alterar os itens de uma ordem de serviço inativa.',
      );
    }
    if (!EDITABLE_STATUSES.includes(order.status)) {
      throw new ConflictException(
        'A ordem de serviço não aceita mais alteração de itens depois que o orçamento é gerado.',
      );
    }
    return order;
  }

  private async assertServiceIsNew(
    orderId: string,
    serviceId: string,
  ): Promise<void> {
    const existing = await this.orderServicesRepository.findOne({
      where: { serviceOrderId: orderId, serviceId },
    });
    if (existing) {
      throw new ConflictException(
        'Este serviço já está na ordem de serviço. Atualize a quantidade do item.',
      );
    }
  }

  private async assertPartIsNew(
    orderId: string,
    partId: string,
  ): Promise<void> {
    const existing = await this.orderPartsRepository.findOne({
      where: { serviceOrderId: orderId, partId },
    });
    if (existing) {
      throw new ConflictException(
        'Esta peça já está na ordem de serviço. Atualize a quantidade do item.',
      );
    }
  }

  private async assertSupplyIsNew(
    orderId: string,
    supplyId: string,
  ): Promise<void> {
    const existing = await this.orderSuppliesRepository.findOne({
      where: { serviceOrderId: orderId, supplyId },
    });
    if (existing) {
      throw new ConflictException(
        'Este insumo já está na ordem de serviço. Atualize a quantidade do item.',
      );
    }
  }

  private async findServiceItem(
    orderId: string,
    itemId: string,
  ): Promise<ServiceOrderService> {
    const item = await this.orderServicesRepository.findOne({
      where: { id: itemId, serviceOrderId: orderId },
    });
    if (!item) {
      throw new NotFoundException(
        'Serviço não encontrado nesta ordem de serviço.',
      );
    }
    return item;
  }

  private async findPartItem(
    orderId: string,
    itemId: string,
  ): Promise<ServiceOrderPart> {
    const item = await this.orderPartsRepository.findOne({
      where: { id: itemId, serviceOrderId: orderId },
    });
    if (!item) {
      throw new NotFoundException(
        'Peça não encontrada nesta ordem de serviço.',
      );
    }
    return item;
  }

  private async findSupplyItem(
    orderId: string,
    itemId: string,
  ): Promise<ServiceOrderSupply> {
    const item = await this.orderSuppliesRepository.findOne({
      where: { id: itemId, serviceOrderId: orderId },
    });
    if (!item) {
      throw new NotFoundException(
        'Insumo não encontrado nesta ordem de serviço.',
      );
    }
    return item;
  }

  private repositoryFor<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
    fallback: Repository<T>,
    manager?: EntityManager,
  ): Repository<T> {
    return manager ? manager.getRepository(entity) : fallback;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
