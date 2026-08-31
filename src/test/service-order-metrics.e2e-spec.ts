import { ServiceOrderStatus } from '../common/enums/service-order-status.enum';
import {
  CatalogIds,
  createCatalog,
  createCustomer,
  createVehicle,
  fillOrder,
  openOrder,
} from './support/fixtures';
import { TestApp, bootstrapTestApp } from './support/test-app';

describe('ServiceOrderMetrics (e2e)', () => {
  let ctx: TestApp;
  let catalog: CatalogIds;

  const STATUS_ROUTE = '/metrics/service-orders/average-time-per-status';
  const SERVICE_ROUTE = '/metrics/services/average-execution-time';

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
    const customerId = await createCustomer(ctx);
    const vehicleId = await createVehicle(ctx, customerId);
    catalog = await createCatalog(ctx);
  });

  afterAll(async () => {
    await ctx?.close();
  });

  describe('with no order yet', () => {
    it('should return an empty list on both metrics', async () => {
      const { body: perStatus } = await ctx
        .asAdmin('get', STATUS_ROUTE)
        .expect(200);
      const { body: perService } = await ctx
        .asAdmin('get', SERVICE_ROUTE)
        .expect(200);

      expect(perStatus).toEqual([]);
      expect(perService).toEqual([]);
    });
  });

  describe('with a delivered order', () => {
    beforeAll(async () => {
      const customerId = await createCustomer(ctx, {
        document: '39053344705',
        email: 'metricas@exemplo.com',
      });
      const vehicleId = await createVehicle(ctx, customerId, {
        plate: 'BRA2E19',
      });
      const orderId = await openOrder(ctx, customerId, vehicleId);
      const order = await fillOrder(ctx, orderId, catalog, {
        service: 1,
        part: 1,
        supply: 1,
      });
      const number = (order as unknown as { number: string }).number;

      await ctx
        .anonymous('post', `/public/service-orders/${number}/quote/approve`)
        .expect(200);
      await ctx
        .asMechanic('patch', `/service-orders/${orderId}/status`)
        .send({ status: ServiceOrderStatus.FINISHED })
        .expect(200);
      await ctx
        .asMechanic('patch', `/service-orders/${orderId}/status`)
        .send({ status: ServiceOrderStatus.DELIVERED })
        .expect(200);
    });

    it('should report the average time of every status the order went through', async () => {
      const { body } = await ctx.asAdmin('get', STATUS_ROUTE).expect(200);

      const reported = body.map((row: { status: string }) => row.status);
      expect(reported).toEqual(
        expect.arrayContaining([
          ServiceOrderStatus.RECEIVED,
          ServiceOrderStatus.IN_DIAGNOSIS,
          ServiceOrderStatus.AWAITING_APPROVAL,
          ServiceOrderStatus.IN_PROGRESS,
          ServiceOrderStatus.FINISHED,
        ]),
      );

      const received = body.find(
        (row: { status: string }) => row.status === ServiceOrderStatus.RECEIVED,
      );
      expect(received.orders).toBeGreaterThan(0);
      expect(typeof received.averageSeconds).toBe('number');
    });

    it('should not report a status the order never left', async () => {
      const { body } = await ctx.asAdmin('get', STATUS_ROUTE).expect(200);

      expect(
        body.some(
          (row: { status: string }) =>
            row.status === ServiceOrderStatus.DELIVERED,
        ),
      ).toBe(false);
    });

    it('should report the average execution time of the service', async () => {
      const { body } = await ctx.asAdmin('get', SERVICE_ROUTE).expect(200);

      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({
        serviceId: catalog.serviceId,
        serviceName: 'Troca de óleo',
      });
      expect(body[0].orders).toBeGreaterThan(0);
    });
  });

  describe('access control', () => {
    it('should block a mechanic on both metrics (403)', async () => {
      await ctx.asMechanic('get', STATUS_ROUTE).expect(403);
      await ctx.asMechanic('get', SERVICE_ROUTE).expect(403);
    });

    it('should block an anonymous request on both metrics (401)', async () => {
      await ctx.anonymous('get', STATUS_ROUTE).expect(401);
      await ctx.anonymous('get', SERVICE_ROUTE).expect(401);
    });
  });
});
