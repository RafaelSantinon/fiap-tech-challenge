import { Test, TestingModule } from '@nestjs/testing';
import { ServiceOrderStatus } from '../../common/enums/service-order-status.enum';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { ServiceOrderItemsController } from './service-order-items.controller';
import { ServiceOrderWorkflowService } from './service-order-workflow.service';

describe('ServiceOrderItemsController', () => {
  let controller: ServiceOrderItemsController;
  let service: {
    addService: jest.Mock;
    addPart: jest.Mock;
    addSupply: jest.Mock;
    updateService: jest.Mock;
    updatePart: jest.Mock;
    updateSupply: jest.Mock;
    removeService: jest.Mock;
    removePart: jest.Mock;
    removeSupply: jest.Mock;
  };

  const buildOrder = (overrides: Partial<ServiceOrder> = {}): ServiceOrder =>
    ({
      id: 'order-1',
      number: 'OS-000001',
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      status: ServiceOrderStatus.IN_DIAGNOSIS,
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
    service = {
      addService: jest.fn(),
      addPart: jest.fn(),
      addSupply: jest.fn(),
      updateService: jest.fn(),
      updatePart: jest.fn(),
      updateSupply: jest.fn(),
      removeService: jest.fn(),
      removePart: jest.fn(),
      removeSupply: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceOrderItemsController],
      providers: [{ provide: ServiceOrderWorkflowService, useValue: service }],
    }).compile();

    controller = module.get<ServiceOrderItemsController>(
      ServiceOrderItemsController,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  describe('addService', () => {
    it('should return the order with the new item', async () => {
      service.addService.mockResolvedValue(
        buildOrder({
          services: [
            {
              id: 'item-1',
              serviceId: 'service-1',
              service: { name: 'Troca de óleo' },
              quantity: 2,
              unitPrice: 130,
              totalPrice: 260,
            },
          ],
        } as Partial<ServiceOrder>),
      );

      const result = await controller.addService('order-1', {
        serviceId: 'service-1',
        quantity: 2,
      });

      expect(service.addService).toHaveBeenCalledWith('order-1', {
        serviceId: 'service-1',
        quantity: 2,
      });
      expect(result.services[0].name).toBe('Troca de óleo');
    });
  });

  describe('addPart', () => {
    it('should return the order with the new item', async () => {
      service.addPart.mockResolvedValue(
        buildOrder({
          parts: [
            {
              id: 'item-2',
              partId: 'part-1',
              part: { name: 'Filtro de óleo' },
              quantity: 2,
              unitPrice: 49.9,
              totalPrice: 99.8,
            },
          ],
        } as Partial<ServiceOrder>),
      );

      const result = await controller.addPart('order-1', {
        partId: 'part-1',
        quantity: 2,
      });

      expect(result.parts[0].name).toBe('Filtro de óleo');
    });
  });

  describe('addSupply', () => {
    it('should return the order already moved to awaiting_approval', async () => {
      service.addSupply.mockResolvedValue(
        buildOrder({
          status: ServiceOrderStatus.AWAITING_APPROVAL,
          supplies: [
            {
              id: 'item-3',
              supplyId: 'supply-1',
              supply: { name: 'Óleo 5W30' },
              quantity: 4,
              unitPrice: 38.5,
              totalPrice: 154,
            },
          ],
        } as Partial<ServiceOrder>),
      );

      const result = await controller.addSupply('order-1', {
        supplyId: 'supply-1',
        quantity: 4,
      });

      expect(result.status).toBe(ServiceOrderStatus.AWAITING_APPROVAL);
      expect(result.supplies[0].totalPrice).toBe(154);
    });
  });

  describe('updateService', () => {
    it('should forward the new quantity to the service', async () => {
      service.updateService.mockResolvedValue(buildOrder());

      await controller.updateService('order-1', 'item-1', { quantity: 3 });

      expect(service.updateService).toHaveBeenCalledWith('order-1', 'item-1', {
        quantity: 3,
      });
    });
  });

  describe('updatePart', () => {
    it('should forward the new quantity to the service', async () => {
      service.updatePart.mockResolvedValue(buildOrder());

      await controller.updatePart('order-1', 'item-2', { quantity: 3 });

      expect(service.updatePart).toHaveBeenCalledWith('order-1', 'item-2', {
        quantity: 3,
      });
    });
  });

  describe('updateSupply', () => {
    it('should forward the new quantity to the service', async () => {
      service.updateSupply.mockResolvedValue(buildOrder());

      await controller.updateSupply('order-1', 'item-3', { quantity: 5 });

      expect(service.updateSupply).toHaveBeenCalledWith('order-1', 'item-3', {
        quantity: 5,
      });
    });
  });

  describe('removeService', () => {
    it('should remove the item from the order', async () => {
      service.removeService.mockResolvedValue(undefined);

      await controller.removeService('order-1', 'item-1');

      expect(service.removeService).toHaveBeenCalledWith('order-1', 'item-1');
    });
  });

  describe('removePart', () => {
    it('should remove the item from the order', async () => {
      service.removePart.mockResolvedValue(undefined);

      await controller.removePart('order-1', 'item-2');

      expect(service.removePart).toHaveBeenCalledWith('order-1', 'item-2');
    });
  });

  describe('removeSupply', () => {
    it('should remove the item from the order', async () => {
      service.removeSupply.mockResolvedValue(undefined);

      await controller.removeSupply('order-1', 'item-3');

      expect(service.removeSupply).toHaveBeenCalledWith('order-1', 'item-3');
    });
  });
});
