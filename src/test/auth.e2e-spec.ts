import request from 'supertest';
import { ADMIN, MECHANIC, TestApp, bootstrapTestApp } from './support/test-app';

describe('Auth (e2e)', () => {
  let ctx: TestApp;

  const login = (credentials: { email: string; password: string }) =>
    request(ctx.app.getHttpServer()).post('/auth/login').send({
      email: credentials.email,
      password: credentials.password,
    });

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  });

  afterAll(async () => {
    await ctx?.close();
  });

  describe('login', () => {
    it('should log in and return access + refresh tokens', async () => {
      const { body } = await login(ADMIN).expect(200);

      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.refreshToken).toEqual(expect.any(String));
      expect(body.user).toMatchObject({ email: ADMIN.email, role: 'admin' });
      expect(body.user).not.toHaveProperty('passwordHash');
    });

    it('should reject login with an invalid password (401)', async () => {
      const { status } = await login({
        email: ADMIN.email,
        password: 'ErrandoASenha@1',
      });
      expect(status).toBe(401);
    });

    it('should reject login of an unknown e-mail (401)', async () => {
      const { status } = await login({
        email: 'ninguem@oficina.com',
        password: 'Qualquer@1',
      });
      expect(status).toBe(401);
    });
  });

  describe('current user', () => {
    it('should return the authenticated user on /auth/me', async () => {
      const { body } = await ctx.asMechanic('get', '/auth/me').expect(200);

      expect(body).toMatchObject({ email: MECHANIC.email, role: 'mechanic' });
    });

    it('should block /auth/me without a token (401)', async () => {
      const { status } = await ctx.anonymous('get', '/auth/me');
      expect(status).toBe(401);
    });
  });

  describe('refresh rotation', () => {
    it('should renew the access token and invalidate the used refresh', async () => {
      const { body: session } = await login(ADMIN).expect(200);

      const { body: renewed } = await request(ctx.app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(200);

      expect(renewed.accessToken).toEqual(expect.any(String));
      expect(renewed.refreshToken).not.toBe(session.refreshToken);

      await request(ctx.app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);
    });

    it('should reject an unknown refresh token (401)', async () => {
      const { status } = await request(ctx.app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'nao-e-um-token' });
      expect(status).toBe(401);
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token on logout', async () => {
      const { body: session } = await login(MECHANIC).expect(200);

      const logout = await request(ctx.app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ refreshToken: session.refreshToken });
      expect(logout.status).toBe(204);

      const reuse = await request(ctx.app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: session.refreshToken });
      expect(reuse.status).toBe(401);
    });

    it('should block logout without a token (401)', async () => {
      const { status } = await ctx.anonymous('post', '/auth/logout');
      expect(status).toBe(401);
    });
  });
});
