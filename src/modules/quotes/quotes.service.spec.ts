import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { QuoteStatus } from '../../common/enums/quote-status.enum';
import { Quote } from './entities/quote.entity';
import { QuotesService } from './quotes.service';

describe('QuotesService', () => {
  let service: QuotesService;
  let repo: { find: jest.Mock; findOne: jest.Mock };
  let manager: { create: jest.Mock; save: jest.Mock };

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
    repo = { find: jest.fn(), findOne: jest.fn() };
    manager = {
      create: jest.fn((_entity, value) => value),
      save: jest.fn((_entity, value) => Promise.resolve(value)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesService,
        { provide: getRepositoryToken(Quote), useValue: repo },
      ],
    }).compile();

    service = module.get<QuotesService>(QuotesService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('create', () => {
    it('should total the three groups and start as pending', async () => {
      const quote = await service.create(
        {
          serviceOrderId: 'order-1',
          servicesTotal: 260,
          partsTotal: 99.8,
          suppliesTotal: 154,
        },
        manager as unknown as EntityManager,
      );

      expect(quote).toMatchObject({
        serviceOrderId: 'order-1',
        status: QuoteStatus.PENDING,
        totalAmount: 513.8,
        respondedAt: null,
      });
    });

    it('should bind the relation so the driver keeps the foreign key', async () => {
      await service.create(
        {
          serviceOrderId: 'order-1',
          servicesTotal: 1,
          partsTotal: 1,
          suppliesTotal: 1,
        },
        manager as unknown as EntityManager,
      );

      expect(manager.create).toHaveBeenCalledWith(
        Quote,
        expect.objectContaining({
          serviceOrder: { id: 'order-1' },
          serviceOrderId: 'order-1',
        }),
      );
    });

    it('should total zero when every group is empty', async () => {
      const quote = await service.create(
        {
          serviceOrderId: 'order-1',
          servicesTotal: 0,
          partsTotal: 0,
          suppliesTotal: 0,
        },
        manager as unknown as EntityManager,
      );

      expect(quote.totalAmount).toBe(0);
    });
  });

  describe('findAll', () => {
    it('should list every quote when no filter is given', async () => {
      repo.find.mockResolvedValue([buildQuote()]);

      await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
      });
    });

    it('should apply the status and service order filters', async () => {
      repo.find.mockResolvedValue([]);

      await service.findAll(QuoteStatus.PENDING, 'order-1');

      expect(repo.find).toHaveBeenCalledWith({
        where: { status: QuoteStatus.PENDING, serviceOrderId: 'order-1' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return the quote', async () => {
      const existing = buildQuote();
      repo.findOne.mockResolvedValue(existing);

      await expect(service.findOne('quote-1')).resolves.toBe(existing);
    });

    it('should throw when the quote does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('quote-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findByServiceOrder', () => {
    it('should return the quote of the order', async () => {
      const existing = buildQuote();
      repo.findOne.mockResolvedValue(existing);

      await expect(service.findByServiceOrder('order-1')).resolves.toBe(
        existing,
      );
    });

    it('should throw when the order has no quote yet', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.findByServiceOrder('order-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('markApproved', () => {
    it('should approve the quote and stamp the answer', async () => {
      const quote = buildQuote();

      await service.markApproved(quote, manager as unknown as EntityManager);

      expect(quote.status).toBe(QuoteStatus.APPROVED);
      expect(quote.respondedAt).toBeInstanceOf(Date);
      expect(manager.save).toHaveBeenCalledWith(Quote, quote);
    });
  });

  describe('markRejected', () => {
    it('should reject the quote and stamp the answer', async () => {
      const quote = buildQuote();

      await service.markRejected(quote, manager as unknown as EntityManager);

      expect(quote.status).toBe(QuoteStatus.REJECTED);
      expect(quote.respondedAt).toBeInstanceOf(Date);
    });
  });
});
