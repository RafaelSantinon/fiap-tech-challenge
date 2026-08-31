import { ServiceOrderStatus } from '../common/enums/service-order-status.enum';
import {
  CatalogIds,
  createCatalog,
  createCustomer,
  createVehicle,
  fillOrder,
  openOrder,
  readPart,
} from './support/fixtures';
import { TestApp, bootstrapTestApp } from './support/test-app';

describe('ServiceOrders (e2e)', () => {
  let ctx: TestApp;
  let customerId: string;
  let vehicleId: string;
  let catalog: CatalogIds;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
    customerId = await createCustomer(ctx);
    vehicleId = await createVehicle(ctx, customerId);
    catalog = await createCatalog(ctx);
  });

  afterAll(async () => {
    await ctx?.close();
  });

  describe('opening', () => {
    let orderId: string;

    it('should open the order in the received status with a generated number', async () => {
      const { body } = await ctx
        .asMechanic('post', '/service-orders')
        .send({ customerId, vehicleId, description: 'Barulho na suspensão.' })
        .expect(201);

      orderId = body.id;
      expect(body.number).toMatch(/^OS-\d{6}$/);
      expect(body.status).toBe(ServiceOrderStatus.RECEIVED);
      expect(body.quote).toBeNull();
      expect(body.services).toEqual([]);
    });

    it('should reject a vehicle that belongs to another customer (409)', async () => {
      const otherId = await createCustomer(ctx, {
        document: '39053344705',
        email: 'outro@exemplo.com',
      });

      await ctx
        .asMechanic('post', '/service-orders')
        .send({ customerId: otherId, vehicleId })
        .expect(409);
    });

    it('should reject an unknown vehicle (404)', async () => {
      await ctx
        .asMechanic('post', '/service-orders')
        .send({
          customerId,
          vehicleId: '00000000-0000-4000-8000-000000000000',
        })
        .expect(404);
    });

    it('should detail the order by id', async () => {
      const { body } = await ctx
        .asMechanic('get', `/service-orders/${orderId}`)
        .expect(200);

      expect(body.customerId).toBe(customerId);
      expect(body.vehicleId).toBe(vehicleId);
    });

    it('should update the description', async () => {
      const { body } = await ctx
        .asMechanic('patch', `/service-orders/${orderId}`)
        .send({ description: 'Buchas da bandeja gastas.' })
        .expect(200);

      expect(body.description).toBe('Buchas da bandeja gastas.');
    });
  });

  describe('status machine', () => {
    let orderId: string;

    beforeAll(async () => {
      const { body } = await ctx
        .asMechanic('post', '/service-orders')
        .send({ customerId, vehicleId })
        .expect(201);
      orderId = body.id;
    });

    it('should move the order from received to in_diagnosis', async () => {
      const { body } = await ctx
        .asMechanic('patch', `/service-orders/${orderId}/status`)
        .send({ status: ServiceOrderStatus.IN_DIAGNOSIS })
        .expect(200);

      expect(body.status).toBe(ServiceOrderStatus.IN_DIAGNOSIS);
      expect(body.statusDurations).toHaveProperty(ServiceOrderStatus.RECEIVED);
    });

    it('should reject a status that only changes automatically (400)', async () => {
      await ctx
        .asMechanic('patch', `/service-orders/${orderId}/status`)
        .send({ status: ServiceOrderStatus.AWAITING_APPROVAL })
        .expect(400);
    });

    it('should reject skipping a step (400)', async () => {
      await ctx
        .asMechanic('patch', `/service-orders/${orderId}/status`)
        .send({ status: ServiceOrderStatus.DELIVERED })
        .expect(400);
    });

    it('should reject a status outside the enum (400)', async () => {
      await ctx
        .asMechanic('patch', `/service-orders/${orderId}/status`)
        .send({ status: 'cancelada' })
        .expect(400);
    });
  });

  describe('listing', () => {
    it('should filter by status', async () => {
      const { body } = await ctx
        .asMechanic(
          'get',
          `/service-orders?status=${ServiceOrderStatus.IN_DIAGNOSIS}`,
        )
        .expect(200);

      expect(body.length).toBeGreaterThan(0);
      expect(
        body.every(
          (order: { status: string }) =>
            order.status === ServiceOrderStatus.IN_DIAGNOSIS,
        ),
      ).toBe(true);
    });

    it('should filter by customer', async () => {
      const { body } = await ctx
        .asMechanic('get', `/service-orders?customerId=${customerId}`)
        .expect(200);

      expect(
        body.every(
          (order: { customerId: string }) => order.customerId === customerId,
        ),
      ).toBe(true);
    });
  });

  describe('deactivation', () => {
    it('should give the reservation back when the order was awaiting approval', async () => {
      const before = await readPart(ctx, catalog.partId);
      const orderId = await openOrder(ctx, customerId, vehicleId);
      await fillOrder(ctx, orderId, catalog, {
        service: 1,
        part: 3,
        supply: 1,
      });

      const reserved = await readPart(ctx, catalog.partId);
      expect(reserved.reservedQuantity).toBe(before.reservedQuantity + 3);

      await ctx.asAdmin('delete', `/service-orders/${orderId}`).expect(204);

      const after = await readPart(ctx, catalog.partId);
      expect(after.reservedQuantity).toBe(before.reservedQuantity);
      expect(after.stockQuantity).toBe(before.stockQuantity);
    });

    it('should hide the order from the default listing', async () => {
      const orderId = await openOrder(ctx, customerId, vehicleId);
      await ctx.asAdmin('delete', `/service-orders/${orderId}`).expect(204);

      const { body: active } = await ctx
        .asMechanic('get', '/service-orders')
        .expect(200);
      expect(active.some((o: { id: string }) => o.id === orderId)).toBe(false);

      const { body: all } = await ctx
        .asMechanic('get', '/service-orders?includeInactive=true')
        .expect(200);
      expect(all.some((o: { id: string }) => o.id === orderId)).toBe(true);
    });
  });

  describe('access control', () => {
    it('should let a mechanic list the orders', async () => {
      await ctx.asMechanic('get', '/service-orders').expect(200);
    });

    it('should let an admin list the orders', async () => {
      await ctx.asAdmin('get', '/service-orders').expect(200);
    });

    it.each([
      ['get', '/service-orders'],
      ['post', '/service-orders'],
    ])(
      'should block an anonymous request on %s %s (401)',
      async (method, url) => {
        await ctx.anonymous(method as 'get' | 'post', url).expect(401);
      },
    );
  });
});
