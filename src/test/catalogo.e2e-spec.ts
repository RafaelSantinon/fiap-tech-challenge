import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { UserRole } from '../common/enums/user-role.enum';
import { MeasurementUnit } from '../common/enums/measurement-unit.enum';

describe('Catálogo de serviços, peças e insumos (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let mechanicToken: string;

  const admin = {
    email: 'admin.catalogo@oficina.com',
    password: 'AdminCat@123',
  };
  const mechanic = {
    email: 'mec.catalogo@oficina.com',
    password: 'MecCat@123',
  };

  const truncate = () =>
    dataSource.query(
      'TRUNCATE TABLE "supplies", "parts", "services", "users_tokens", "users" RESTART IDENTITY CASCADE',
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
      name: 'Admin Catálogo',
      email: admin.email,
      password: admin.password,
      role: UserRole.ADMIN,
    });
    await usersService.create({
      name: 'Mecânico Catálogo',
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

  const servicePayload = {
    name: 'Troca de óleo',
    description: 'Substituição do óleo do motor e do filtro.',
    price: 189.9,
    estimatedMinutes: 60,
  };

  const partPayload = {
    code: 'flt oil-001',
    name: 'Filtro de óleo',
    brand: 'Bosch',
    unitPrice: 49.9,
    stockQuantity: 10,
    minimumStock: 2,
  };

  const supplyPayload = {
    code: 'oleo 5w30',
    name: 'Óleo sintético 5W30',
    unit: MeasurementUnit.L,
    unitPrice: 38.5,
    stockQuantity: 40,
    minimumStock: 10,
  };

  describe('services', () => {
    let serviceId: string;

    it('should create a service (201) returning the price as a number', async () => {
      const { body } = await asAdmin('post', '/services')
        .send(servicePayload)
        .expect(201);

      serviceId = body.id;
      expect(body.price).toBe(189.9);
      expect(body.estimatedMinutes).toBe(60);
      expect(body.isActive).toBe(true);
    });

    it('should reject a duplicated name (409)', async () => {
      await asAdmin('post', '/services').send(servicePayload).expect(409);
    });

    it('should reject a negative price (400)', async () => {
      await asAdmin('post', '/services')
        .send({ ...servicePayload, name: 'Alinhamento', price: -1 })
        .expect(400);
    });

    it('should reject an estimated time below one minute (400)', async () => {
      await asAdmin('post', '/services')
        .send({
          ...servicePayload,
          name: 'Balanceamento',
          estimatedMinutes: 0,
        })
        .expect(400);
    });

    it('should hide the service from the default listing after the soft delete', async () => {
      await asAdmin('delete', `/services/${serviceId}`).expect(204);

      const { body: active } = await asAdmin('get', '/services').expect(200);
      expect(active).toHaveLength(0);

      const { body: all } = await asAdmin(
        'get',
        '/services?includeInactive=true',
      ).expect(200);
      expect(all).toHaveLength(1);
      expect(all[0].isActive).toBe(false);
    });

    it('should reactivate the service through a patch', async () => {
      const { body } = await asAdmin('patch', `/services/${serviceId}`)
        .send({ isActive: true })
        .expect(200);

      expect(body.isActive).toBe(true);
    });
  });

  describe('parts', () => {
    let partId: string;

    it('should create a part (201) with a normalized code', async () => {
      const { body } = await asAdmin('post', '/parts')
        .send(partPayload)
        .expect(201);

      partId = body.id;
      expect(body.code).toBe('FLTOIL-001');
      expect(body.unitPrice).toBe(49.9);
      expect(body.stockQuantity).toBe(10);
    });

    it('should reject a duplicated code (409)', async () => {
      await asAdmin('post', '/parts')
        .send({ ...partPayload, code: 'FLTOIL-001' })
        .expect(409);
    });

    it('should reject a negative stock quantity (400)', async () => {
      await asAdmin('post', '/parts')
        .send({ ...partPayload, code: 'PSTFRE-002', stockQuantity: -5 })
        .expect(400);
    });

    it('should reject a field outside the DTO (400)', async () => {
      await asAdmin('post', '/parts')
        .send({ ...partPayload, code: 'PSTFRE-003', supplier: 'Autopeças' })
        .expect(400);
    });

    it('should find the part by code regardless of the formatting', async () => {
      const { body } = await asAdmin('get', '/parts/code/fltoil-001').expect(
        200,
      );

      expect(body.id).toBe(partId);
    });

    it('should answer 404 for an unknown code', async () => {
      await asAdmin('get', '/parts/code/UNKNOWN-999').expect(404);
    });

    it('should update the stock quantity', async () => {
      const { body } = await asAdmin('patch', `/parts/${partId}`)
        .send({ stockQuantity: 25 })
        .expect(200);

      expect(body.stockQuantity).toBe(25);
    });

    it('should hide the part from the default listing after the soft delete', async () => {
      await asAdmin('delete', `/parts/${partId}`).expect(204);

      const { body: active } = await asAdmin('get', '/parts').expect(200);
      expect(active).toHaveLength(0);

      const { body: all } = await asAdmin(
        'get',
        '/parts?includeInactive=true',
      ).expect(200);
      expect(all).toHaveLength(1);
    });
  });

  describe('supplies', () => {
    let supplyId: string;

    it('should create a supply (201) with a normalized code', async () => {
      const { body } = await asAdmin('post', '/supplies')
        .send(supplyPayload)
        .expect(201);

      supplyId = body.id;
      expect(body.code).toBe('OLEO5W30');
      expect(body.unit).toBe(MeasurementUnit.L);
      expect(body.unitPrice).toBe(38.5);
    });

    it('should reject a duplicated code (409)', async () => {
      await asAdmin('post', '/supplies').send(supplyPayload).expect(409);
    });

    it('should reject an invalid measurement unit (400)', async () => {
      await asAdmin('post', '/supplies')
        .send({ ...supplyPayload, code: 'GRAXA-001', unit: 'litro' })
        .expect(400);
    });

    it('should find the supply by code regardless of the formatting', async () => {
      const { body } = await asAdmin('get', '/supplies/code/oleo5w30').expect(
        200,
      );

      expect(body.id).toBe(supplyId);
    });

    it('should hide the supply from the default listing after the soft delete', async () => {
      await asAdmin('delete', `/supplies/${supplyId}`).expect(204);

      const { body: active } = await asAdmin('get', '/supplies').expect(200);
      expect(active).toHaveLength(0);

      const { body: all } = await asAdmin(
        'get',
        '/supplies?includeInactive=true',
      ).expect(200);
      expect(all).toHaveLength(1);
    });
  });

  describe('access control', () => {
    it.each(['/services', '/parts', '/supplies'])(
      'should block an anonymous request to %s (401)',
      async (url) => {
        await request(app.getHttpServer()).get(url).expect(401);
      },
    );

    it.each(['/services', '/parts', '/supplies'])(
      'should block a mechanic on %s (403)',
      async (url) => {
        await request(app.getHttpServer())
          .get(url)
          .set('Authorization', `Bearer ${mechanicToken}`)
          .expect(403);
      },
    );
  });
});
