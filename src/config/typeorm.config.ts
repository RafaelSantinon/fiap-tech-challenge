import { DataSource, DataSourceOptions } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { User } from '../modules/users/entities/user.entity';
import { UserToken } from '../modules/auth/entities/user-token.entity';
import { Customer } from '../modules/customers/entities/customer.entity';
import { Vehicle } from '../modules/vehicles/entities/vehicle.entity';
import { Service } from '../modules/services/entities/service.entity';
import { Part } from '../modules/parts/entities/part.entity';
import { Supply } from '../modules/supplies/entities/supply.entity';
import { ServiceOrder } from '../modules/service-orders/entities/service-order.entity';
import { ServiceOrderService } from '../modules/service-orders/entities/service-order-service.entity';
import { ServiceOrderPart } from '../modules/service-orders/entities/service-order-part.entity';
import { ServiceOrderSupply } from '../modules/service-orders/entities/service-order-supply.entity';
import { Quote } from '../modules/quotes/entities/quote.entity';

loadEnv({ path: 'local/.env' });
loadEnv();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number.parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'mechanic_workshop',
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
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,
  migrationsRun: false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
