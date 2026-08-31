import { SERVICE_PAYLOAD } from './support/fixtures';
import { TestApp, bootstrapTestApp } from './support/test-app';

describe('Services (e2e)', () => {
  let ctx: TestApp;
  let serviceId: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  });

  afterAll(async () => {
    await ctx?.close();
  });

  describe('creation', () => {
    it('should create a service returning the price as a number', async () => {
      const { body } = await ctx
        .asAdmin('post', '/services')
        .send(SERVICE_PAYLOAD)
        .expect(201);

      serviceId = body.id;
      expect(body.price).toBe(189.9);
      expect(typeof body.price).toBe('number');
      expect(body.isActive).toBe(true);
    });

    it('should reject a duplicated name (409)', async () => {
      await ctx.asAdmin('post', '/services').send(SERVICE_PAYLOAD).expect(409);
    });

    it('should reject a negative price (400)', async () => {
      await ctx
        .asAdmin('post', '/services')
        .send({ ...SERVICE_PAYLOAD, name: 'Alinhamento', price: -1 })
        .expect(400);
    });

    it('should reject an estimated time below one minute (400)', async () => {
      await ctx
        .asAdmin('post', '/services')
        .send({
          ...SERVICE_PAYLOAD,
          name: 'Balanceamento',
          estimatedMinutes: 0,
        })
        .expect(400);
    });

    it('should reject a field outside the DTO (400)', async () => {
      await ctx
        .asAdmin('post', '/services')
        .send({ ...SERVICE_PAYLOAD, name: 'Revisão', discount: 10 })
        .expect(400);
    });
  });

  describe('reading', () => {
    it('should detail the service by id', async () => {
      const { body } = await ctx
        .asAdmin('get', `/services/${serviceId}`)
        .expect(200);

      expect(body.name).toBe(SERVICE_PAYLOAD.name);
      expect(body.estimatedMinutes).toBe(60);
    });

    it('should answer 404 for an unknown id', async () => {
      await ctx
        .asAdmin('get', '/services/00000000-0000-4000-8000-000000000000')
        .expect(404);
    });

    it('should list the active services', async () => {
      const { body } = await ctx.asAdmin('get', '/services').expect(200);

      expect(body.some((s: { id: string }) => s.id === serviceId)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update the price and the estimated time', async () => {
      const { body } = await ctx
        .asAdmin('patch', `/services/${serviceId}`)
        .send({ price: 219.9, estimatedMinutes: 90 })
        .expect(200);

      expect(body).toMatchObject({ price: 219.9, estimatedMinutes: 90 });
    });
  });

  describe('deactivation', () => {
    it('should hide the service from the default listing after the soft delete', async () => {
      await ctx.asAdmin('delete', `/services/${serviceId}`).expect(204);

      const { body: active } = await ctx
        .asAdmin('get', '/services')
        .expect(200);
      expect(active.some((s: { id: string }) => s.id === serviceId)).toBe(
        false,
      );

      const { body: all } = await ctx
        .asAdmin('get', '/services?includeInactive=true')
        .expect(200);
      expect(all.some((s: { id: string }) => s.id === serviceId)).toBe(true);
    });

    it('should reactivate the service through a patch', async () => {
      const { body } = await ctx
        .asAdmin('patch', `/services/${serviceId}`)
        .send({ isActive: true })
        .expect(200);

      expect(body.isActive).toBe(true);
    });
  });

  describe('access control', () => {
    it('should block a mechanic on the services (403)', async () => {
      await ctx.asMechanic('get', '/services').expect(403);
    });

    it('should block an anonymous request on the services (401)', async () => {
      await ctx.anonymous('get', '/services').expect(401);
    });
  });
});
