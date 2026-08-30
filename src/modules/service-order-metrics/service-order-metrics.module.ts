import { Module } from '@nestjs/common';
import { ServiceOrderMetricsController } from './service-order-metrics.controller';
import { ServiceOrderMetricsService } from './service-order-metrics.service';

@Module({
  controllers: [ServiceOrderMetricsController],
  providers: [ServiceOrderMetricsService],
})
export class ServiceOrderMetricsModule {}
