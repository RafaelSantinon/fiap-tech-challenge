import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { User } from './modules/users/entities/user.entity';
import { UserToken } from './modules/auth/entities/user-token.entity';
import { Customer } from './modules/customers/entities/customer.entity';
import { Vehicle } from './modules/vehicles/entities/vehicle.entity';
import { Service } from './modules/services/entities/service.entity';
import { Part } from './modules/parts/entities/part.entity';
import { Supply } from './modules/supplies/entities/supply.entity';
import { ServiceOrder } from './modules/service-orders/entities/service-order.entity';
import { ServiceOrderService } from './modules/service-orders/entities/service-order-service.entity';
import { ServiceOrderPart } from './modules/service-orders/entities/service-order-part.entity';
import { ServiceOrderSupply } from './modules/service-orders/entities/service-order-supply.entity';
import { Quote } from './modules/quotes/entities/quote.entity';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { ServicesModule } from './modules/services/services.module';
import { PartsModule } from './modules/parts/parts.module';
import { SuppliesModule } from './modules/supplies/supplies.module';
import { StockModule } from './modules/stock/stock.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { ServiceOrdersModule } from './modules/service-orders/service-orders.module';
import { ServiceOrderWorkflowModule } from './modules/service-order-workflow/service-order-workflow.module';
import { ServiceOrderMetricsModule } from './modules/service-order-metrics/service-order-metrics.module';
import { HealthController } from './health/health.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['local/.env', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        entities: [
          User,
          UserToken,
          Customer,
          Vehicle,
          Service,
          Part,
          Supply,
          ServiceOrder,
          ServiceOrderService,
          ServiceOrderPart,
          ServiceOrderSupply,
          Quote,
        ],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        migrationsRun: true,
        synchronize: false,
      }),
    }),
    UsersModule,
    AuthModule,
    CustomersModule,
    VehiclesModule,
    ServicesModule,
    PartsModule,
    SuppliesModule,
    StockModule,
    QuotesModule,
    ServiceOrdersModule,
    ServiceOrderWorkflowModule,
    ServiceOrderMetricsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
