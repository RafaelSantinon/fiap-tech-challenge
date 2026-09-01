import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Service } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,
  ) {}

  async create(dto: CreateServiceDto): Promise<Service> {
    await this.assertNameIsFree(dto.name);

    const service = this.servicesRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      price: dto.price,
      estimatedMinutes: dto.estimatedMinutes,
    });
    return this.servicesRepository.save(service);
  }

  findAll(includeInactive = false): Promise<Service[]> {
    const where: FindOptionsWhere<Service> = includeInactive
      ? {}
      : { isActive: true };
    return this.servicesRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Service> {
    const service = await this.servicesRepository.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException('Serviço não encontrado.');
    }
    return service;
  }

  async update(id: string, dto: UpdateServiceDto): Promise<Service> {
    const service = await this.findOne(id);

    if (dto.name !== undefined && dto.name !== service.name) {
      await this.assertNameIsFree(dto.name);
      service.name = dto.name;
    }

    if (dto.description !== undefined) service.description = dto.description;
    if (dto.price !== undefined) service.price = dto.price;
    if (dto.estimatedMinutes !== undefined) {
      service.estimatedMinutes = dto.estimatedMinutes;
    }
    if (dto.isActive !== undefined) service.isActive = dto.isActive;

    return this.servicesRepository.save(service);
  }

  async remove(id: string): Promise<void> {
    const service = await this.findOne(id);
    service.isActive = false;
    await this.servicesRepository.save(service);
  }

  private async assertNameIsFree(name: string): Promise<void> {
    const existing = await this.servicesRepository.findOne({ where: { name } });
    if (existing) {
      throw new ConflictException('Já existe um serviço com este nome.');
    }
  }
}
