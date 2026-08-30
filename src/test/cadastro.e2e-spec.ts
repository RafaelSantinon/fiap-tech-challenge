import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { UserRole } from '../common/enums/user-role.enum';

describe('Cadastro de clientes e veículos (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let mechanicToken: string;

  const admin = {
    email: 'admin.cadastro@oficina.com',
    password: 'AdminCad@123',
  };
  const mechanic = {
    email: 'mec.cadastro@oficina.com',
    password: 'MecCad@123',
  };

  const truncate = () =>
    dataSource.query(
      'TRUNCATE TABLE "vehicles", "customers", "users_tokens", "users" RESTART IDENTITY CASCADE',
    );

  const login = async (creds: { email: string; password: string }) => {
    const { body } = await request(app.getHttpServer())
      .post('/auth/login')
      .send(creds);
    return body.accessToken as string;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);
    const usersService = app.get(UsersService);

    await truncate();
    await usersService.create({
      name: 'Admin Cadastro',
      email: admin.email,
      password: admin.password,
      role: UserRole.ADMIN,
    });
    await usersService.create({
      name: 'Mecânico Cadastro',
      email: mechanic.email,
      password: mechanic.password,
      role: UserRole.MECHANIC,
    });

    adminToken = await login(admin);
    mechanicToken = await login(mechanic);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await truncate();
    }
    await app?.close();
  });

  const asAdmin = (method: 'get' | 'post' | 'patch' | 'delete', url: string) =>
    request(app.getHttpServer())
      [method](url)
      .set('Authorization', `Bearer ${adminToken}`);

  const customerPayload = {
    name: 'Maria Souza',
    document: '529.982.247-25',
    email: 'maria@email.com',
    phone: '(11) 98888-7777',
  };

  const vehiclePayload = {
    plate: 'abc-1d23',
    brand: 'Volkswagen',
    model: 'Gol',
    year: 2020,
  };

  let customerId: string;
  let vehicleId: string;

  it('should create a customer storing the document without a mask', async () => {
    const res = await asAdmin('post', '/customers')
      .send(customerPayload)
      .expect(201);

    expect(res.body.document).toBe('52998224725');
    expect(res.body.documentType).toBe('cpf');
    expect(res.body.isActive).toBe(true);
    customerId = res.body.id;
  });

  it('should reject a duplicated document (409)', async () => {
    await asAdmin('post', '/customers').send(customerPayload).expect(409);
  });

  it('should reject an invalid CPF (400)', async () => {
    await asAdmin('post', '/customers')
      .send({ ...customerPayload, document: '529.982.247-24' })
      .expect(400);
  });

  it('should identify the customer by document', async () => {
    const res = await asAdmin('get', '/customers/document/52998224725').expect(
      200,
    );
    expect(res.body.id).toBe(customerId);
  });

  it('should create a vehicle normalizing the plate', async () => {
    const res = await asAdmin('post', '/vehicles')
      .send({ ...vehiclePayload, customerId })
      .expect(201);

    expect(res.body.plate).toBe('ABC1D23');
    expect(res.body.customerId).toBe(customerId);
    vehicleId = res.body.id;
  });

  it('should reject an invalid plate (400)', async () => {
    await asAdmin('post', '/vehicles')
      .send({ ...vehiclePayload, plate: 'AB1234', customerId })
      .expect(400);
  });

  it('should reject a duplicated plate (409)', async () => {
    await asAdmin('post', '/vehicles')
      .send({ ...vehiclePayload, customerId })
      .expect(409);
  });

  it('should list the vehicles of the customer', async () => {
    const res = await asAdmin(
      'get',
      `/vehicles?customerId=${customerId}`,
    ).expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(vehicleId);
  });

  it('should deactivate the vehicle and hide it from the default listing', async () => {
    await asAdmin('delete', `/vehicles/${vehicleId}`).expect(204);

    const active = await asAdmin('get', '/vehicles').expect(200);
    expect(active.body).toHaveLength(0);

    const all = await asAdmin('get', '/vehicles?includeInactive=true').expect(
      200,
    );
    expect(all.body[0].isActive).toBe(false);
  });

  it('should deactivate the customer and hide it from the default listing', async () => {
    await asAdmin('delete', `/customers/${customerId}`).expect(204);

    const active = await asAdmin('get', '/customers').expect(200);
    expect(active.body).toHaveLength(0);

    const all = await asAdmin('get', '/customers?includeInactive=true').expect(
      200,
    );
    expect(all.body[0].isActive).toBe(false);
  });

  it('should reject a vehicle for an inactive customer (409)', async () => {
    await asAdmin('post', '/vehicles')
      .send({ ...vehiclePayload, plate: 'XYZ1234', customerId })
      .expect(409);
  });

  it('should block a mechanic on customers and vehicles (403)', async () => {
    await request(app.getHttpServer())
      .get('/customers')
      .set('Authorization', `Bearer ${mechanicToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', `Bearer ${mechanicToken}`)
      .send({ ...vehiclePayload, plate: 'XYZ1234', customerId })
      .expect(403);
  });

  it('should block anonymous access (401)', async () => {
    await request(app.getHttpServer()).get('/customers').expect(401);
  });
});
