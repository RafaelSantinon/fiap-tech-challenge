import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test as NestTest, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import type { Test as SupertestRequest } from 'supertest';
import { AppModule } from '../../app.module';
import { UsersService } from '../../modules/users/users.service';
import { UserRole } from '../../common/enums/user-role.enum';

export type HttpMethod = 'get' | 'post' | 'patch' | 'delete';

export interface TestApp {
  app: INestApplication;
  dataSource: DataSource;
  asAdmin: (method: HttpMethod, url: string) => SupertestRequest;
  asMechanic: (method: HttpMethod, url: string) => SupertestRequest;
  anonymous: (method: HttpMethod, url: string) => SupertestRequest;
  close: () => Promise<void>;
}

export const ADMIN = {
  name: 'Admin E2E',
  email: 'admin.e2e@oficina.com',
  password: 'AdminE2E@123',
};

export const MECHANIC = {
  name: 'Mecânico E2E',
  email: 'mecanico.e2e@oficina.com',
  password: 'MecE2E@123',
};

const TABLES = [
  'quotes',
  'service_order_supplies',
  'service_order_parts',
  'service_order_services',
  'service_orders',
  'supplies',
  'parts',
  'services',
  'vehicles',
  'customers',
  'users_tokens',
  'users',
];

export function truncateAll(dataSource: DataSource): Promise<unknown> {
  const tables = TABLES.map((table) => `"${table}"`).join(', ');
  return dataSource.query(
    `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`,
  ) as Promise<unknown>;
}

export async function bootstrapTestApp(): Promise<TestApp> {
  const moduleRef: TestingModule = await NestTest.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  const dataSource = app.get(DataSource);
  const usersService = app.get(UsersService);

  await truncateAll(dataSource);
  await usersService.create({ ...ADMIN, role: UserRole.ADMIN });
  await usersService.create({ ...MECHANIC, role: UserRole.MECHANIC });

  const login = async (credentials: {
    email: string;
    password: string;
  }): Promise<string> => {
    const { body } = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);
    return body.accessToken as string;
  };

  const adminToken = await login(ADMIN);
  const mechanicToken = await login(MECHANIC);

  const authorized =
    (token: string) =>
    (method: HttpMethod, url: string): SupertestRequest =>
      request(app.getHttpServer())
        [method](url)
        .set('Authorization', `Bearer ${token}`);

  return {
    app,
    dataSource,
    asAdmin: authorized(adminToken),
    asMechanic: authorized(mechanicToken),
    anonymous: (method: HttpMethod, url: string) =>
      request(app.getHttpServer())[method](url),
    close: async () => {
      if (dataSource?.isInitialized) {
        await truncateAll(dataSource);
      }
      await app?.close();
    },
  };
}
