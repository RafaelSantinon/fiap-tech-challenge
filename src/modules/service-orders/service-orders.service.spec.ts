import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { ServiceOrderStatus } from '../../common/enums/service-order-status.enum';
import { CustomersService } from '../customers/customers.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { Customer } from '../customers/entities/customer.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { ServiceOrder } from './entities/service-order.entity';
import { ServiceOrdersService } from './service-orders.service';
import { StockService } from '../stock/stock.service';

describe('ServiceOrdersService', () => {
  let service: ServiceOrdersService;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let customersService: { findOne: jest.Mock };
  let vehiclesService: { findOne: jest.Mock };
  let stockService: { release: jest.Mock };
  let manager: {
    save: jest.Mock;
    update: jest.Mock;
    getRepository: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };

  const buildCustomer = (overrides: Partial<Customer> = {}): Customer =>
    ({ id: 'customer-1', isActive: true, ...overrides }) as Customer;

  const buildVehicle = (overrides: Partial<Vehicle> = {}): Vehicle =>
    ({
      id: 'vehicle-1',
      customerId: 'customer-1',
      isActive: true,
      ...overrides,
    }) as Vehicle;

  const buildOrder = (overrides: Partial<ServiceOrder> = {}): ServiceOrder =>
    ({
      id: 'order-1',
      number: 'OS-000001',
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      status: ServiceOrderStatus.RECEIVED,
      description: null,
      statusDurations: {},
      statusChangedAt: new Date(),
      isActive: true,
      services: [],
      parts: [],
      supplies: [],
      quote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as ServiceOrder;

  beforeEach(async () => {
    manager = {
      save: jest.fn((_entity, value) => Promise.resolve(value)),
      update: jest.fn(() => Promise.resolve({ affected: 1 })),
      getRepository: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn((callback: (m: EntityManager) => Promise<unknown>) =>
        callback(manager as unknown as EntityManager),
      ),
    };
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 'order-1', ...v })),
      update: jest.fn(() => Promise.resolve({ affected: 1 })),
    };
    customersService = { findOne: jest.fn() };
    vehiclesService = { findOne: jest.fn() };
    stockService = { release: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceOrdersService,
        { provide: getRepositoryToken(ServiceOrder), useValue: repo },
        { provide: CustomersService, useValue: customersService },
        { provide: VehiclesService, useValue: vehiclesService },
        { provide: StockService, useValue: stockService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<ServiceOrdersService>(ServiceOrdersService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('create', () => {
    it('should open the order in the received status', async () => {
      customersService.findOne.mockResolvedValue(buildCustomer());
      vehiclesService.findOne.mockResolvedValue(buildVehicle());
      repo.findOne.mockResolvedValue(buildOrder());

      await service.create({
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'customer-1',
          vehicleId: 'vehicle-1',
          description: null,
          status: ServiceOrderStatus.RECEIVED,
          statusDurations: {},
        }),
      );
    });

    it('should reject an inactive customer', async () => {
      customersService.findOne.mockResolvedValue(
        buildCustomer({ isActive: false }),
      );

      await expect(
        service.create({ customerId: 'customer-1', vehicleId: 'vehicle-1' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should reject an inactive vehicle', async () => {
      customersService.findOne.mockResolvedValue(buildCustomer());
      vehiclesService.findOne.mockResolvedValue(
        buildVehicle({ isActive: false }),
      );

      await expect(
        service.create({ customerId: 'customer-1', vehicleId: 'vehicle-1' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should reject a vehicle that belongs to another customer', async () => {
      customersService.findOne.mockResolvedValue(buildCustomer());
      vehiclesService.findOne.mockResolvedValue(
        buildVehicle({ customerId: 'customer-2' }),
      );

      await expect(
        service.create({ customerId: 'customer-1', vehicleId: 'vehicle-1' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should list only active orders by default', async () => {
      repo.find.mockResolvedValue([buildOrder()]);

      await service.findAll();

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('should apply the status, customer and vehicle filters', async () => {
      repo.find.mockResolvedValue([]);

      await service.findAll(
        ServiceOrderStatus.IN_PROGRESS,
        'customer-1',
        'vehicle-1',
        true,
      );

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: ServiceOrderStatus.IN_PROGRESS,
            customerId: 'customer-1',
            vehicleId: 'vehicle-1',
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return the order with its items and quote', async () => {
      const existing = buildOrder();
      repo.findOne.mockResolvedValue(existing);

      await expect(service.findOne('order-1')).resolves.toBe(existing);
    });

    it('should throw when the order does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('order-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should use the transaction manager when one is given', async () => {
      const scoped = { findOne: jest.fn().mockResolvedValue(buildOrder()) };
      manager.getRepository.mockReturnValue(scoped);

      await service.findOne('order-1', manager as unknown as EntityManager);

      expect(manager.getRepository).toHaveBeenCalledWith(ServiceOrder);
      expect(scoped.findOne).toHaveBeenCalled();
    });
  });

  describe('findByNumber', () => {
    it('should normalize the number before searching', async () => {
      repo.findOne.mockResolvedValue(buildOrder());

      await service.findByNumber(' os-000001 ');

      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { number: 'OS-000001' } }),
      );
    });

    it('should use the transaction manager when one is given', async () => {
      const scoped = { findOne: jest.fn().mockResolvedValue(buildOrder()) };
      manager.getRepository.mockReturnValue(scoped);

      await service.findByNumber(
        'OS-000001',
        manager as unknown as EntityManager,
      );

      expect(manager.getRepository).toHaveBeenCalledWith(ServiceOrder);
      expect(scoped.findOne).toHaveBeenCalled();
    });

    it('should throw when no order has the number', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findByNumber('OS-000001')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update the description and the active flag', async () => {
      const existing = buildOrder();
      repo.findOne.mockResolvedValue(existing);

      await service.update('order-1', {
        description: 'Buchas gastas.',
        isActive: false,
      });

      expect(repo.update).toHaveBeenCalledWith('order-1', {
        description: 'Buchas gastas.',
        isActive: false,
      });
    });

    it('should keep the current values when nothing is sent', async () => {
      const existing = buildOrder({ description: 'Original.' });
      repo.findOne.mockResolvedValue(existing);

      await service.update('order-1', {});

      expect(repo.update).toHaveBeenCalledWith('order-1', {
        description: 'Original.',
        isActive: true,
      });
    });

    it('should propagate NotFound when the order does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update('order-1', { description: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('changeStatus', () => {
    it('should accumulate the elapsed seconds of the previous status', async () => {
      const startedAt = new Date(Date.now() - 60_000);
      const order = buildOrder({
        status: ServiceOrderStatus.RECEIVED,
        statusChangedAt: startedAt,
        statusDurations: { received: 30 },
      });

      await service.changeStatus(
        order,
        ServiceOrderStatus.IN_DIAGNOSIS,
        manager as unknown as EntityManager,
      );

      expect(order.status).toBe(ServiceOrderStatus.IN_DIAGNOSIS);
      expect(order.statusDurations.received).toBeGreaterThanOrEqual(89);
      expect(order.statusChangedAt.getTime()).toBeGreaterThan(
        startedAt.getTime(),
      );
      expect(manager.update).toHaveBeenCalledWith(
        ServiceOrder,
        'order-1',
        expect.objectContaining({ status: ServiceOrderStatus.IN_DIAGNOSIS }),
      );
    });

    it('should start from an empty map when the order has no durations yet', async () => {
      const order = buildOrder({
        status: ServiceOrderStatus.RECEIVED,
        statusChangedAt: new Date(Date.now() - 5_000),
        statusDurations: undefined,
      });

      await service.changeStatus(
        order,
        ServiceOrderStatus.IN_DIAGNOSIS,
        manager as unknown as EntityManager,
      );

      expect(order.statusDurations.received).toBeGreaterThanOrEqual(4);
    });

    it('should start the counter of a status seen for the first time', async () => {
      const order = buildOrder({
        status: ServiceOrderStatus.IN_PROGRESS,
        statusChangedAt: new Date(Date.now() - 10_000),
        statusDurations: {},
      });

      await service.changeStatus(
        order,
        ServiceOrderStatus.FINISHED,
        manager as unknown as EntityManager,
      );

      expect(order.statusDurations.in_progress).toBeGreaterThanOrEqual(9);
    });
  });

  describe('changeStatusManually', () => {
    it('should move a received order to in_diagnosis', async () => {
      repo.findOne.mockResolvedValue(buildOrder());

      await service.changeStatusManually(
        'order-1',
        ServiceOrderStatus.IN_DIAGNOSIS,
      );

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(manager.update).toHaveBeenCalled();
    });

    it('should reject a transition that only happens automatically', async () => {
      repo.findOne.mockResolvedValue(
        buildOrder({ status: ServiceOrderStatus.IN_DIAGNOSIS }),
      );

      await expect(
        service.changeStatusManually(
          'order-1',
          ServiceOrderStatus.AWAITING_APPROVAL,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject a transition that skips a step', async () => {
      repo.findOne.mockResolvedValue(buildOrder());

      await expect(
        service.changeStatusManually('order-1', ServiceOrderStatus.DELIVERED),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should deactivate the order instead of deleting it', async () => {
      repo.findOne.mockResolvedValue(buildOrder());

      await service.remove('order-1');

      expect(manager.update).toHaveBeenCalledWith(ServiceOrder, 'order-1', {
        isActive: false,
      });
      expect(stockService.release).not.toHaveBeenCalled();
    });

    it('should give the reserved stock back when the quote is still pending', async () => {
      const order = buildOrder({
        status: ServiceOrderStatus.AWAITING_APPROVAL,
        parts: [{ partId: 'part-1', quantity: 2 }],
        supplies: [{ supplyId: 'supply-1', quantity: 4 }],
      } as Partial<ServiceOrder>);
      repo.findOne.mockResolvedValue(order);

      await service.remove('order-1');

      expect(stockService.release).toHaveBeenCalledWith(
        [{ id: 'part-1', quantity: 2 }],
        [{ id: 'supply-1', quantity: 4 }],
        manager,
      );
    });

    it('should throw when the order does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove('order-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
