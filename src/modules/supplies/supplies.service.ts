import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { Supply } from './entities/supply.entity';
import { CreateSupplyDto } from './dto/create-supply.dto';
import { UpdateSupplyDto } from './dto/update-supply.dto';
import { normalizeCode } from '../../common/utils/code.util';

@Injectable()
export class SuppliesService {
  constructor(
    @InjectRepository(Supply)
    private readonly suppliesRepository: Repository<Supply>,
  ) {}

  async create(dto: CreateSupplyDto): Promise<Supply> {
    const code = normalizeCode(dto.code);
    await this.assertCodeIsFree(code);

    const supply = this.suppliesRepository.create({
      code,
      name: dto.name,
      description: dto.description ?? null,
      unit: dto.unit,
      unitPrice: dto.unitPrice,
      stockQuantity: dto.stockQuantity ?? 0,
      minimumStock: dto.minimumStock ?? 0,
    });
    return this.suppliesRepository.save(supply);
  }

  findAll(includeInactive = false): Promise<Supply[]> {
    const where: FindOptionsWhere<Supply> = includeInactive
      ? {}
      : { isActive: true };
    return this.suppliesRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Supply> {
    const supply = await this.suppliesRepository.findOne({ where: { id } });
    if (!supply) {
      throw new NotFoundException('Insumo não encontrado.');
    }
    return supply;
  }

  async findByCode(code: string): Promise<Supply> {
    const supply = await this.suppliesRepository.findOne({
      where: { code: normalizeCode(code) },
    });
    if (!supply) {
      throw new NotFoundException('Insumo não encontrado.');
    }
    return supply;
  }

  async update(id: string, dto: UpdateSupplyDto): Promise<Supply> {
    const supply = await this.findOne(id);

    if (dto.code) {
      const code = normalizeCode(dto.code);
      if (code !== supply.code) {
        await this.assertCodeIsFree(code);
        supply.code = code;
      }
    }

    if (dto.name !== undefined) supply.name = dto.name;
    if (dto.description !== undefined) supply.description = dto.description;
    if (dto.unit !== undefined) supply.unit = dto.unit;
    if (dto.unitPrice !== undefined) supply.unitPrice = dto.unitPrice;
    if (dto.stockQuantity !== undefined) {
      supply.stockQuantity = dto.stockQuantity;
    }
    if (dto.minimumStock !== undefined) supply.minimumStock = dto.minimumStock;
    if (dto.isActive !== undefined) supply.isActive = dto.isActive;

    return this.suppliesRepository.save(supply);
  }

  async remove(id: string): Promise<void> {
    const supply = await this.findOne(id);
    supply.isActive = false;
    await this.suppliesRepository.save(supply);
  }

  availableQuantity(supply: Supply): number {
    return supply.stockQuantity - supply.reservedQuantity;
  }

  async assertAvailable(id: string, quantity: number): Promise<Supply> {
    const supply = await this.findOne(id);
    if (this.availableQuantity(supply) < quantity) {
      throw new ConflictException(
        `Estoque insuficiente para o insumo ${supply.code}.`,
      );
    }
    return supply;
  }

  async reserve(
    id: string,
    quantity: number,
    manager: EntityManager,
  ): Promise<void> {
    const supply = await this.lockForUpdate(id, manager);
    if (this.availableQuantity(supply) < quantity) {
      throw new ConflictException(
        `Estoque insuficiente para o insumo ${supply.code}.`,
      );
    }
    supply.reservedQuantity += quantity;
    await manager.save(Supply, supply);
  }

  async release(
    id: string,
    quantity: number,
    manager: EntityManager,
  ): Promise<void> {
    const supply = await this.lockForUpdate(id, manager);
    supply.reservedQuantity = Math.max(0, supply.reservedQuantity - quantity);
    await manager.save(Supply, supply);
  }

  async consume(
    id: string,
    quantity: number,
    manager: EntityManager,
  ): Promise<void> {
    const supply = await this.lockForUpdate(id, manager);
    supply.reservedQuantity = Math.max(0, supply.reservedQuantity - quantity);
    supply.stockQuantity = Math.max(0, supply.stockQuantity - quantity);
    await manager.save(Supply, supply);
  }

  private async lockForUpdate(
    id: string,
    manager: EntityManager,
  ): Promise<Supply> {
    const supply = await manager.findOne(Supply, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!supply) {
      throw new NotFoundException('Insumo não encontrado.');
    }
    return supply;
  }

  private async assertCodeIsFree(code: string): Promise<void> {
    const existing = await this.suppliesRepository.findOne({ where: { code } });
    if (existing) {
      throw new ConflictException('Já existe um insumo com este código.');
    }
  }
}
