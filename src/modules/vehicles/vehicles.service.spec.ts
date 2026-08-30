import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VehiclesService } from './vehicles.service';
import { Vehicle } from './entities/vehicle.entity';
import { CustomersService } from '../customers/customers.service';
import { Customer } from '../customers/entities/customer.entity';
import { DocumentType } from '../../common/enums/document-type.enum';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let repo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let customersService: { findOne: jest.Mock };

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

  const buildVehicle = (overrides: Partial<Vehicle> = {}): Vehicle =>
    ({
      id: 'vehicle-1',
      plate: 'ABC1D23',
      brand: 'Volkswagen',
      model: 'Gol',
      year: 2020,
      customerId: 'customer-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Vehicle;

  const createDto = {
    plate: 'abc-1d23',
    brand: 'Volkswagen',
    model: 'Gol',
    year: 2020,
    customerId: 'customer-1',
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 'vehicle-1', ...v })),
    };
    customersService = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: getRepositoryToken(Vehicle), useValue: repo },
        { provide: CustomersService, useValue: customersService },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('create', () => {
    it('should normalize the plate and link it to the customer', async () => {
      customersService.findOne.mockResolvedValue(buildCustomer());
      repo.findOne.mockResolvedValue(null);

      await service.create(createDto);

      expect(customersService.findOne).toHaveBeenCalledWith('customer-1');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ plate: 'ABC1D23', customerId: 'customer-1' }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('should propagate NotFound when the customer does not exist', async () => {
      customersService.findOne.mockRejectedValue(
        new NotFoundException('Cliente não encontrado.'),
      );

      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should reject an inactive customer', async () => {
      customersService.findOne.mockResolvedValue(
        buildCustomer({ isActive: false }),
      );

      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('should reject a duplicated plate', async () => {
      customersService.findOne.mockResolvedValue(buildCustomer());
      repo.findOne.mockResolvedValue(buildVehicle());

      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should list only active vehicles by default', async () => {
      repo.find.mockResolvedValue([]);

      await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter by customer and include inactive vehicles', async () => {
      repo.find.mockResolvedValue([]);

      await service.findAll('customer-1', true);

      expect(repo.find).toHaveBeenCalledWith({
        where: { customerId: 'customer-1' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return the existing vehicle', async () => {
      const vehicle = buildVehicle();
      repo.findOne.mockResolvedValue(vehicle);
      await expect(service.findOne('vehicle-1')).resolves.toBe(vehicle);
    });

    it('should throw NotFound when the vehicle does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findByPlate', () => {
    it('should search by the normalized plate', async () => {
      const vehicle = buildVehicle();
      repo.findOne.mockResolvedValue(vehicle);

      await expect(service.findByPlate('abc-1d23')).resolves.toBe(vehicle);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { plate: 'ABC1D23' },
      });
    });

    it('should throw NotFound when no vehicle has the plate', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findByPlate('ABC1D23')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update the editable fields', async () => {
      repo.findOne.mockResolvedValueOnce(buildVehicle());

      const result = await service.update('vehicle-1', {
        brand: 'Fiat',
        model: 'Uno',
        year: 2015,
        isActive: false,
      });

      expect(result).toMatchObject({
        brand: 'Fiat',
        model: 'Uno',
        year: 2015,
        isActive: false,
      });
    });

    it('should change the plate when it is free', async () => {
      repo.findOne
        .mockResolvedValueOnce(buildVehicle())
        .mockResolvedValueOnce(null);

      const result = await service.update('vehicle-1', { plate: 'xyz-1234' });

      expect(result.plate).toBe('XYZ1234');
    });

    it('should not check uniqueness when the plate did not change', async () => {
      repo.findOne.mockResolvedValueOnce(buildVehicle());

      await service.update('vehicle-1', { plate: 'abc-1d23' });

      expect(repo.findOne).toHaveBeenCalledTimes(1);
    });

    it('should reject changing to a plate already in use', async () => {
      repo.findOne
        .mockResolvedValueOnce(buildVehicle())
        .mockResolvedValueOnce(buildVehicle({ id: 'other' }));

      await expect(
        service.update('vehicle-1', { plate: 'XYZ1234' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should validate the new customer when the owner changes', async () => {
      repo.findOne.mockResolvedValueOnce(buildVehicle());
      customersService.findOne.mockResolvedValue(
        buildCustomer({ id: 'customer-2' }),
      );

      const result = await service.update('vehicle-1', {
        customerId: 'customer-2',
      });

      expect(customersService.findOne).toHaveBeenCalledWith('customer-2');
      expect(result.customerId).toBe('customer-2');
    });

    it('should reject moving the vehicle to an inactive customer', async () => {
      repo.findOne.mockResolvedValueOnce(buildVehicle());
      customersService.findOne.mockResolvedValue(
        buildCustomer({ id: 'customer-2', isActive: false }),
      );

      await expect(
        service.update('vehicle-1', { customerId: 'customer-2' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('should deactivate the vehicle instead of deleting it', async () => {
      repo.findOne.mockResolvedValue(buildVehicle());

      await service.remove('vehicle-1');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'vehicle-1', isActive: false }),
      );
    });
  });
});
