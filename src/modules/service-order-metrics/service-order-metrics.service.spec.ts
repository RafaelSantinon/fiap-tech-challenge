import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ServiceOrderStatus } from '../../common/enums/service-order-status.enum';
import { ServiceOrderMetricsService } from './service-order-metrics.service';

describe('ServiceOrderMetricsService', () => {
  let service: ServiceOrderMetricsService;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceOrderMetricsService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<ServiceOrderMetricsService>(
      ServiceOrderMetricsService,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  describe('averageTimePerStatus', () => {
    it('should convert the numeric columns of the driver to numbers', async () => {
      dataSource.query.mockResolvedValue([
        {
          status: ServiceOrderStatus.RECEIVED,
          average_seconds: '900.4',
          orders: '3',
        },
      ]);

      await expect(service.averageTimePerStatus()).resolves.toEqual([
        {
          status: ServiceOrderStatus.RECEIVED,
          averageSeconds: 900,
          orders: 3,
        },
      ]);
    });

    it('should read the durations from the jsonb column', async () => {
      dataSource.query.mockResolvedValue([]);

      await service.averageTimePerStatus();

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('jsonb_each_text'),
      );
    });

    it('should return an empty list when there is no order yet', async () => {
      dataSource.query.mockResolvedValue([]);

      await expect(service.averageTimePerStatus()).resolves.toEqual([]);
    });
  });

  describe('averageExecutionTimePerService', () => {
    it('should return the average execution time of each service', async () => {
      dataSource.query.mockResolvedValue([
        {
          service_id: 'service-1',
          service_name: 'Troca de óleo',
          average_seconds: '7200.6',
          orders: '8',
        },
      ]);

      await expect(service.averageExecutionTimePerService()).resolves.toEqual([
        {
          serviceId: 'service-1',
          serviceName: 'Troca de óleo',
          averageSeconds: 7201,
          orders: 8,
        },
      ]);
    });

    it('should only look at orders that already left the in_progress status', async () => {
      dataSource.query.mockResolvedValue([]);

      await service.averageExecutionTimePerService();

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("->> 'in_progress' IS NOT NULL"),
      );
    });
  });
});
