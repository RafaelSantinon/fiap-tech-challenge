import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';
import { DocumentType } from '../../common/enums/document-type.enum';

describe('CustomersService', () => {
  let service: CustomersService;
  let repo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  const buildCustomer = (overrides: Partial<Customer> = {}): Customer =>
    ({
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
      ...overrides,
    }) as Customer;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 'customer-1', ...v })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: getRepositoryToken(Customer), useValue: repo },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('create', () => {
    it('should normalize the document and derive the CPF type', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.create({
        name: 'Maria Souza',
        document: '529.982.247-25',
        email: 'maria@email.com',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          document: '52998224725',
          documentType: DocumentType.CPF,
          phone: null,
        }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('should derive the CNPJ type', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.create({
        name: 'Oficina Ltda',
        document: '11.222.333/0001-81',
        email: 'contato@oficina.com',
        phone: '(11) 3333-4444',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          document: '11222333000181',
          documentType: DocumentType.CNPJ,
          phone: '(11) 3333-4444',
        }),
      );
    });

    it('should reject a duplicated document', async () => {
      repo.findOne.mockResolvedValue(buildCustomer());

      await expect(
        service.create({
          name: 'Outra',
          document: '52998224725',
          email: 'outra@email.com',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should list only active customers by default', async () => {
      repo.find.mockResolvedValue([buildCustomer()]);

      await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
      });
    });

    it('should include inactive customers when asked', async () => {
      repo.find.mockResolvedValue([]);

      await service.findAll(true);

      expect(repo.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return the existing customer', async () => {
      const customer = buildCustomer();
      repo.findOne.mockResolvedValue(customer);
      await expect(service.findOne('customer-1')).resolves.toBe(customer);
    });

    it('should throw NotFound when the customer does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findByDocument', () => {
    it('should search by the normalized document', async () => {
      const customer = buildCustomer();
      repo.findOne.mockResolvedValue(customer);

      await expect(service.findByDocument('529.982.247-25')).resolves.toBe(
        customer,
      );
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { document: '52998224725' },
      });
    });

    it('should throw NotFound when no customer has the document', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.findByDocument('52998224725'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update the editable fields', async () => {
      repo.findOne.mockResolvedValueOnce(buildCustomer());

      const result = await service.update('customer-1', {
        name: 'Maria S. Souza',
        email: 'nova@email.com',
        phone: '(11) 90000-0000',
        isActive: false,
      });

      expect(result).toMatchObject({
        name: 'Maria S. Souza',
        email: 'nova@email.com',
        phone: '(11) 90000-0000',
        isActive: false,
      });
    });

    it('should change the document and its type when it is free', async () => {
      repo.findOne
        .mockResolvedValueOnce(buildCustomer())
        .mockResolvedValueOnce(null);

      const result = await service.update('customer-1', {
        document: '11.222.333/0001-81',
      });

      expect(result.document).toBe('11222333000181');
      expect(result.documentType).toBe(DocumentType.CNPJ);
    });

    it('should not check uniqueness when the document did not change', async () => {
      repo.findOne.mockResolvedValueOnce(buildCustomer());

      await service.update('customer-1', { document: '529.982.247-25' });

      expect(repo.findOne).toHaveBeenCalledTimes(1);
    });

    it('should reject changing to a document already in use', async () => {
      repo.findOne
        .mockResolvedValueOnce(buildCustomer())
        .mockResolvedValueOnce(buildCustomer({ id: 'other' }));

      await expect(
        service.update('customer-1', { document: '11222333000181' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('should deactivate the customer instead of deleting it', async () => {
      const customer = buildCustomer();
      repo.findOne.mockResolvedValue(customer);

      await service.remove('customer-1');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'customer-1', isActive: false }),
      );
    });
  });
});
