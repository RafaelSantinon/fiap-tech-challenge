import {
  VEHICLE_PAYLOAD,
  createCustomer,
  createVehicle,
} from './support/fixtures';
import { TestApp, bootstrapTestApp } from './support/test-app';

describe('Vehicles (e2e)', () => {
  let ctx: TestApp;
  let customerId: string;
  let vehicleId: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
    customerId = await createCustomer(ctx);
  });

  afterAll(async () => {
    await ctx?.close();
  });

  describe('creation', () => {
    it('should normalize the plate before storing it', async () => {
      const { body } = await ctx
        .asAdmin('post', '/vehicles')
        .send({ ...VEHICLE_PAYLOAD, customerId })
        .expect(201);

      vehicleId = body.id;
      expect(body.plate).toBe('ABC1D23');
      expect(body.customerId).toBe(customerId);
    });

    it('should accept a Mercosul plate', async () => {
      const { body } = await ctx
        .asAdmin('post', '/vehicles')
        .send({ ...VEHICLE_PAYLOAD, plate: 'BRA2E19', customerId })
        .expect(201);

      expect(body.plate).toBe('BRA2E19');
    });

    it('should reject an invalid plate (400)', async () => {
      const { status } = await ctx
        .asAdmin('post', '/vehicles')
        .send({ ...VEHICLE_PAYLOAD, plate: '1234567', customerId });
      expect(status).toBe(400);
    });

    it('should reject a duplicated plate (409)', async () => {
      const { status } = await ctx
        .asAdmin('post', '/vehicles')
        .send({ ...VEHICLE_PAYLOAD, customerId });
      expect(status).toBe(409);
    });

    it('should reject an unknown customer (404)', async () => {
      const { status } = await ctx.asAdmin('post', '/vehicles').send({
        ...VEHICLE_PAYLOAD,
        plate: 'XYZ9J88',
        customerId: '00000000-0000-4000-8000-000000000000',
      });
      expect(status).toBe(404);
    });
  });

  describe('reading', () => {
    it('should find the vehicle by plate regardless of the formatting', async () => {
      const { body } = await ctx
        .asAdmin('get', '/vehicles/plate/abc-1d23')
        .expect(200);

      expect(body.id).toBe(vehicleId);
    });

    it('should detail the vehicle by id', async () => {
      const { body } = await ctx
        .asAdmin('get', `/vehicles/${vehicleId}`)
        .expect(200);

      expect(body.model).toBe(VEHICLE_PAYLOAD.model);
    });

    it('should answer 404 for an unknown plate', async () => {
      const { status } = await ctx.asAdmin('get', '/vehicles/plate/ZZZ9J99');
      expect(status).toBe(404);
    });

    it('should list only the vehicles of a customer', async () => {
      const { body } = await ctx
        .asAdmin('get', `/vehicles?customerId=${customerId}`)
        .expect(200);

      expect(body).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update the model and the year', async () => {
      const { body } = await ctx
        .asAdmin('patch', `/vehicles/${vehicleId}`)
        .send({ model: 'Gol G8', year: 2022 })
        .expect(200);

      expect(body).toMatchObject({ model: 'Gol G8', year: 2022 });
    });

    it('should reject changing to a plate already in use (409)', async () => {
      const { status } = await ctx
        .asAdmin('patch', `/vehicles/${vehicleId}`)
        .send({ plate: 'BRA2E19' });
      expect(status).toBe(409);
    });
  });

  describe('deactivation', () => {
    let disposableId: string;

    beforeAll(async () => {
      disposableId = await createVehicle(ctx, customerId, { plate: 'QWE4A56' });
    });

    it('should deactivate instead of deleting', async () => {
      await ctx.asAdmin('delete', `/vehicles/${disposableId}`).expect(204);

      const { body } = await ctx
        .asAdmin('get', `/vehicles/${disposableId}`)
        .expect(200);
      expect(body.isActive).toBe(false);
    });

    it('should hide the vehicle from the default listing', async () => {
      const { body } = await ctx.asAdmin('get', '/vehicles').expect(200);

      expect(
        body.some((vehicle: { id: string }) => vehicle.id === disposableId),
      ).toBe(false);
    });

    it('should bring the vehicle back with includeInactive', async () => {
      const { body } = await ctx
        .asAdmin('get', '/vehicles?includeInactive=true')
        .expect(200);

      expect(
        body.some((vehicle: { id: string }) => vehicle.id === disposableId),
      ).toBe(true);
    });
  });

  describe('inactive customer', () => {
    it('should refuse a vehicle for an inactive customer (409)', async () => {
      const otherId = await createCustomer(ctx, {
        document: '39053344705',
        email: 'inativo@exemplo.com',
      });
      const removal = await ctx.asAdmin('delete', `/customers/${otherId}`);
      expect(removal.status).toBe(204);

      const created = await ctx
        .asAdmin('post', '/vehicles')
        .send({ ...VEHICLE_PAYLOAD, plate: 'TUV7B65', customerId: otherId });
      expect(created.status).toBe(409);
    });
  });

  describe('access control', () => {
    it('should block a mechanic on the vehicles (403)', async () => {
      const list = await ctx.asMechanic('get', '/vehicles');
      expect(list.status).toBe(403);

      const created = await ctx
        .asMechanic('post', '/vehicles')
        .send({ ...VEHICLE_PAYLOAD, customerId });
      expect(created.status).toBe(403);
    });

    it('should block an anonymous request on the vehicles (401)', async () => {
      const { status } = await ctx.anonymous('get', '/vehicles');
      expect(status).toBe(401);
    });
  });
});
