import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import {
  normalizeDocument,
  resolveDocumentType,
} from '../../common/utils/document.util';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
  ) {}

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const document = normalizeDocument(dto.document);
    await this.assertDocumentIsFree(document);

    const customer = this.customersRepository.create({
      name: dto.name,
      document,
      documentType: resolveDocumentType(document),
      email: dto.email,
      phone: dto.phone ?? null,
    });
    return this.customersRepository.save(customer);
  }

  findAll(includeInactive = false): Promise<Customer[]> {
    const where: FindOptionsWhere<Customer> = includeInactive
      ? {}
      : { isActive: true };
    return this.customersRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customersRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado.');
    }
    return customer;
  }

  async findByDocument(document: string): Promise<Customer> {
    const customer = await this.customersRepository.findOne({
      where: { document: normalizeDocument(document) },
    });
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado.');
    }
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);

    if (dto.document) {
      const document = normalizeDocument(dto.document);
      if (document !== customer.document) {
        await this.assertDocumentIsFree(document);
        customer.document = document;
        customer.documentType = resolveDocumentType(document);
      }
    }

    if (dto.name !== undefined) customer.name = dto.name;
    if (dto.email !== undefined) customer.email = dto.email;
    if (dto.phone !== undefined) customer.phone = dto.phone;
    if (dto.isActive !== undefined) customer.isActive = dto.isActive;

    return this.customersRepository.save(customer);
  }

  async remove(id: string): Promise<void> {
    const customer = await this.findOne(id);
    customer.isActive = false;
    await this.customersRepository.save(customer);
  }

  private async assertDocumentIsFree(document: string): Promise<void> {
    const existing = await this.customersRepository.findOne({
      where: { document },
    });
    if (existing) {
      throw new ConflictException('Já existe um cliente com este CPF/CNPJ.');
    }
  }
}
