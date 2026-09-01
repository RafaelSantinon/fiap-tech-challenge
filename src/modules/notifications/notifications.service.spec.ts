import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('sendQuote', () => {
    it('should log the order number, the customer and the amount', () => {
      const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();

      service.sendQuote({
        orderNumber: 'OS-000042',
        customerName: 'Maria Silva',
        customerEmail: 'maria@exemplo.com',
        totalAmount: 513.8,
      });

      expect(log).toHaveBeenCalledWith(expect.stringContaining('OS-000042'));
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining('maria@exemplo.com'),
      );
      expect(log).toHaveBeenCalledWith(expect.stringContaining('R$ 513.80'));
    });
  });
});
