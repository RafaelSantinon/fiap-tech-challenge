import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { QuoteStatus } from '../../common/enums/quote-status.enum';
import { ServiceOrderStatus } from '../../common/enums/service-order-status.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { QuotesService } from '../quotes/quotes.service';
import { Quote } from '../quotes/entities/quote.entity';
import { StockService } from '../stock/stock.service';
import { ServiceOrdersService } from '../service-orders/service-orders.service';
import { ServiceOrderItemsService } from '../service-orders/service-order-items.service';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { ServiceOrderWorkflowService } from './service-order-workflow.service';

describe('ServiceOrderWorkflowService', () => {
  let service: ServiceOrderWorkflowService;
  let serviceOrdersService: {
    findOne: jest.Mock;
    findByNumber: jest.Mock;
    changeStatus: jest.Mock;
  };
  let itemsService: {
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
  let quotesService: {
    create: jest.Mock;
    findByServiceOrder: jest.Mock;
    markApproved: jest.Mock;
    markRejected: jest.Mock;
  };
  let stockService: {
    reserve: jest.Mock;
    release: jest.Mock;
    consume: jest.Mock;
  };
  let notificationsService: { sendQuote: jest.Mock };
  let manager: Record<string, jest.Mock>;
  let dataSource: { transaction: jest.Mock };

  const buildQuote = (overrides: Partial<Quote> = {}): Quote =>
    ({
      id: 'quote-1',
      serviceOrderId: 'order-1',
      status: QuoteStatus.PENDING,
      totalAmount: 513.8,
      respondedAt: null,
      ...overrides,
    }) as Quote;

  const buildOrder = (overrides: Partial<ServiceOrder> = {}): ServiceOrder =>
    ({
      id: 'order-1',
      number: 'OS-000001',
      status: ServiceOrderStatus.AWAITING_APPROVAL,
      customer: { name: 'Maria Silva', email: 'maria@exemplo.com' },
      services: [{ totalPrice: 260 }],
      parts: [{ partId: 'part-1', quantity: 2, totalPrice: 99.8 }],
      supplies: [{ supplyId: 'supply-1', quantity: 4, totalPrice: 154 }],
      quote: buildQuote(),
      ...overrides,
    }) as ServiceOrder;

  const incompleteOrder = () =>
    buildOrder({
      status: ServiceOrderStatus.IN_DIAGNOSIS,
      quote: null,
      supplies: [],
    });

  const completeOrder = () =>
    buildOrder({ status: ServiceOrderStatus.IN_DIAGNOSIS, quote: null });

  beforeEach(async () => {
    manager = {};
    dataSource = {
      transaction: jest.fn((callback: (m: EntityManager) => Promise<unknown>) =>
        callback(manager as unknown as EntityManager),
      ),
    };
    serviceOrdersService = {
      findOne: jest.fn(),
      findByNumber: jest.fn(),
      changeStatus: jest.fn(),
    };
    itemsService = {
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
    quotesService = {
      create: jest.fn(() => Promise.resolve(buildQuote())),
      findByServiceOrder: jest.fn(),
      markApproved: jest.fn(),
      markRejected: jest.fn(),
    };
    stockService = {
      reserve: jest.fn(),
      release: jest.fn(),
      consume: jest.fn(),
    };
    notificationsService = { sendQuote: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceOrderWorkflowService,
        { provide: ServiceOrdersService, useValue: serviceOrdersService },
        { provide: ServiceOrderItemsService, useValue: itemsService },
        { provide: QuotesService, useValue: quotesService },
        { provide: StockService, useValue: stockService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<ServiceOrderWorkflowService>(
      ServiceOrderWorkflowService,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  describe('addService', () => {
    it('should save the item inside the transaction', async () => {
      serviceOrdersService.findOne.mockResolvedValue(incompleteOrder());

      await service.addService('order-1', {
        serviceId: 'service-1',
        quantity: 1,
      });

      expect(itemsService.addService).toHaveBeenCalledWith(
        'order-1',
        { serviceId: 'service-1', quantity: 1 },
        manager,
      );
    });
  });

  describe('addPart', () => {
    it('should save the item inside the transaction', async () => {
      serviceOrdersService.findOne.mockResolvedValue(incompleteOrder());

      await service.addPart('order-1', { partId: 'part-1', quantity: 2 });

      expect(itemsService.addPart).toHaveBeenCalledWith(
        'order-1',
        { partId: 'part-1', quantity: 2 },
        manager,
      );
    });
  });

  describe('addSupply', () => {
    it('should save the item inside the transaction', async () => {
      serviceOrdersService.findOne.mockResolvedValue(incompleteOrder());

      await service.addSupply('order-1', { supplyId: 'supply-1', quantity: 4 });

      expect(itemsService.addSupply).toHaveBeenCalledWith(
        'order-1',
        { supplyId: 'supply-1', quantity: 4 },
        manager,
      );
    });
  });

  describe('generateQuoteIfComplete', () => {
    it('should not generate the quote while a group is still empty', async () => {
      serviceOrdersService.findOne.mockResolvedValue(incompleteOrder());

      await service.addSupply('order-1', { supplyId: 'supply-1', quantity: 1 });

      expect(quotesService.create).not.toHaveBeenCalled();
      expect(stockService.reserve).not.toHaveBeenCalled();
    });

    it('should not generate a second quote for the same order', async () => {
      serviceOrdersService.findOne.mockResolvedValue(
        buildOrder({ status: ServiceOrderStatus.IN_DIAGNOSIS }),
      );

      await service.addSupply('order-1', { supplyId: 'supply-1', quantity: 1 });

      expect(quotesService.create).not.toHaveBeenCalled();
    });

    it('should reserve the stock before creating the quote', async () => {
      serviceOrdersService.findOne.mockResolvedValue(completeOrder());

      await service.addSupply('order-1', { supplyId: 'supply-1', quantity: 4 });

      expect(stockService.reserve).toHaveBeenCalledWith(
        [{ id: 'part-1', quantity: 2 }],
        [{ id: 'supply-1', quantity: 4 }],
        manager,
      );
    });

    it('should total the three groups when creating the quote', async () => {
      serviceOrdersService.findOne.mockResolvedValue(completeOrder());

      await service.addSupply('order-1', { supplyId: 'supply-1', quantity: 4 });

      expect(quotesService.create).toHaveBeenCalledWith(
        {
          serviceOrderId: 'order-1',
          servicesTotal: 260,
          partsTotal: 99.8,
          suppliesTotal: 154,
        },
        manager,
      );
    });

    it('should move the order to awaiting_approval', async () => {
      const order = completeOrder();
      serviceOrdersService.findOne.mockResolvedValue(order);

      await service.addSupply('order-1', { supplyId: 'supply-1', quantity: 4 });

      expect(serviceOrdersService.changeStatus).toHaveBeenCalledWith(
        order,
        ServiceOrderStatus.AWAITING_APPROVAL,
        manager,
      );
    });

    it('should send the quote to the customer', async () => {
      serviceOrdersService.findOne.mockResolvedValue(completeOrder());

      await service.addSupply('order-1', { supplyId: 'supply-1', quantity: 4 });

      expect(notificationsService.sendQuote).toHaveBeenCalledWith({
        orderNumber: 'OS-000001',
        customerName: 'Maria Silva',
        customerEmail: 'maria@exemplo.com',
        totalAmount: 513.8,
      });
    });
  });

  describe('updateService', () => {
    it('should forward to the items service and return the order', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());

      await service.updateService('order-1', 'item-1', { quantity: 2 });

      expect(itemsService.updateService).toHaveBeenCalledWith(
        'order-1',
        'item-1',
        { quantity: 2 },
      );
      expect(serviceOrdersService.findOne).toHaveBeenCalledWith('order-1');
    });
  });

  describe('updatePart', () => {
    it('should forward to the items service', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());

      await service.updatePart('order-1', 'item-2', { quantity: 3 });

      expect(itemsService.updatePart).toHaveBeenCalledWith(
        'order-1',
        'item-2',
        { quantity: 3 },
      );
    });
  });

  describe('updateSupply', () => {
    it('should forward to the items service', async () => {
      serviceOrdersService.findOne.mockResolvedValue(buildOrder());

      await service.updateSupply('order-1', 'item-3', { quantity: 5 });

      expect(itemsService.updateSupply).toHaveBeenCalledWith(
        'order-1',
        'item-3',
        { quantity: 5 },
      );
    });
  });

  describe('removeService', () => {
    it('should forward to the items service', async () => {
      await service.removeService('order-1', 'item-1');

      expect(itemsService.removeService).toHaveBeenCalledWith(
        'order-1',
        'item-1',
      );
    });
  });

  describe('removePart', () => {
    it('should forward to the items service', async () => {
      await service.removePart('order-1', 'item-2');

      expect(itemsService.removePart).toHaveBeenCalledWith('order-1', 'item-2');
    });
  });

  describe('removeSupply', () => {
    it('should forward to the items service', async () => {
      await service.removeSupply('order-1', 'item-3');

      expect(itemsService.removeSupply).toHaveBeenCalledWith(
        'order-1',
        'item-3',
      );
    });
  });

  describe('findQuoteByNumber', () => {
    it('should return the order and its quote', async () => {
      const order = buildOrder();
      const quote = buildQuote();
      serviceOrdersService.findByNumber.mockResolvedValue(order);
      quotesService.findByServiceOrder.mockResolvedValue(quote);

      await expect(service.findQuoteByNumber('OS-000001')).resolves.toEqual({
        order,
        quote,
      });
    });
  });

  describe('approve', () => {
    it('should consume the reserved stock and put the order in progress', async () => {
      const order = buildOrder();
      serviceOrdersService.findByNumber.mockResolvedValue(order);
      quotesService.findByServiceOrder.mockResolvedValue(order.quote);

      await service.approve('OS-000001');

      expect(stockService.consume).toHaveBeenCalledWith(
        [{ id: 'part-1', quantity: 2 }],
        [{ id: 'supply-1', quantity: 4 }],
        manager,
      );
      expect(quotesService.markApproved).toHaveBeenCalledWith(
        order.quote,
        manager,
      );
      expect(serviceOrdersService.changeStatus).toHaveBeenCalledWith(
        order,
        ServiceOrderStatus.IN_PROGRESS,
        manager,
      );
    });

    it('should reject a quote that was already answered', async () => {
      serviceOrdersService.findByNumber.mockResolvedValue(
        buildOrder({ quote: buildQuote({ status: QuoteStatus.APPROVED }) }),
      );

      await expect(service.approve('OS-000001')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('should reject when the order is not awaiting approval', async () => {
      serviceOrdersService.findByNumber.mockResolvedValue(
        buildOrder({ status: ServiceOrderStatus.IN_PROGRESS }),
      );

      await expect(service.approve('OS-000001')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('should reject when the order has no quote', async () => {
      serviceOrdersService.findByNumber.mockResolvedValue(
        buildOrder({ quote: null }),
      );

      await expect(service.approve('OS-000001')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('reject', () => {
    it('should give the reserved stock back and finish the order', async () => {
      const order = buildOrder();
      serviceOrdersService.findByNumber.mockResolvedValue(order);
      quotesService.findByServiceOrder.mockResolvedValue(order.quote);

      await service.reject('OS-000001');

      expect(stockService.release).toHaveBeenCalledWith(
        [{ id: 'part-1', quantity: 2 }],
        [{ id: 'supply-1', quantity: 4 }],
        manager,
      );
      expect(stockService.consume).not.toHaveBeenCalled();
      expect(quotesService.markRejected).toHaveBeenCalledWith(
        order.quote,
        manager,
      );
      expect(serviceOrdersService.changeStatus).toHaveBeenCalledWith(
        order,
        ServiceOrderStatus.FINISHED,
        manager,
      );
    });
  });
});
