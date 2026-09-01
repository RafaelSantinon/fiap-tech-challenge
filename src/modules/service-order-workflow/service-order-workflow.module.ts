import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { QuotesModule } from '../quotes/quotes.module';
import { StockModule } from '../stock/stock.module';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';
import { ServiceOrderItemsController } from './service-order-items.controller';
import { PublicServiceOrdersController } from './public-service-orders.controller';
import { ServiceOrderWorkflowService } from './service-order-workflow.service';

@Module({
  imports: [
    ServiceOrdersModule,
    QuotesModule,
    StockModule,
    NotificationsModule,
  ],
  controllers: [ServiceOrderItemsController, PublicServiceOrdersController],
  providers: [ServiceOrderWorkflowService],
})
export class ServiceOrderWorkflowModule {}
