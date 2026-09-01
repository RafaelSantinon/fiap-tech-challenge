import { Test, TestingModule } from '@nestjs/testing';
import { ServiceOrderStatus } from '../../common/enums/service-order-status.enum';
import { ServiceOrder } from './entities/service-order.entity';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';

describe('ServiceOrdersController', () => {
  let controller: ServiceOrdersController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    changeStatusManually: jest.Mock;
    remove: jest.Mock;
  };

  const buildOrder = (overrides: Partial<ServiceOrder> = {}): ServiceOrder =>
    ({
      id: 'order-1',
      number: 'OS-000001',
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      status: ServiceOrderStatus.RECEIVED,
      description: null,
      statusDurations: { received: 900 },
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
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      changeStatusManually: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceOrdersController],
      providers: [{ provide: ServiceOrdersService, useValue: service }],
    }).compile();

    controller = module.get<ServiceOrdersController>(ServiceOrdersController);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('create', () => {
    it('should open an order and return a DTO with the generated number', async () => {
      service.create.mockResolvedValue(buildOrder());

      const result = await controller.create({
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
      });

      expect(result.number).toBe('OS-000001');
      expect(result.status).toBe(ServiceOrderStatus.RECEIVED);
      expect(result.quote).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should forward every filter to the service', async () => {
      service.findAll.mockResolvedValue([buildOrder()]);

      const result = await controller.findAll(
        ServiceOrderStatus.IN_PROGRESS,
        'customer-1',
        'vehicle-1',
        true,
      );

      expect(service.findAll).toHaveBeenCalledWith(
        ServiceOrderStatus.IN_PROGRESS,
        'customer-1',
        'vehicle-1',
        true,
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should expose the items and the quote of the order', async () => {
      service.findOne.mockResolvedValue(
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

      const result = await controller.findOne('order-1');

      expect(result.services[0]).toMatchObject({
        referenceId: 'service-1',
        name: 'Troca de óleo',
        totalPrice: 260,
      });
    });
  });

  describe('update', () => {
    it('should forward the payload to the service', async () => {
      service.update.mockResolvedValue(
        buildOrder({ description: 'Buchas gastas.' }),
      );

      const result = await controller.update('order-1', {
        description: 'Buchas gastas.',
      });

      expect(service.update).toHaveBeenCalledWith('order-1', {
        description: 'Buchas gastas.',
      });
      expect(result.description).toBe('Buchas gastas.');
    });
  });

  describe('changeStatus', () => {
    it('should forward the requested status to the service', async () => {
      service.changeStatusManually.mockResolvedValue(
        buildOrder({ status: ServiceOrderStatus.IN_DIAGNOSIS }),
      );

      const result = await controller.changeStatus('order-1', {
        status: ServiceOrderStatus.IN_DIAGNOSIS,
      });

      expect(service.changeStatusManually).toHaveBeenCalledWith(
        'order-1',
        ServiceOrderStatus.IN_DIAGNOSIS,
      );
      expect(result.status).toBe(ServiceOrderStatus.IN_DIAGNOSIS);
    });
  });

  describe('remove', () => {
    it('should deactivate the order', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('order-1');

      expect(service.remove).toHaveBeenCalledWith('order-1');
    });
  });
});
