import { Test, TestingModule } from '@nestjs/testing';
import { ServiceOrderStatus } from '../../common/enums/service-order-status.enum';
import { ServiceOrderMetricsController } from './service-order-metrics.controller';
import { ServiceOrderMetricsService } from './service-order-metrics.service';

describe('ServiceOrderMetricsController', () => {
  let controller: ServiceOrderMetricsController;
  let service: {
    averageTimePerStatus: jest.Mock;
    averageExecutionTimePerService: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      averageTimePerStatus: jest.fn(),
      averageExecutionTimePerService: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceOrderMetricsController],
      providers: [{ provide: ServiceOrderMetricsService, useValue: service }],
    }).compile();

    controller = module.get<ServiceOrderMetricsController>(
      ServiceOrderMetricsController,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  describe('averageTimePerStatus', () => {
    it('should return the average time of each status', async () => {
      service.averageTimePerStatus.mockResolvedValue([
        {
          status: ServiceOrderStatus.RECEIVED,
          averageSeconds: 900,
          orders: 3,
        },
      ]);

      await expect(controller.averageTimePerStatus()).resolves.toEqual([
        {
          status: ServiceOrderStatus.RECEIVED,
          averageSeconds: 900,
          orders: 3,
        },
      ]);
    });
  });

  describe('averageExecutionTimePerService', () => {
    it('should return the average execution time of each service', async () => {
      service.averageExecutionTimePerService.mockResolvedValue([
        {
          serviceId: 'service-1',
          serviceName: 'Troca de óleo',
          averageSeconds: 7200,
          orders: 8,
        },
      ]);

      const result = await controller.averageExecutionTimePerService();

      expect(result[0].serviceName).toBe('Troca de óleo');
    });
  });
});
