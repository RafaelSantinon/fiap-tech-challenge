import { CUSTOMER_PAYLOAD, createCustomer } from './support/fixtures';
import { TestApp, bootstrapTestApp } from './support/test-app';

describe('Customers (e2e)', () => {
  let ctx: TestApp;
  let customerId: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  });

  afterAll(async () => {
    await ctx?.close();
  });

  describe('creation', () => {
    it('should store the document without the mask and resolve its type', async () => {
      const { body } = await ctx
        .asAdmin('post', '/customers')
        .send(CUSTOMER_PAYLOAD)
        .expect(201);

      customerId = body.id;
      expect(body.document).toBe('52998224725');
      expect(body.documentType).toBe('cpf');
      expect(body.isActive).toBe(true);
    });

    it('should accept a CNPJ resolving the type', async () => {
      const { body } = await ctx
        .asAdmin('post', '/customers')
        .send({
          ...CUSTOMER_PAYLOAD,
          name: 'Oficina Parceira LTDA',
          document: '11.222.333/0001-81',
          email: 'parceira@exemplo.com',
        })
        .expect(201);

      expect(body.document).toBe('11222333000181');
      expect(body.documentType).toBe('cnpj');
    });

    it('should reject a duplicated document (409)', async () => {
      await ctx
        .asAdmin('post', '/customers')
        .send(CUSTOMER_PAYLOAD)
        .expect(409);
    });

    it('should reject an invalid CPF (400)', async () => {
      await ctx
        .asAdmin('post', '/customers')
        .send({ ...CUSTOMER_PAYLOAD, document: '11111111111' })
        .expect(400);
    });

    it('should reject an invalid e-mail (400)', async () => {
      await ctx
        .asAdmin('post', '/customers')
        .send({ ...CUSTOMER_PAYLOAD, document: '39053344705', email: 'x' })
        .expect(400);
    });
  });

  describe('reading', () => {
    it('should identify the customer by document regardless of the mask', async () => {
      const { body } = await ctx
        .asAdmin('get', '/customers/document/529.982.247-25')
        .expect(200);

      expect(body.id).toBe(customerId);
    });

    it('should detail the customer by id', async () => {
      const { body } = await ctx
        .asAdmin('get', `/customers/${customerId}`)
        .expect(200);

      expect(body.name).toBe(CUSTOMER_PAYLOAD.name);
    });

    it('should answer 404 for an unknown document', async () => {
      await ctx.asAdmin('get', '/customers/document/39053344705').expect(404);
    });

    it('should answer 404 for an unknown id', async () => {
      await ctx
        .asAdmin('get', '/customers/00000000-0000-4000-8000-000000000000')
        .expect(404);
    });
  });

  describe('update', () => {
    it('should update the contact data', async () => {
      const { body } = await ctx
        .asAdmin('patch', `/customers/${customerId}`)
        .send({ email: 'maria.nova@exemplo.com', phone: '11888887777' })
        .expect(200);

      expect(body.email).toBe('maria.nova@exemplo.com');
      expect(body.phone).toBe('11888887777');
    });

    it('should reject changing to a document already in use (409)', async () => {
      await ctx
        .asAdmin('patch', `/customers/${customerId}`)
        .send({ document: '11222333000181' })
        .expect(409);
    });
  });

  describe('deactivation', () => {
    let disposableId: string;

    beforeAll(async () => {
      disposableId = await createCustomer(ctx, {
        document: '39053344705',
        email: 'descartavel@exemplo.com',
      });
    });

    it('should deactivate instead of deleting', async () => {
      await ctx.asAdmin('delete', `/customers/${disposableId}`).expect(204);

      const { body } = await ctx
        .asAdmin('get', `/customers/${disposableId}`)
        .expect(200);
      expect(body.isActive).toBe(false);
    });

    it('should hide the customer from the default listing', async () => {
      const { body } = await ctx.asAdmin('get', '/customers').expect(200);

      expect(
        body.some((customer: { id: string }) => customer.id === disposableId),
      ).toBe(false);
    });

    it('should bring the customer back with includeInactive', async () => {
      const { body } = await ctx
        .asAdmin('get', '/customers?includeInactive=true')
        .expect(200);

      expect(
        body.some((customer: { id: string }) => customer.id === disposableId),
      ).toBe(true);
    });

    it('should reactivate the customer through a patch', async () => {
      const { body } = await ctx
        .asAdmin('patch', `/customers/${disposableId}`)
        .send({ isActive: true })
        .expect(200);

      expect(body.isActive).toBe(true);
    });
  });

  describe('access control', () => {
    it('should block a mechanic on the customers (403)', async () => {
      await ctx.asMechanic('get', '/customers').expect(403);
      await ctx
        .asMechanic('post', '/customers')
        .send(CUSTOMER_PAYLOAD)
        .expect(403);
    });

    it('should block an anonymous request on the customers (401)', async () => {
      await ctx.anonymous('get', '/customers').expect(401);
    });
  });
});
