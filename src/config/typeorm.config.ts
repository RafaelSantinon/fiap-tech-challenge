import { DataSource, DataSourceOptions } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { User } from '../modules/users/entities/user.entity';
import { UserToken } from '../modules/auth/entities/user-token.entity';
import { Customer } from '../modules/customers/entities/customer.entity';
import { Vehicle } from '../modules/vehicles/entities/vehicle.entity';

loadEnv({ path: 'local/.env' });
loadEnv();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'oficina',
  entities: [User, UserToken, Customer, Vehicle],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,
  migrationsRun: false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
