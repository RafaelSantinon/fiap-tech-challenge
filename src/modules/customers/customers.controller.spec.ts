import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';
import { DocumentType } from '../../common/enums/document-type.enum';

describe('CustomersController', () => {
  let controller: CustomersController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    findByDocument: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const customer: Customer = {
    id: 'customer-1',
    name: 'Maria Souza',
    document: '52998224725',
    documentType: DocumentType.CPF,
    email: 'maria@email.com',
    phone: null,
    isActive: true,
    vehicles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Customer;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByDocument: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [{ provide: CustomersService, useValue: service }],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
  });

  afterEach(() => jest.restoreAllMocks());

  it('should create a customer and return a DTO', async () => {
    service.create.mockResolvedValue(customer);

    const result = await controller.create({
      name: 'Maria Souza',
      document: '529.982.247-25',
      email: 'maria@email.com',
    });

    expect(result.document).toBe('52998224725');
    expect(result).not.toHaveProperty('vehicles');
  });

  it('should list customers forwarding the includeInactive flag', async () => {
    service.findAll.mockResolvedValue([customer]);

    const result = await controller.findAll(true);

    expect(service.findAll).toHaveBeenCalledWith(true);
    expect(result).toHaveLength(1);
  });

  it('should identify a customer by document', async () => {
    service.findByDocument.mockResolvedValue(customer);

    const result = await controller.findByDocument('529.982.247-25');

    expect(service.findByDocument).toHaveBeenCalledWith('529.982.247-25');
    expect(result.id).toBe('customer-1');
  });

  it('should detail a customer', async () => {
    service.findOne.mockResolvedValue(customer);
    const result = await controller.findOne('customer-1');
    expect(result.email).toBe('maria@email.com');
  });

  it('should update a customer', async () => {
    service.update.mockResolvedValue({ ...customer, name: 'Nova' });

    const result = await controller.update('customer-1', { name: 'Nova' });

    expect(result.name).toBe('Nova');
    expect(service.update).toHaveBeenCalledWith('customer-1', {
      name: 'Nova',
    });
  });

  it('should deactivate a customer', async () => {
    service.remove.mockResolvedValue(undefined);
    await controller.remove('customer-1');
    expect(service.remove).toHaveBeenCalledWith('customer-1');
  });
});
