import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CustomersService } from '../customers/customers.service';
import { normalizePlate } from '../../common/utils/plate.util';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    private readonly customersService: CustomersService,
  ) {}

  async create(dto: CreateVehicleDto): Promise<Vehicle> {
    await this.assertCustomerIsActive(dto.customerId);

    const plate = normalizePlate(dto.plate);
    await this.assertPlateIsFree(plate);

    const vehicle = this.vehiclesRepository.create({
      plate,
      brand: dto.brand,
      model: dto.model,
      year: dto.year,
      customerId: dto.customerId,
    });
    return this.vehiclesRepository.save(vehicle);
  }

  findAll(customerId?: string, includeInactive = false): Promise<Vehicle[]> {
    const where: FindOptionsWhere<Vehicle> = {};
    if (customerId) where.customerId = customerId;
    if (!includeInactive) where.isActive = true;

    return this.vehiclesRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findOne({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.');
    }
    return vehicle;
  }

  async findByPlate(plate: string): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findOne({
      where: { plate: normalizePlate(plate) },
    });
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.');
    }
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.findOne(id);

    if (dto.plate) {
      const plate = normalizePlate(dto.plate);
      if (plate !== vehicle.plate) {
        await this.assertPlateIsFree(plate);
        vehicle.plate = plate;
      }
    }

    if (dto.customerId && dto.customerId !== vehicle.customerId) {
      await this.assertCustomerIsActive(dto.customerId);
      vehicle.customerId = dto.customerId;
    }

    if (dto.brand !== undefined) vehicle.brand = dto.brand;
    if (dto.model !== undefined) vehicle.model = dto.model;
    if (dto.year !== undefined) vehicle.year = dto.year;
    if (dto.isActive !== undefined) vehicle.isActive = dto.isActive;

    return this.vehiclesRepository.save(vehicle);
  }

  async remove(id: string): Promise<void> {
    const vehicle = await this.findOne(id);
    vehicle.isActive = false;
    await this.vehiclesRepository.save(vehicle);
  }

  private async assertCustomerIsActive(customerId: string): Promise<void> {
    const customer = await this.customersService.findOne(customerId);
    if (!customer.isActive) {
      throw new ConflictException(
        'Não é possível cadastrar um veículo para um cliente inativo.',
      );
    }
  }

  private async assertPlateIsFree(plate: string): Promise<void> {
    const existing = await this.vehiclesRepository.findOne({
      where: { plate },
    });
    if (existing) {
      throw new ConflictException('Já existe um veículo com esta placa.');
    }
  }
}
