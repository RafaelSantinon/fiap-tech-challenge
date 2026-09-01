import { Test, TestingModule } from '@nestjs/testing';
import { QuoteStatus } from '../../common/enums/quote-status.enum';
import { Quote } from './entities/quote.entity';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';

describe('QuotesController', () => {
  let controller: QuotesController;
  let service: { findAll: jest.Mock; findOne: jest.Mock };

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
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Quote;

  beforeEach(async () => {
    service = { findAll: jest.fn(), findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuotesController],
      providers: [{ provide: QuotesService, useValue: service }],
    }).compile();

    controller = module.get<QuotesController>(QuotesController);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('findAll', () => {
    it('should forward the filters to the service', async () => {
      service.findAll.mockResolvedValue([buildQuote()]);

      const result = await controller.findAll(QuoteStatus.PENDING, 'order-1');

      expect(service.findAll).toHaveBeenCalledWith(
        QuoteStatus.PENDING,
        'order-1',
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should detail a quote by id', async () => {
      service.findOne.mockResolvedValue(buildQuote());

      const result = await controller.findOne('quote-1');

      expect(service.findOne).toHaveBeenCalledWith('quote-1');
      expect(result.totalAmount).toBe(513.8);
    });
  });
});
