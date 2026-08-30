import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersModule } from '../customers/customers.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { ServicesModule } from '../services/services.module';
import { PartsModule } from '../parts/parts.module';
import { SuppliesModule } from '../supplies/supplies.module';
import { StockModule } from '../stock/stock.module';
import { ServiceOrder } from './entities/service-order.entity';
import { ServiceOrderService } from './entities/service-order-service.entity';
import { ServiceOrderPart } from './entities/service-order-part.entity';
import { ServiceOrderSupply } from './entities/service-order-supply.entity';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';
import { ServiceOrderItemsService } from './service-order-items.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceOrder,
      ServiceOrderService,
      ServiceOrderPart,
      ServiceOrderSupply,
    ]),
    CustomersModule,
    VehiclesModule,
    ServicesModule,
    PartsModule,
    SuppliesModule,
    StockModule,
  ],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService, ServiceOrderItemsService],
  exports: [ServiceOrdersService, ServiceOrderItemsService],
})
export class ServiceOrdersModule {}
