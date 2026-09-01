import { TestApp, bootstrapTestApp } from './support/test-app';

describe('Users (e2e)', () => {
  let ctx: TestApp;
  let userId: string;

  const payload = {
    name: 'Carlos Mecânico',
    email: 'carlos@oficina.com',
    password: 'Carlos@123',
  };

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  });

  afterAll(async () => {
    await ctx?.close();
  });

  describe('creation', () => {
    it('should create a user defaulting the role to mechanic', async () => {
      const { body } = await ctx
        .asAdmin('post', '/users')
        .send(payload)
        .expect(201);

      userId = body.id;
      expect(body).toMatchObject({ email: payload.email, role: 'mechanic' });
      expect(body).not.toHaveProperty('passwordHash');
    });

    it('should reject a duplicated e-mail (409)', async () => {
      const { status } = await ctx.asAdmin('post', '/users').send(payload);
      expect(status).toBe(409);
    });

    it('should reject an invalid e-mail (400)', async () => {
      const { status } = await ctx
        .asAdmin('post', '/users')
        .send({ ...payload, email: 'nao-e-email' });
      expect(status).toBe(400);
    });

    it('should reject a field outside the DTO (400)', async () => {
      const { status } = await ctx
        .asAdmin('post', '/users')
        .send({ ...payload, email: 'outro@oficina.com', isSuperUser: true });
      expect(status).toBe(400);
    });
  });

  describe('reading', () => {
    it('should list the users without exposing the password hash', async () => {
      const { body } = await ctx.asAdmin('get', '/users').expect(200);

      expect(body.length).toBeGreaterThanOrEqual(3);
      expect(body[0]).not.toHaveProperty('passwordHash');
    });

    it('should detail a user by id', async () => {
      const { body } = await ctx.asAdmin('get', `/users/${userId}`).expect(200);

      expect(body.email).toBe(payload.email);
    });

    it('should answer 404 for an unknown id', async () => {
      const { status } = await ctx.asAdmin(
        'get',
        '/users/00000000-0000-4000-8000-000000000000',
      );
      expect(status).toBe(404);
    });

    it('should reject an id that is not a uuid (400)', async () => {
      const { status } = await ctx.asAdmin('get', '/users/nao-e-uuid');
      expect(status).toBe(400);
    });
  });

  describe('update', () => {
    it('should promote the user to admin', async () => {
      const { body } = await ctx
        .asAdmin('patch', `/users/${userId}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(body.role).toBe('admin');
    });

    it('should change the password and let the user log in with it', async () => {
      const update = await ctx
        .asAdmin('patch', `/users/${userId}`)
        .send({ password: 'NovaSenha@123' });
      expect(update.status).toBe(200);

      const session = await ctx
        .anonymous('post', '/auth/login')
        .send({ email: payload.email, password: 'NovaSenha@123' });
      expect(session.status).toBe(200);
    });
  });

  describe('removal', () => {
    it('should delete the user and block the login', async () => {
      const removal = await ctx.asAdmin('delete', `/users/${userId}`);
      expect(removal.status).toBe(204);

      const session = await ctx
        .anonymous('post', '/auth/login')
        .send({ email: payload.email, password: 'NovaSenha@123' });
      expect(session.status).toBe(401);
    });

    it('should drop the user from the listing', async () => {
      const { body } = await ctx.asAdmin('get', '/users').expect(200);

      expect(body.some((user: { id: string }) => user.id === userId)).toBe(
        false,
      );
    });

    it('should answer 404 when deleting the same user again', async () => {
      const { status } = await ctx.asAdmin('delete', `/users/${userId}`);
      expect(status).toBe(404);
    });
  });

  describe('access control', () => {
    it('should block a mechanic on the users (403)', async () => {
      const list = await ctx.asMechanic('get', '/users');
      expect(list.status).toBe(403);

      const created = await ctx.asMechanic('post', '/users').send(payload);
      expect(created.status).toBe(403);
    });

    it('should block an anonymous request on the users (401)', async () => {
      const { status } = await ctx.anonymous('get', '/users');
      expect(status).toBe(401);
    });
  });
});
