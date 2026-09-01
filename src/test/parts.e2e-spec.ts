import { PART_PAYLOAD } from './support/fixtures';
import { TestApp, bootstrapTestApp } from './support/test-app';

describe('Parts (e2e)', () => {
  let ctx: TestApp;
  let partId: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  });

  afterAll(async () => {
    await ctx?.close();
  });

  describe('creation', () => {
    it('should create a part with a normalized code', async () => {
      const { body } = await ctx
        .asAdmin('post', '/parts')
        .send(PART_PAYLOAD)
        .expect(201);

      partId = body.id;
      expect(body.code).toBe('FLTOIL-001');
      expect(body.unitPrice).toBe(49.9);
    });

    it('should start with no reservation and everything available', async () => {
      const { body } = await ctx.asAdmin('get', `/parts/${partId}`).expect(200);

      expect(body).toMatchObject({
        stockQuantity: 10,
        reservedQuantity: 0,
        availableQuantity: 10,
      });
    });

    it('should default the stock fields to zero when omitted', async () => {
      const { body } = await ctx
        .asAdmin('post', '/parts')
        .send({ code: 'PSTFRE-002', name: 'Pastilha de freio', unitPrice: 120 })
        .expect(201);

      expect(body).toMatchObject({
        stockQuantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        minimumStock: 0,
      });
    });

    it('should reject a duplicated code (409)', async () => {
      const { status } = await ctx.asAdmin('post', '/parts').send(PART_PAYLOAD);
      expect(status).toBe(409);
    });

    it('should reject a negative stock quantity (400)', async () => {
      const { status } = await ctx
        .asAdmin('post', '/parts')
        .send({ ...PART_PAYLOAD, code: 'NEG-001', stockQuantity: -1 });
      expect(status).toBe(400);
    });

    it('should reject a field outside the DTO (400)', async () => {
      const { status } = await ctx
        .asAdmin('post', '/parts')
        .send({ ...PART_PAYLOAD, code: 'EXT-001', reservedQuantity: 5 });
      expect(status).toBe(400);
    });
  });

  describe('reading', () => {
    it('should find the part by code regardless of the formatting', async () => {
      const { body } = await ctx
        .asAdmin('get', '/parts/code/flt oil-001')
        .expect(200);

      expect(body.id).toBe(partId);
    });

    it('should detail the part by id', async () => {
      const { body } = await ctx.asAdmin('get', `/parts/${partId}`).expect(200);

      expect(body.name).toBe(PART_PAYLOAD.name);
    });

    it('should answer 404 for an unknown code', async () => {
      const { status } = await ctx.asAdmin('get', '/parts/code/UNKNOWN-999');
      expect(status).toBe(404);
    });
  });

  describe('update', () => {
    it('should restock the part keeping the reservation untouched', async () => {
      const { body } = await ctx
        .asAdmin('patch', `/parts/${partId}`)
        .send({ stockQuantity: 25 })
        .expect(200);

      expect(body).toMatchObject({
        stockQuantity: 25,
        reservedQuantity: 0,
        availableQuantity: 25,
      });
    });

    it('should apply a new code that is free', async () => {
      const { body } = await ctx
        .asAdmin('patch', `/parts/${partId}`)
        .send({ code: 'flt oil-010' })
        .expect(200);

      expect(body.code).toBe('FLTOIL-010');
    });

    it('should reject changing to a code already in use (409)', async () => {
      const { status } = await ctx
        .asAdmin('patch', `/parts/${partId}`)
        .send({ code: 'PSTFRE-002' });
      expect(status).toBe(409);
    });
  });

  describe('deactivation', () => {
    it('should hide the part from the default listing after the soft delete', async () => {
      await ctx.asAdmin('delete', `/parts/${partId}`).expect(204);

      const { body: active } = await ctx.asAdmin('get', '/parts').expect(200);
      expect(active.some((p: { id: string }) => p.id === partId)).toBe(false);

      const { body: all } = await ctx
        .asAdmin('get', '/parts?includeInactive=true')
        .expect(200);
      expect(all.some((p: { id: string }) => p.id === partId)).toBe(true);
    });
  });

  describe('access control', () => {
    it('should block a mechanic on the parts (403)', async () => {
      const { status } = await ctx.asMechanic('get', '/parts');
      expect(status).toBe(403);
    });

    it('should block an anonymous request on the parts (401)', async () => {
      const { status } = await ctx.anonymous('get', '/parts');
      expect(status).toBe(401);
    });
  });
});
