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
      await ctx.asAdmin('post', '/users').send(payload).expect(409);
    });

    it('should reject an invalid e-mail (400)', async () => {
      await ctx
        .asAdmin('post', '/users')
        .send({ ...payload, email: 'nao-e-email' })
        .expect(400);
    });

    it('should reject a field outside the DTO (400)', async () => {
      await ctx
        .asAdmin('post', '/users')
        .send({ ...payload, email: 'outro@oficina.com', isSuperUser: true })
        .expect(400);
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
      await ctx
        .asAdmin('get', '/users/00000000-0000-4000-8000-000000000000')
        .expect(404);
    });

    it('should reject an id that is not a uuid (400)', async () => {
      await ctx.asAdmin('get', '/users/nao-e-uuid').expect(400);
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
      await ctx
        .asAdmin('patch', `/users/${userId}`)
        .send({ password: 'NovaSenha@123' })
        .expect(200);

      await ctx
        .anonymous('post', '/auth/login')
        .send({ email: payload.email, password: 'NovaSenha@123' })
        .expect(200);
    });
  });

  describe('removal', () => {
    it('should delete the user and block the login', async () => {
      await ctx.asAdmin('delete', `/users/${userId}`).expect(204);

      await ctx
        .anonymous('post', '/auth/login')
        .send({ email: payload.email, password: 'NovaSenha@123' })
        .expect(401);
    });

    it('should drop the user from the listing', async () => {
      const { body } = await ctx.asAdmin('get', '/users').expect(200);

      expect(body.some((user: { id: string }) => user.id === userId)).toBe(
        false,
      );
    });

    it('should answer 404 when deleting the same user again', async () => {
      await ctx.asAdmin('delete', `/users/${userId}`).expect(404);
    });
  });

  describe('access control', () => {
    it('should block a mechanic on the users (403)', async () => {
      await ctx.asMechanic('get', '/users').expect(403);
      await ctx.asMechanic('post', '/users').send(payload).expect(403);
    });

    it('should block an anonymous request on the users (401)', async () => {
      await ctx.anonymous('get', '/users').expect(401);
    });
  });
});
