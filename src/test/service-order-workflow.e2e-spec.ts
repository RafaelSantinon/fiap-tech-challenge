import { Logger } from '@nestjs/common';
import { QuoteStatus } from '../common/enums/quote-status.enum';
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

describe('ServiceOrderWorkflow (e2e)', () => {
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

  afterEach(() => jest.restoreAllMocks());

  describe('adding items', () => {
    let orderId: string;

    beforeAll(async () => {
      orderId = await openOrder(ctx, customerId, vehicleId);
    });

    it('should keep the order in diagnosis while a group is still empty', async () => {
      await ctx
        .asMechanic('post', `/service-orders/${orderId}/services`)
        .send({ serviceId: catalog.serviceId, quantity: 2 })
        .expect(201);

      const { body } = await ctx
        .asMechanic('post', `/service-orders/${orderId}/parts`)
        .send({ partId: catalog.partId, quantity: 2 })
        .expect(201);

      expect(body.status).toBe(ServiceOrderStatus.IN_DIAGNOSIS);
      expect(body.quote).toBeNull();
    });

    it('should reject the same part twice (409)', async () => {
      await ctx
        .asMechanic('post', `/service-orders/${orderId}/parts`)
        .send({ partId: catalog.partId, quantity: 1 })
        .expect(409);
    });

    it('should reject a quantity above the free stock (409)', async () => {
      await ctx
        .asMechanic('post', `/service-orders/${orderId}/supplies`)
        .send({ supplyId: catalog.supplyId, quantity: 999 })
        .expect(409);
    });

    it('should reject an unknown order (404)', async () => {
      await ctx
        .asMechanic(
          'post',
          '/service-orders/00000000-0000-4000-8000-000000000000/parts',
        )
        .send({ partId: catalog.partId, quantity: 1 })
        .expect(404);
    });
  });

  describe('changing items before the quote', () => {
    let orderId: string;
    let partItemId: string;

    beforeAll(async () => {
      orderId = await openOrder(ctx, customerId, vehicleId);
      const { body } = await ctx
        .asMechanic('post', `/service-orders/${orderId}/parts`)
        .send({ partId: catalog.partId, quantity: 2 })
        .expect(201);
      partItemId = body.parts[0].id;
    });

    it('should recalculate the total when the quantity changes', async () => {
      const { body } = await ctx
        .asMechanic('patch', `/service-orders/${orderId}/parts/${partItemId}`)
        .send({ quantity: 3 })
        .expect(200);

      expect(body.parts[0]).toMatchObject({ quantity: 3, totalPrice: 149.7 });
    });

    it('should reject a new quantity above the free stock (409)', async () => {
      await ctx
        .asMechanic('patch', `/service-orders/${orderId}/parts/${partItemId}`)
        .send({ quantity: 999 })
        .expect(409);
    });

    it('should answer 404 for an item that is not in the order', async () => {
      await ctx
        .asMechanic(
          'patch',
          `/service-orders/${orderId}/parts/00000000-0000-4000-8000-000000000000`,
        )
        .send({ quantity: 1 })
        .expect(404);
    });

    it('should not touch the stock while removing an item before the quote', async () => {
      const before = await readPart(ctx, catalog.partId);

      await ctx
        .asMechanic('delete', `/service-orders/${orderId}/parts/${partItemId}`)
        .expect(204);

      const after = await readPart(ctx, catalog.partId);
      expect(after.reservedQuantity).toBe(before.reservedQuantity);
      expect(after.stockQuantity).toBe(before.stockQuantity);

      const { body } = await ctx
        .asMechanic('get', `/service-orders/${orderId}`)
        .expect(200);
      expect(body.parts).toEqual([]);
    });

    it('should add, update and remove a service item', async () => {
      const { body: added } = await ctx
        .asMechanic('post', `/service-orders/${orderId}/services`)
        .send({ serviceId: catalog.serviceId, quantity: 1 })
        .expect(201);
      const itemId = added.services[0].id;

      const { body: updated } = await ctx
        .asMechanic('patch', `/service-orders/${orderId}/services/${itemId}`)
        .send({ quantity: 3 })
        .expect(200);
      expect(updated.services[0].quantity).toBe(3);

      await ctx
        .asMechanic('delete', `/service-orders/${orderId}/services/${itemId}`)
        .expect(204);
    });

    it('should add, update and remove a supply item', async () => {
      const { body: added } = await ctx
        .asMechanic('post', `/service-orders/${orderId}/supplies`)
        .send({ supplyId: catalog.supplyId, quantity: 2 })
        .expect(201);
      const itemId = added.supplies[0].id;

      const { body: updated } = await ctx
        .asMechanic('patch', `/service-orders/${orderId}/supplies/${itemId}`)
        .send({ quantity: 5 })
        .expect(200);
      expect(updated.supplies[0]).toMatchObject({
        quantity: 5,
        totalPrice: 192.5,
      });

      await ctx
        .asMechanic('delete', `/service-orders/${orderId}/supplies/${itemId}`)
        .expect(204);
    });
  });

  describe('quote generation', () => {
    let orderId: string;

    beforeAll(async () => {
      orderId = await openOrder(ctx, customerId, vehicleId);
    });

    it('should generate the quote when the third group is filled', async () => {
      const log = jest.spyOn(Logger.prototype, 'log');
      const before = await readPart(ctx, catalog.partId);

      await ctx
        .asMechanic('post', `/service-orders/${orderId}/services`)
        .send({ serviceId: catalog.serviceId, quantity: 2 })
        .expect(201);
      await ctx
        .asMechanic('post', `/service-orders/${orderId}/parts`)
        .send({ partId: catalog.partId, quantity: 2 })
        .expect(201);
      const { body } = await ctx
        .asMechanic('post', `/service-orders/${orderId}/supplies`)
        .send({ supplyId: catalog.supplyId, quantity: 4 })
        .expect(201);

      expect(body.status).toBe(ServiceOrderStatus.AWAITING_APPROVAL);
      expect(body.quote).toMatchObject({
        status: QuoteStatus.PENDING,
        servicesTotal: 379.8,
        partsTotal: 99.8,
        suppliesTotal: 154,
        totalAmount: 633.6,
      });

      const after = await readPart(ctx, catalog.partId);
      expect(after.reservedQuantity).toBe(before.reservedQuantity + 2);
      expect(after.stockQuantity).toBe(before.stockQuantity);

      expect(log).toHaveBeenCalledWith(
        expect.stringContaining('E-mail do orçamento da ordem'),
      );
    });

    it('should refuse new items after the quote is generated (409)', async () => {
      await ctx
        .asMechanic('post', `/service-orders/${orderId}/services`)
        .send({ serviceId: catalog.serviceId, quantity: 1 })
        .expect(409);
    });

    it('should refuse removing an item after the quote is generated (409)', async () => {
      const { body } = await ctx
        .asMechanic('get', `/service-orders/${orderId}`)
        .expect(200);

      await ctx
        .asMechanic(
          'delete',
          `/service-orders/${orderId}/parts/${body.parts[0].id}`,
        )
        .expect(409);
    });
  });

  describe('customer tracking', () => {
    let orderNumber: string;

    beforeAll(async () => {
      const orderId = await openOrder(ctx, customerId, vehicleId);
      const order = await fillOrder(ctx, orderId, catalog, {
        service: 1,
        part: 1,
        supply: 1,
      });
      orderNumber = (order as unknown as { number: string }).number;
    });

    it('should return only the number and the status without a token', async () => {
      const { body } = await ctx
        .anonymous('get', `/public/service-orders/${orderNumber}/status`)
        .expect(200);

      expect(body).toEqual({
        number: orderNumber,
        status: ServiceOrderStatus.AWAITING_APPROVAL,
      });
    });

    it('should return the quote without a token and without customer data', async () => {
      const { body } = await ctx
        .anonymous('get', `/public/service-orders/${orderNumber}/quote`)
        .expect(200);

      expect(body.orderNumber).toBe(orderNumber);
      expect(body.vehiclePlate).toBe('ABC1D23');
      expect(body.services).toHaveLength(1);
      expect(body).not.toHaveProperty('customerId');
      expect(body).not.toHaveProperty('customerEmail');
    });

    it('should answer 404 for an unknown order number', async () => {
      await ctx
        .anonymous('get', '/public/service-orders/OS-999999/status')
        .expect(404);
      await ctx
        .anonymous('get', '/public/service-orders/OS-999999/quote')
        .expect(404);
    });
  });

  describe('customer approval', () => {
    let orderId: string;
    let orderNumber: string;

    beforeAll(async () => {
      orderId = await openOrder(ctx, customerId, vehicleId);
      const order = await fillOrder(ctx, orderId, catalog, {
        service: 1,
        part: 2,
        supply: 1,
      });
      orderNumber = (order as unknown as { number: string }).number;
    });

    it('should consume the stock and put the order in execution', async () => {
      const before = await readPart(ctx, catalog.partId);

      const { body } = await ctx
        .anonymous(
          'post',
          `/public/service-orders/${orderNumber}/quote/approve`,
        )
        .expect(200);

      expect(body.status).toBe(QuoteStatus.APPROVED);
      expect(body.respondedAt).not.toBeNull();

      const after = await readPart(ctx, catalog.partId);
      expect(after.stockQuantity).toBe(before.stockQuantity - 2);
      expect(after.reservedQuantity).toBe(before.reservedQuantity - 2);

      const { body: order } = await ctx
        .asMechanic('get', `/service-orders/${orderId}`)
        .expect(200);
      expect(order.status).toBe(ServiceOrderStatus.IN_PROGRESS);
    });

    it('should refuse a second answer to the same quote (409)', async () => {
      await ctx
        .anonymous('post', `/public/service-orders/${orderNumber}/quote/reject`)
        .expect(409);
    });

    it('should move the order through finished and delivered', async () => {
      const { body: finished } = await ctx
        .asMechanic('patch', `/service-orders/${orderId}/status`)
        .send({ status: ServiceOrderStatus.FINISHED })
        .expect(200);
      expect(finished.statusDurations).toHaveProperty(
        ServiceOrderStatus.IN_PROGRESS,
      );

      const { body: delivered } = await ctx
        .asMechanic('patch', `/service-orders/${orderId}/status`)
        .send({ status: ServiceOrderStatus.DELIVERED })
        .expect(200);
      expect(delivered.status).toBe(ServiceOrderStatus.DELIVERED);
    });
  });

  describe('customer rejection', () => {
    it('should give the stock back and finish the order', async () => {
      const before = await readPart(ctx, catalog.partId);
      const orderId = await openOrder(ctx, customerId, vehicleId);
      const order = await fillOrder(ctx, orderId, catalog, {
        service: 1,
        part: 1,
        supply: 1,
      });
      const orderNumber = (order as unknown as { number: string }).number;

      const reserved = await readPart(ctx, catalog.partId);
      expect(reserved.reservedQuantity).toBe(before.reservedQuantity + 1);

      const { body } = await ctx
        .anonymous('post', `/public/service-orders/${orderNumber}/quote/reject`)
        .expect(200);
      expect(body.status).toBe(QuoteStatus.REJECTED);

      const after = await readPart(ctx, catalog.partId);
      expect(after.reservedQuantity).toBe(before.reservedQuantity);
      expect(after.stockQuantity).toBe(before.stockQuantity);

      const { body: finished } = await ctx
        .asMechanic('get', `/service-orders/${orderId}`)
        .expect(200);
      expect(finished.status).toBe(ServiceOrderStatus.FINISHED);
    });
  });

  describe('access control', () => {
    it('should block an anonymous request on the items (401)', async () => {
      await ctx
        .anonymous('post', '/service-orders/any/parts')
        .send({ partId: catalog.partId, quantity: 1 })
        .expect(401);
    });

    it('should let an admin add items too', async () => {
      const orderId = await openOrder(ctx, customerId, vehicleId);

      await ctx
        .asAdmin('post', `/service-orders/${orderId}/services`)
        .send({ serviceId: catalog.serviceId, quantity: 1 })
        .expect(201);
    });
  });
});
