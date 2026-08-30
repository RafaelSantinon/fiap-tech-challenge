import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ServiceOrderStatus } from '../../common/enums/service-order-status.enum';
import { ServicesService } from '../services/services.service';
import { PartsService } from '../parts/parts.service';
import { SuppliesService } from '../supplies/supplies.service';
import { Service } from '../services/entities/service.entity';
import { Part } from '../parts/entities/part.entity';
import { Supply } from '../supplies/entities/supply.entity';
import { ServiceOrder } from './entities/service-order.entity';
import { ServiceOrderService } from './entities/service-order-service.entity';
import { ServiceOrderPart } from './entities/service-order-part.entity';
import { ServiceOrderSupply } from './entities/service-order-supply.entity';
import { ServiceOrderItemsService } from './service-order-items.service';
import { ServiceOrdersService } from './service-orders.service';

describe('ServiceOrderItemsService', () => {
  let service: ServiceOrderItemsService;
  let orderServicesRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let orderPartsRepo: typeof orderServicesRepo;
  let orderSuppliesRepo: typeof orderServicesRepo;
  let servicesService: { findOne: jest.Mock };
  let partsService: { assertAvailable: jest.Mock };
  let suppliesService: { assertAvailable: jest.Mock };
  let serviceOrdersService: { findOne: jest.Mock };

  const buildOrder = (overrides: Partial<ServiceOrder> = {}): ServiceOrder =>
    ({
      id: 'order-1',
      status: ServiceOrderStatus.IN_DIAGNOSIS,
      isActive: true,
      services: [],
      parts: [],
      supplies: [],
      quote: null,
      ...overrides,
    }) as ServiceOrder;

  const buildCatalogService = (overrides: Partial<Service> = {}): Service =>
    ({ id: 'service-1', price: 130, isActive: true, ...overrides }) as Service;

  const buildPart = (overrides: Partial<Part> = {}): Part =>
    ({ id: 'part-1', unitPrice: 49.9, isActive: true, ...overrides }) as Part;

  const buildSupply = (overrides: Partial<Supply> = {}): Supply =>
    ({
      id: 'supply-1',
      unitPrice: 38.5,
      isActive: true,
      ...overrides,
    }) as Supply;

  const buildRepo = () => ({
    findOne: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn((v) => Promise.resolve(v)),
    remove: jest.fn(),
  });

  beforeEach(async () => {
    orderServicesRepo = buildRepo();
    orderPartsRepo = buildRepo();
    orderSuppliesRepo = buildRepo();
    servicesService = { findOne: jest.fn() };
    partsService = { assertAvailable: jest.fn() };
    suppliesService = { assertAvailable: jest.fn() };
    serviceOrdersService = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceOrderItemsService,
        {
          provide: getRepositoryToken(ServiceOrderService),
          useValue: orderServicesRepo,
        },
        {
          provide: getRepositoryToken(ServiceOrderPart),
          useValue: orderPartsRepo,
        },
        {
          provide: getRepositoryToken(ServiceOrderSupply),
          useValue: orderSuppliesRepo,
        },
        { provide: ServicesService, useValue: servicesService },
        { provide: PartsService, useValue: partsService },
        { provide: SuppliesService, useValue: suppliesService },
        { provide: ServiceOrdersService, useValue: serviceOrdersService },
      ],
    }).compile();

    service = module.get<ServiceOrderItemsService>(ServiceOrderItemsService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('addService', () => {
    it('should snapshot the catalog price and total the item', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      servicesService.findOne.mockResolvedValue(buildCatalogService());
      orderServicesRepo.findOne.mockResolvedValue(null);

      const item = await service.addService('order-1', {
        serviceId: 'service-1',
        quantity: 2,
      });

      expect(item).toMatchObject({
        unitPrice: 130,
        totalPrice: 260,
        quantity: 2,
      });
    });

    it('should use the transaction manager when one is given', async () => {
      const scoped = buildRepo();
      const manager = { getRepository: jest.fn().mockReturnValue(scoped) };
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      servicesService.findOne.mockResolvedValue(buildCatalogService());
      orderServicesRepo.findOne.mockResolvedValue(null);

      await service.addService(
        'order-1',
        { serviceId: 'service-1', quantity: 1 },
        manager as never,
      );

      expect(manager.getRepository).toHaveBeenCalledWith(ServiceOrderService);
      expect(scoped.save).toHaveBeenCalled();
      expect(orderServicesRepo.save).not.toHaveBeenCalled();
    });

    it('should reject an inactive service', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      servicesService.findOne.mockResolvedValue(
        buildCatalogService({ isActive: false }),
      );

      await expect(
        service.addService('order-1', { serviceId: 'service-1', quantity: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should reject a service that is already in the order', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      servicesService.findOne.mockResolvedValue(buildCatalogService());
      orderServicesRepo.findOne.mockResolvedValue({ id: 'item-1' });

      await expect(
        service.addService('order-1', { serviceId: 'service-1', quantity: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should reject an order that already went past the diagnosis', async () => {
      serviceOrdersService.findOne.mockResolvedValue(
        buildOrder({ status: ServiceOrderStatus.AWAITING_APPROVAL }),
      );

      await expect(
        service.addService('order-1', { serviceId: 'service-1', quantity: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should reject an inactive order', async () => {
      serviceOrdersService.findOne.mockResolvedValue(
        buildOrder({ isActive: false }),
      );

      await expect(
        service.addService('order-1', { serviceId: 'service-1', quantity: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('addPart', () => {
    it('should check the free stock before adding the item', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      partsService.assertAvailable.mockResolvedValue(buildPart());
      orderPartsRepo.findOne.mockResolvedValue(null);

      const item = await service.addPart('order-1', {
        partId: 'part-1',
        quantity: 2,
      });

      expect(partsService.assertAvailable).toHaveBeenCalledWith('part-1', 2);
      expect(item).toMatchObject({ unitPrice: 49.9, totalPrice: 99.8 });
    });

    it('should reject a part that is already in the order', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      partsService.assertAvailable.mockResolvedValue(buildPart());
      orderPartsRepo.findOne.mockResolvedValue({ id: 'item-1' });

      await expect(
        service.addPart('order-1', { partId: 'part-1', quantity: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should reject an inactive part', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      partsService.assertAvailable.mockResolvedValue(
        buildPart({ isActive: false }),
      );

      await expect(
        service.addPart('order-1', { partId: 'part-1', quantity: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('addSupply', () => {
    it('should check the free stock before adding the item', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      suppliesService.assertAvailable.mockResolvedValue(buildSupply());
      orderSuppliesRepo.findOne.mockResolvedValue(null);

      const item = await service.addSupply('order-1', {
        supplyId: 'supply-1',
        quantity: 4,
      });

      expect(suppliesService.assertAvailable).toHaveBeenCalledWith(
        'supply-1',
        4,
      );
      expect(item).toMatchObject({ unitPrice: 38.5, totalPrice: 154 });
    });

    it('should reject a supply that is already in the order', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      suppliesService.assertAvailable.mockResolvedValue(buildSupply());
      orderSuppliesRepo.findOne.mockResolvedValue({ id: 'item-1' });

      await expect(
        service.addSupply('order-1', { supplyId: 'supply-1', quantity: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should reject an inactive supply', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      suppliesService.assertAvailable.mockResolvedValue(
        buildSupply({ isActive: false }),
      );

      await expect(
        service.addSupply('order-1', { supplyId: 'supply-1', quantity: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('updateService', () => {
    it('should recalculate the total with the snapshot price', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      orderServicesRepo.findOne.mockResolvedValue({
        id: 'item-1',
        serviceId: 'service-1',
        quantity: 1,
        unitPrice: 130,
        totalPrice: 130,
      });

      const item = await service.updateService('order-1', 'item-1', {
        quantity: 2,
      });

      expect(item).toMatchObject({ quantity: 2, totalPrice: 260 });
    });

    it('should throw when the item is not in the order', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      orderServicesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateService('order-1', 'item-1', { quantity: 2 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updatePart', () => {
    it('should check the free stock for the new quantity', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      orderPartsRepo.findOne.mockResolvedValue({
        id: 'item-1',
        partId: 'part-1',
        quantity: 2,
        unitPrice: 49.9,
        totalPrice: 99.8,
      });

      const item = await service.updatePart('order-1', 'item-1', {
        quantity: 3,
      });

      expect(partsService.assertAvailable).toHaveBeenCalledWith('part-1', 3);
      expect(item).toMatchObject({ quantity: 3, totalPrice: 149.7 });
    });

    it('should throw when the item is not in the order', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      orderPartsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updatePart('order-1', 'item-1', { quantity: 3 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateSupply', () => {
    it('should check the free stock for the new quantity', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      orderSuppliesRepo.findOne.mockResolvedValue({
        id: 'item-1',
        supplyId: 'supply-1',
        quantity: 2,
        unitPrice: 38.5,
        totalPrice: 77,
      });

      const item = await service.updateSupply('order-1', 'item-1', {
        quantity: 4,
      });

      expect(suppliesService.assertAvailable).toHaveBeenCalledWith(
        'supply-1',
        4,
      );
      expect(item).toMatchObject({ quantity: 4, totalPrice: 154 });
    });

    it('should throw when the item is not in the order', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      orderSuppliesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateSupply('order-1', 'item-1', { quantity: 4 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('removeService', () => {
    it('should remove the item from the order', async () => {
      const item = { id: 'item-1' };
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      orderServicesRepo.findOne.mockResolvedValue(item);

      await service.removeService('order-1', 'item-1');

      expect(orderServicesRepo.remove).toHaveBeenCalledWith(item);
    });

    it('should throw when the item is not in the order', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      orderServicesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removeService('order-1', 'item-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('removePart', () => {
    it('should remove the item from the order', async () => {
      const item = { id: 'item-1' };
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      orderPartsRepo.findOne.mockResolvedValue(item);

      await service.removePart('order-1', 'item-1');

      expect(orderPartsRepo.remove).toHaveBeenCalledWith(item);
    });

    it('should throw when the item is not in the order', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      orderPartsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removePart('order-1', 'item-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('removeSupply', () => {
    it('should remove the item from the order', async () => {
      const item = { id: 'item-1' };
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      orderSuppliesRepo.findOne.mockResolvedValue(item);

      await service.removeSupply('order-1', 'item-1');

      expect(orderSuppliesRepo.remove).toHaveBeenCalledWith(item);
    });

    it('should throw when the item is not in the order', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());
      orderSuppliesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removeSupply('order-1', 'item-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
