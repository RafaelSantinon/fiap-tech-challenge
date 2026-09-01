import { QuoteStatus } from '../common/enums/quote-status.enum';
import {
  CatalogIds,
  createCatalog,
  createCustomer,
  createVehicle,
  fillOrder,
  openOrder,
} from './support/fixtures';
import { TestApp, bootstrapTestApp } from './support/test-app';

describe('Quotes (e2e)', () => {
  let ctx: TestApp;
  let catalog: CatalogIds;
  let orderId: string;
  let orderNumber: string;
  let quoteId: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
    const customerId = await createCustomer(ctx);
    const vehicleId = await createVehicle(ctx, customerId);
    catalog = await createCatalog(ctx);

    orderId = await openOrder(ctx, customerId, vehicleId);
    const order = await fillOrder(ctx, orderId, catalog, {
      service: 1,
      part: 1,
      supply: 1,
    });
    const filled = order as unknown as {
      number: string;
      quote: { id: string };
    };
    orderNumber = filled.number;
    quoteId = filled.quote.id;
  });

  afterAll(async () => {
    await ctx?.close();
  });

  describe('reading', () => {
    it('should detail the quote by its id', async () => {
      const { body } = await ctx
        .asMechanic('get', `/quotes/${quoteId}`)
        .expect(200);

      expect(body).toMatchObject({
        id: quoteId,
        serviceOrderId: orderId,
        status: QuoteStatus.PENDING,
      });
      expect(body.totalAmount).toBe(278.3);
      expect(body.respondedAt).toBeNull();
    });

    it('should answer 404 for an unknown quote', async () => {
      const { status } = await ctx.asAdmin(
        'get',
        '/quotes/00000000-0000-4000-8000-000000000000',
      );
      expect(status).toBe(404);
    });

    it('should reject an id that is not a uuid (400)', async () => {
      const { status } = await ctx.asAdmin('get', '/quotes/nao-e-uuid');
      expect(status).toBe(400);
    });
  });

  describe('filters', () => {
    it('should list every quote without a filter', async () => {
      const { body } = await ctx.asAdmin('get', '/quotes').expect(200);

      expect(body.some((q: { id: string }) => q.id === quoteId)).toBe(true);
    });

    it('should find the quote of an order', async () => {
      const { body } = await ctx
        .asAdmin('get', `/quotes?serviceOrderId=${orderId}`)
        .expect(200);

      expect(body).toHaveLength(1);
      expect(body[0].id).toBe(quoteId);
    });

    it('should list the quotes still waiting for an answer', async () => {
      const { body } = await ctx
        .asAdmin('get', `/quotes?status=${QuoteStatus.PENDING}`)
        .expect(200);

      expect(body.some((q: { id: string }) => q.id === quoteId)).toBe(true);
    });

    it('should stop listing the quote as pending after the answer', async () => {
      await ctx
        .anonymous(
          'post',
          `/public/service-orders/${orderNumber}/quote/approve`,
        )
        .expect(200);

      const { body: pending } = await ctx
        .asAdmin('get', `/quotes?status=${QuoteStatus.PENDING}`)
        .expect(200);
      expect(pending.some((q: { id: string }) => q.id === quoteId)).toBe(false);

      const { body: approved } = await ctx
        .asAdmin('get', `/quotes?status=${QuoteStatus.APPROVED}`)
        .expect(200);
      expect(approved.some((q: { id: string }) => q.id === quoteId)).toBe(true);
    });

    it('should reject an invalid status filter (400)', async () => {
      const { status } = await ctx.asAdmin('get', '/quotes?status=aguardando');
      expect(status).toBe(400);
    });
  });

  describe('access control', () => {
    it('should let both admin and mechanic read the quotes', async () => {
      const asAdmin = await ctx.asAdmin('get', '/quotes');
      expect(asAdmin.status).toBe(200);

      const asMechanic = await ctx.asMechanic('get', '/quotes');
      expect(asMechanic.status).toBe(200);
    });

    it('should block an anonymous request on the quotes (401)', async () => {
      const list = await ctx.anonymous('get', '/quotes');
      expect(list.status).toBe(401);

      const detail = await ctx.anonymous('get', `/quotes/${quoteId}`);
      expect(detail.status).toBe(401);
    });
  });
});
