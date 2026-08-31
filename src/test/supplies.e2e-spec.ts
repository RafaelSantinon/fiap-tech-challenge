import { SUPPLY_PAYLOAD } from './support/fixtures';
import { TestApp, bootstrapTestApp } from './support/test-app';

describe('Supplies (e2e)', () => {
  let ctx: TestApp;
  let supplyId: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  });

  afterAll(async () => {
    await ctx?.close();
  });

  describe('creation', () => {
    it('should create a supply with a normalized code', async () => {
      const { body } = await ctx
        .asAdmin('post', '/supplies')
        .send(SUPPLY_PAYLOAD)
        .expect(201);

      supplyId = body.id;
      expect(body.code).toBe('OLEO5W30');
      expect(body.unit).toBe('l');
      expect(body.unitPrice).toBe(38.5);
    });

    it('should start with no reservation and everything available', async () => {
      const { body } = await ctx
        .asAdmin('get', `/supplies/${supplyId}`)
        .expect(200);

      expect(body).toMatchObject({
        stockQuantity: 40,
        reservedQuantity: 0,
        availableQuantity: 40,
      });
    });

    it('should reject a duplicated code (409)', async () => {
      await ctx.asAdmin('post', '/supplies').send(SUPPLY_PAYLOAD).expect(409);
    });

    it('should reject an invalid measurement unit (400)', async () => {
      await ctx
        .asAdmin('post', '/supplies')
        .send({ ...SUPPLY_PAYLOAD, code: 'GRAXA-001', unit: 'litro' })
        .expect(400);
    });

    it('should reject a negative price (400)', async () => {
      await ctx
        .asAdmin('post', '/supplies')
        .send({ ...SUPPLY_PAYLOAD, code: 'NEG-001', unitPrice: -5 })
        .expect(400);
    });
  });

  describe('reading', () => {
    it('should find the supply by code regardless of the formatting', async () => {
      const { body } = await ctx
        .asAdmin('get', '/supplies/code/oleo 5w30')
        .expect(200);

      expect(body.id).toBe(supplyId);
    });

    it('should detail the supply by id', async () => {
      const { body } = await ctx
        .asAdmin('get', `/supplies/${supplyId}`)
        .expect(200);

      expect(body.name).toBe(SUPPLY_PAYLOAD.name);
    });

    it('should answer 404 for an unknown code', async () => {
      await ctx.asAdmin('get', '/supplies/code/UNKNOWN-999').expect(404);
    });
  });

  describe('update', () => {
    it('should restock the supply and change its unit', async () => {
      const { body } = await ctx
        .asAdmin('patch', `/supplies/${supplyId}`)
        .send({ stockQuantity: 60, unit: 'ml' })
        .expect(200);

      expect(body).toMatchObject({
        stockQuantity: 60,
        availableQuantity: 60,
        unit: 'ml',
      });
    });
  });

  describe('deactivation', () => {
    it('should hide the supply from the default listing after the soft delete', async () => {
      await ctx.asAdmin('delete', `/supplies/${supplyId}`).expect(204);

      const { body: active } = await ctx
        .asAdmin('get', '/supplies')
        .expect(200);
      expect(active.some((s: { id: string }) => s.id === supplyId)).toBe(false);

      const { body: all } = await ctx
        .asAdmin('get', '/supplies?includeInactive=true')
        .expect(200);
      expect(all.some((s: { id: string }) => s.id === supplyId)).toBe(true);
    });
  });

  describe('access control', () => {
    it('should block a mechanic on the supplies (403)', async () => {
      await ctx.asMechanic('get', '/supplies').expect(403);
    });

    it('should block an anonymous request on the supplies (401)', async () => {
      await ctx.anonymous('get', '/supplies').expect(401);
    });
  });
});
