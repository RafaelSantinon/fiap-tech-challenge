import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { Part } from './entities/part.entity';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { normalizeCode } from '../../common/utils/code.util';

@Injectable()
export class PartsService {
  constructor(
    @InjectRepository(Part)
    private readonly partsRepository: Repository<Part>,
  ) {}

  async create(dto: CreatePartDto): Promise<Part> {
    const code = normalizeCode(dto.code);
    await this.assertCodeIsFree(code);

    const part = this.partsRepository.create({
      code,
      name: dto.name,
      description: dto.description ?? null,
      brand: dto.brand ?? null,
      unitPrice: dto.unitPrice,
      stockQuantity: dto.stockQuantity ?? 0,
      minimumStock: dto.minimumStock ?? 0,
    });
    return this.partsRepository.save(part);
  }

  findAll(includeInactive = false): Promise<Part[]> {
    const where: FindOptionsWhere<Part> = includeInactive
      ? {}
      : { isActive: true };
    return this.partsRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Part> {
    const part = await this.partsRepository.findOne({ where: { id } });
    if (!part) {
      throw new NotFoundException('Peça não encontrada.');
    }
    return part;
  }

  async findByCode(code: string): Promise<Part> {
    const part = await this.partsRepository.findOne({
      where: { code: normalizeCode(code) },
    });
    if (!part) {
      throw new NotFoundException('Peça não encontrada.');
    }
    return part;
  }

  async update(id: string, dto: UpdatePartDto): Promise<Part> {
    const part = await this.findOne(id);

    if (dto.code) {
      const code = normalizeCode(dto.code);
      if (code !== part.code) {
        await this.assertCodeIsFree(code);
        part.code = code;
      }
    }

    if (dto.name !== undefined) part.name = dto.name;
    if (dto.description !== undefined) part.description = dto.description;
    if (dto.brand !== undefined) part.brand = dto.brand;
    if (dto.unitPrice !== undefined) part.unitPrice = dto.unitPrice;
    if (dto.stockQuantity !== undefined) part.stockQuantity = dto.stockQuantity;
    if (dto.minimumStock !== undefined) part.minimumStock = dto.minimumStock;
    if (dto.isActive !== undefined) part.isActive = dto.isActive;

    return this.partsRepository.save(part);
  }

  async remove(id: string): Promise<void> {
    const part = await this.findOne(id);
    part.isActive = false;
    await this.partsRepository.save(part);
  }

  availableQuantity(part: Part): number {
    return part.stockQuantity - part.reservedQuantity;
  }

  async assertAvailable(id: string, quantity: number): Promise<Part> {
    const part = await this.findOne(id);
    if (this.availableQuantity(part) < quantity) {
      throw new ConflictException(
        `Estoque insuficiente para a peça ${part.code}.`,
      );
    }
    return part;
  }

  async reserve(
    id: string,
    quantity: number,
    manager: EntityManager,
  ): Promise<void> {
    const part = await this.lockForUpdate(id, manager);
    if (this.availableQuantity(part) < quantity) {
      throw new ConflictException(
        `Estoque insuficiente para a peça ${part.code}.`,
      );
    }
    part.reservedQuantity += quantity;
    await manager.save(Part, part);
  }

  async release(
    id: string,
    quantity: number,
    manager: EntityManager,
  ): Promise<void> {
    const part = await this.lockForUpdate(id, manager);
    part.reservedQuantity = Math.max(0, part.reservedQuantity - quantity);
    await manager.save(Part, part);
  }

  async consume(
    id: string,
    quantity: number,
    manager: EntityManager,
  ): Promise<void> {
    const part = await this.lockForUpdate(id, manager);
    part.reservedQuantity = Math.max(0, part.reservedQuantity - quantity);
    part.stockQuantity = Math.max(0, part.stockQuantity - quantity);
    await manager.save(Part, part);
  }

  private async lockForUpdate(
    id: string,
    manager: EntityManager,
  ): Promise<Part> {
    const part = await manager.findOne(Part, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!part) {
      throw new NotFoundException('Peça não encontrada.');
    }
    return part;
  }

  private async assertCodeIsFree(code: string): Promise<void> {
    const existing = await this.partsRepository.findOne({ where: { code } });
    if (existing) {
      throw new ConflictException('Já existe uma peça com este código.');
    }
  }
}
