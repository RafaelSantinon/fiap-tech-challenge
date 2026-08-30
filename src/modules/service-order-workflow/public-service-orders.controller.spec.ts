import { Test, TestingModule } from '@nestjs/testing';
import { QuoteStatus } from '../../common/enums/quote-status.enum';
import { ServiceOrderStatus } from '../../common/enums/service-order-status.enum';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { PublicServiceOrdersController } from './public-service-orders.controller';
import { ServiceOrdersService } from '../service-orders/service-orders.service';
import { ServiceOrderWorkflowService } from './service-order-workflow.service';

describe('PublicServiceOrdersController', () => {
  let controller: PublicServiceOrdersController;
  let serviceOrdersService: { findByNumber: jest.Mock };
  let workflowService: {
    findQuoteByNumber: jest.Mock;
    approve: jest.Mock;
    reject: jest.Mock;
  };

  const buildQuote = (overrides: Partial<Quote> = {}): Quote =>
    ({
      id: 'quote-1',
      serviceOrderId: 'order-1',
      status: QuoteStatus.PENDING,
      servicesTotal: 260,
      partsTotal: 99.8,
      suppliesTotal: 154,
      totalAmount: 513.8,
      sentAt: new Date(),
      respondedAt: null,
      ...overrides,
    }) as Quote;

  const buildOrder = (overrides: Partial<ServiceOrder> = {}): ServiceOrder =>
    ({
      id: 'order-1',
      number: 'OS-000001',
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      vehicle: { plate: 'ABC1D23' },
      customer: { name: 'Maria Silva', email: 'maria@exemplo.com' },
      status: ServiceOrderStatus.AWAITING_APPROVAL,
      description: 'Barulho na suspensão.',
      statusDurations: { received: 900 },
      statusChangedAt: new Date(),
      isActive: true,
      services: [],
      parts: [],
      supplies: [],
      ...overrides,
    }) as ServiceOrder;

  beforeEach(async () => {
    serviceOrdersService = { findByNumber: jest.fn() };
    workflowService = {
      findQuoteByNumber: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicServiceOrdersController],
      providers: [
        { provide: ServiceOrdersService, useValue: serviceOrdersService },
        {
          provide: ServiceOrderWorkflowService,
          useValue: workflowService,
        },
      ],
    }).compile();

    controller = module.get<PublicServiceOrdersController>(
      PublicServiceOrdersController,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  describe('findStatus', () => {
    it('should return only the number and the status of the order', async () => {
      serviceOrdersService.findByNumber.mockResolvedValue(buildOrder());

      const result = await controller.findStatus('OS-000001');

      expect(result).toEqual({
        number: 'OS-000001',
        status: ServiceOrderStatus.AWAITING_APPROVAL,
      });
    });

    it('should not leak the customer, the description or the items', async () => {
      serviceOrdersService.findByNumber.mockResolvedValue(buildOrder());

      const result = await controller.findStatus('OS-000001');

      expect(result).not.toHaveProperty('customerId');
      expect(result).not.toHaveProperty('description');
      expect(result).not.toHaveProperty('services');
    });
  });

  describe('findQuote', () => {
    it('should return the quote with the plate and the totals', async () => {
      workflowService.findQuoteByNumber.mockResolvedValue({
        order: buildOrder(),
        quote: buildQuote(),
      });

      const result = await controller.findQuote('OS-000001');

      expect(result.orderNumber).toBe('OS-000001');
      expect(result.vehiclePlate).toBe('ABC1D23');
      expect(result.totalAmount).toBe(513.8);
    });

    it('should not expose the customer contact', async () => {
      workflowService.findQuoteByNumber.mockResolvedValue({
        order: buildOrder(),
        quote: buildQuote(),
      });

      const result = await controller.findQuote('OS-000001');

      expect(result).not.toHaveProperty('customerEmail');
      expect(result).not.toHaveProperty('customerId');
    });
  });

  describe('approve', () => {
    it('should approve the quote of the given order number', async () => {
      workflowService.approve.mockResolvedValue({
        order: buildOrder({ status: ServiceOrderStatus.IN_PROGRESS }),
        quote: buildQuote({
          status: QuoteStatus.APPROVED,
          respondedAt: new Date(),
        }),
      });

      const result = await controller.approve('OS-000001');

      expect(workflowService.approve).toHaveBeenCalledWith('OS-000001');
      expect(result.status).toBe(QuoteStatus.APPROVED);
    });
  });

  describe('reject', () => {
    it('should reject the quote of the given order number', async () => {
      workflowService.reject.mockResolvedValue({
        order: buildOrder({ status: ServiceOrderStatus.FINISHED }),
        quote: buildQuote({
          status: QuoteStatus.REJECTED,
          respondedAt: new Date(),
        }),
      });

      const result = await controller.reject('OS-000001');

      expect(workflowService.reject).toHaveBeenCalledWith('OS-000001');
      expect(result.status).toBe(QuoteStatus.REJECTED);
    });
  });
});
