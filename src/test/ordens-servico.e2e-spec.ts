import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { UserRole } from '../common/enums/user-role.enum';
import { MeasurementUnit } from '../common/enums/measurement-unit.enum';
import { ServiceOrderStatus } from '../common/enums/service-order-status.enum';
import { QuoteStatus } from '../common/enums/quote-status.enum';

describe('Ordens de serviço e orçamento (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let mechanicToken: string;

  let customerId: string;
  let vehicleId: string;
  let serviceId: string;
  let partId: string;
  let supplyId: string;

  const admin = { email: 'admin.os@oficina.com', password: 'AdminOs@123' };
  const mechanic = { email: 'mec.os@oficina.com', password: 'MecOs@123' };

  const truncate = () =>
    dataSource.query(
      'TRUNCATE TABLE "quotes", "service_order_supplies", "service_order_parts", ' +
        '"service_order_services", "service_orders", "supplies", "parts", "services", ' +
        '"vehicles", "customers", "users_tokens", "users" RESTART IDENTITY CASCADE',
    );

  const login = async (creds: { email: string; password: string }) => {
    const { body } = await request(app.getHttpServer())
      .post('/auth/login')
      .send(creds);
    return body.accessToken as string;
  };

  const asAdmin = (method: 'get' | 'post' | 'patch' | 'delete', url: string) =>
    request(app.getHttpServer())
      [method](url)
      .set('Authorization', `Bearer ${adminToken}`);

  const asMechanic = (
    method: 'get' | 'post' | 'patch' | 'delete',
    url: string,
  ) =>
    request(app.getHttpServer())
      [method](url)
      .set('Authorization', `Bearer ${mechanicToken}`);

  const anonymous = (method: 'get' | 'post', url: string) =>
    request(app.getHttpServer())[method](url);

  const openOrder = async () => {
    const { body } = await asMechanic('post', '/service-orders')
      .send({ customerId, vehicleId })
      .expect(201);
    await asMechanic('patch', `/service-orders/${body.id}/status`)
      .send({ status: ServiceOrderStatus.IN_DIAGNOSIS })
      .expect(200);
    return body.id as string;
  };

  const fillOrder = async (
    orderId: string,
    quantities = { part: 2, supply: 4 },
  ) => {
    await asMechanic('post', `/service-orders/${orderId}/services`)
      .send({ serviceId, quantity: 2 })
      .expect(201);
    await asMechanic('post', `/service-orders/${orderId}/parts`)
      .send({ partId, quantity: quantities.part })
      .expect(201);
    const { body } = await asMechanic(
      'post',
      `/service-orders/${orderId}/supplies`,
    )
      .send({ supplyId, quantity: quantities.supply })
      .expect(201);
    return body;
  };

  const readPart = async () => {
    const { body } = await asAdmin('get', `/parts/${partId}`).expect(200);
    return body;
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
      name: 'Admin OS',
      email: admin.email,
      password: admin.password,
      role: UserRole.ADMIN,
    });
    await usersService.create({
      name: 'Mecânico OS',
      email: mechanic.email,
      password: mechanic.password,
      role: UserRole.MECHANIC,
    });

    adminToken = await login(admin);
    mechanicToken = await login(mechanic);

    const customer = await asAdmin('post', '/customers')
      .send({
        name: 'Maria Silva',
        document: '52998224725',
        email: 'maria@exemplo.com',
      })
      .expect(201);
    customerId = customer.body.id;

    const vehicle = await asAdmin('post', '/vehicles')
      .send({
        plate: 'ABC1D23',
        brand: 'Fiat',
        model: 'Argo',
        year: 2020,
        customerId,
      })
      .expect(201);
    vehicleId = vehicle.body.id;

    const service = await asAdmin('post', '/services')
      .send({ name: 'Troca de óleo', price: 130, estimatedMinutes: 60 })
      .expect(201);
    serviceId = service.body.id;

    const part = await asAdmin('post', '/parts')
      .send({
        code: 'FLTOIL-001',
        name: 'Filtro de óleo',
        unitPrice: 49.9,
        stockQuantity: 10,
      })
      .expect(201);
    partId = part.body.id;

    const supply = await asAdmin('post', '/supplies')
      .send({
        code: 'OLEO-5W30',
        name: 'Óleo 5W30',
        unit: MeasurementUnit.L,
        unitPrice: 38.5,
        stockQuantity: 40,
      })
      .expect(201);
    supplyId = supply.body.id;
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await truncate();
    }
    await app?.close();
  });

  describe('abertura e diagnóstico', () => {
    let orderId: string;

    it('should open the order in the received status with a generated number', async () => {
      const { body } = await asMechanic('post', '/service-orders')
        .send({ customerId, vehicleId, description: 'Barulho na suspensão.' })
        .expect(201);

      orderId = body.id;
      expect(body.number).toMatch(/^OS-\d{6}$/);
      expect(body.status).toBe(ServiceOrderStatus.RECEIVED);
      expect(body.quote).toBeNull();
    });

    it('should reject a vehicle that belongs to another customer (409)', async () => {
      const other = await asAdmin('post', '/customers')
        .send({
          name: 'João Souza',
          document: '11144477735',
          email: 'joao@exemplo.com',
        })
        .expect(201);

      await asMechanic('post', '/service-orders')
        .send({ customerId: other.body.id, vehicleId })
        .expect(409);
    });

    it('should move the order to in_diagnosis', async () => {
      const { body } = await asMechanic(
        'patch',
        `/service-orders/${orderId}/status`,
      )
        .send({ status: ServiceOrderStatus.IN_DIAGNOSIS })
        .expect(200);

      expect(body.status).toBe(ServiceOrderStatus.IN_DIAGNOSIS);
      expect(body.statusDurations).toHaveProperty(ServiceOrderStatus.RECEIVED);
    });

    it('should reject a status that only changes automatically (400)', async () => {
      await asMechanic('patch', `/service-orders/${orderId}/status`)
        .send({ status: ServiceOrderStatus.AWAITING_APPROVAL })
        .expect(400);
    });
  });

  describe('itens e geração automática do orçamento', () => {
    let orderId: string;

    beforeAll(async () => {
      orderId = await openOrder();
    });

    it('should not generate the quote while a group is still empty', async () => {
      await asMechanic('post', `/service-orders/${orderId}/services`)
        .send({ serviceId, quantity: 2 })
        .expect(201);

      const { body } = await asMechanic(
        'post',
        `/service-orders/${orderId}/parts`,
      )
        .send({ partId, quantity: 2 })
        .expect(201);

      expect(body.status).toBe(ServiceOrderStatus.IN_DIAGNOSIS);
      expect(body.quote).toBeNull();
    });

    it('should reject the same part twice (409)', async () => {
      await asMechanic('post', `/service-orders/${orderId}/parts`)
        .send({ partId, quantity: 1 })
        .expect(409);
    });

    it('should reject a quantity above the free stock (409)', async () => {
      await asMechanic('post', `/service-orders/${orderId}/supplies`)
        .send({ supplyId, quantity: 999 })
        .expect(409);
    });

    it('should generate the quote when the third group is filled', async () => {
      const { body } = await asMechanic(
        'post',
        `/service-orders/${orderId}/supplies`,
      )
        .send({ supplyId, quantity: 4 })
        .expect(201);

      expect(body.status).toBe(ServiceOrderStatus.AWAITING_APPROVAL);
      expect(body.quote).toMatchObject({
        status: QuoteStatus.PENDING,
        servicesTotal: 260,
        partsTotal: 99.8,
        suppliesTotal: 154,
        totalAmount: 513.8,
      });
    });

    it('should reserve the stock without touching the quantity on hand', async () => {
      const part = await readPart();

      expect(part.stockQuantity).toBe(10);
      expect(part.reservedQuantity).toBe(2);
      expect(part.availableQuantity).toBe(8);
    });

    it('should refuse new items after the quote is generated (409)', async () => {
      await asMechanic('post', `/service-orders/${orderId}/services`)
        .send({ serviceId, quantity: 1 })
        .expect(409);
    });
  });

  describe('orçamento como recurso próprio', () => {
    let orderId: string;
    let quoteId: string;

    beforeAll(async () => {
      orderId = await openOrder();
      const order = await fillOrder(orderId, { part: 1, supply: 1 });
      quoteId = order.quote.id;
    });

    it('should detail the quote by its id', async () => {
      const { body } = await asMechanic('get', `/quotes/${quoteId}`).expect(200);

      expect(body).toMatchObject({
        id: quoteId,
        serviceOrderId: orderId,
        status: QuoteStatus.PENDING,
      });
    });

    it('should find the quote of an order through the filter', async () => {
      const { body } = await asAdmin(
        'get',
        `/quotes?serviceOrderId=${orderId}`,
      ).expect(200);

      expect(body).toHaveLength(1);
      expect(body[0].id).toBe(quoteId);
    });

    it('should list the quotes still waiting for an answer', async () => {
      const { body } = await asAdmin(
        'get',
        `/quotes?status=${QuoteStatus.PENDING}`,
      ).expect(200);

      expect(
        body.some((quote: { id: string }) => quote.id === quoteId),
      ).toBe(true);
    });

    it('should answer 404 for an unknown quote', async () => {
      await asAdmin(
        'get',
        '/quotes/00000000-0000-4000-8000-000000000000',
      ).expect(404);
    });

    it('should block an anonymous request on the quotes (401)', async () => {
      await request(app.getHttpServer()).get('/quotes').expect(401);
    });
  });

  describe('APIs públicas do cliente', () => {
    let orderId: string;
    let orderNumber: string;

    beforeAll(async () => {
      orderId = await openOrder();
      const order = await fillOrder(orderId);
      orderNumber = order.number;
    });

    it('should return only the number and the status without a token', async () => {
      const { body } = await anonymous(
        'get',
        `/public/service-orders/${orderNumber}/status`,
      ).expect(200);

      expect(body).toEqual({
        number: orderNumber,
        status: ServiceOrderStatus.AWAITING_APPROVAL,
      });
    });

    it('should return the quote without a token', async () => {
      const { body } = await anonymous(
        'get',
        `/public/service-orders/${orderNumber}/quote`,
      ).expect(200);

      expect(body.vehiclePlate).toBe('ABC1D23');
      expect(body.totalAmount).toBe(513.8);
      expect(body.services).toHaveLength(1);
      expect(body).not.toHaveProperty('customerId');
    });

    it('should answer 404 for an unknown order number', async () => {
      await anonymous('get', '/public/service-orders/OS-999999/status').expect(
        404,
      );
    });

    it('should put the order in execution when the customer approves', async () => {
      const before = await readPart();

      const { body } = await anonymous(
        'post',
        `/public/service-orders/${orderNumber}/quote/approve`,
      ).expect(200);

      expect(body.status).toBe(QuoteStatus.APPROVED);
      expect(body.respondedAt).not.toBeNull();

      const after = await readPart();
      expect(after.stockQuantity).toBe(before.stockQuantity - 2);
      expect(after.reservedQuantity).toBe(before.reservedQuantity - 2);

      const order = await asAdmin('get', `/service-orders/${orderId}`).expect(
        200,
      );
      expect(order.body.status).toBe(ServiceOrderStatus.IN_PROGRESS);
    });

    it('should refuse a second answer to the same quote (409)', async () => {
      await anonymous(
        'post',
        `/public/service-orders/${orderNumber}/quote/reject`,
      ).expect(409);
    });

    it('should finish the order and give the stock back when the customer rejects', async () => {
      const before = await readPart();
      const rejectedId = await openOrder();
      const rejected = await fillOrder(rejectedId, { part: 1, supply: 2 });

      const reserved = await readPart();
      expect(reserved.reservedQuantity).toBe(before.reservedQuantity + 1);

      const { body } = await anonymous(
        'post',
        `/public/service-orders/${rejected.number}/quote/reject`,
      ).expect(200);

      expect(body.status).toBe(QuoteStatus.REJECTED);

      const after = await readPart();
      expect(after.reservedQuantity).toBe(before.reservedQuantity);
      expect(after.stockQuantity).toBe(before.stockQuantity);

      const order = await asAdmin(
        'get',
        `/service-orders/${rejectedId}`,
      ).expect(200);
      expect(order.body.status).toBe(ServiceOrderStatus.FINISHED);
    });
  });

  describe('conclusão e entrega', () => {
    let orderId: string;

    beforeAll(async () => {
      orderId = await openOrder();
      const order = await fillOrder(orderId, { part: 1, supply: 1 });
      await anonymous(
        'post',
        `/public/service-orders/${order.number}/quote/approve`,
      ).expect(200);
    });

    it('should move the order from in_progress to finished', async () => {
      const { body } = await asMechanic(
        'patch',
        `/service-orders/${orderId}/status`,
      )
        .send({ status: ServiceOrderStatus.FINISHED })
        .expect(200);

      expect(body.status).toBe(ServiceOrderStatus.FINISHED);
      expect(body.statusDurations).toHaveProperty(
        ServiceOrderStatus.IN_PROGRESS,
      );
    });

    it('should move the order from finished to delivered', async () => {
      const { body } = await asMechanic(
        'patch',
        `/service-orders/${orderId}/status`,
      )
        .send({ status: ServiceOrderStatus.DELIVERED })
        .expect(200);

      expect(body.status).toBe(ServiceOrderStatus.DELIVERED);
    });
  });

  describe('métricas', () => {
    it('should return the average time of each status to an admin', async () => {
      const { body } = await asAdmin(
        'get',
        '/metrics/service-orders/average-time-per-status',
      ).expect(200);

      const received = body.find(
        (row: { status: string }) => row.status === ServiceOrderStatus.RECEIVED,
      );
      expect(received.orders).toBeGreaterThan(0);
      expect(typeof received.averageSeconds).toBe('number');
    });

    it('should return the average execution time of each service to an admin', async () => {
      const { body } = await asAdmin(
        'get',
        '/metrics/services/average-execution-time',
      ).expect(200);

      expect(body[0]).toMatchObject({ serviceName: 'Troca de óleo' });
      expect(body[0].orders).toBeGreaterThan(0);
    });

    it('should block a mechanic on the metrics (403)', async () => {
      await asMechanic(
        'get',
        '/metrics/service-orders/average-time-per-status',
      ).expect(403);
      await asMechanic(
        'get',
        '/metrics/services/average-execution-time',
      ).expect(403);
    });
  });

  describe('inativação e controle de acesso', () => {
    it('should give the reservation back when an order awaiting approval is deactivated', async () => {
      const before = await readPart();
      const orderId = await openOrder();
      await fillOrder(orderId, { part: 3, supply: 1 });

      const reserved = await readPart();
      expect(reserved.reservedQuantity).toBe(before.reservedQuantity + 3);

      await asAdmin('delete', `/service-orders/${orderId}`).expect(204);

      const after = await readPart();
      expect(after.reservedQuantity).toBe(before.reservedQuantity);
      expect(after.stockQuantity).toBe(before.stockQuantity);

      await asAdmin('get', `/service-orders/${orderId}`).expect(200);
      const listed = await asAdmin('get', '/service-orders').expect(200);
      expect(
        listed.body.some((order: { id: string }) => order.id === orderId),
      ).toBe(false);
    });

    it.each([
      ['get', '/service-orders'],
      ['post', '/service-orders'],
    ])(
      'should block an anonymous request on %s %s (401)',
      async (method, url) => {
        await request(app.getHttpServer())
          [method as 'get' | 'post'](url)
          .expect(401);
      },
    );

    it('should let a mechanic list the orders', async () => {
      await asMechanic('get', '/service-orders').expect(200);
    });
  });
});
