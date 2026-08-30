import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { UserRole } from '../common/enums/user-role.enum';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const admin = { email: 'admin.e2e@oficina.com', password: 'AdminE2E@123' };
  const mechanic = { email: 'mec.e2e@oficina.com', password: 'MecE2E@123' };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);
    const usersService = app.get(UsersService);

    await dataSource.query(
      'TRUNCATE TABLE "users_tokens", "users" RESTART IDENTITY CASCADE',
    );
    await usersService.create({
      name: 'Admin E2E',
      email: admin.email,
      password: admin.password,
      role: UserRole.ADMIN,
    });
    await usersService.create({
      name: 'Mecânico E2E',
      email: mechanic.email,
      password: mechanic.password,
      role: UserRole.MECHANIC,
    });
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        'TRUNCATE TABLE "users_tokens", "users" RESTART IDENTITY CASCADE',
      );
    }
    await app?.close();
  });

  const login = (creds: { email: string; password: string }) =>
    request(app.getHttpServer()).post('/auth/login').send(creds);

  it('should log in and return access + refresh tokens', async () => {
    const res = await login(admin).expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.tokenType).toBe('Bearer');
    expect(res.body.user).toMatchObject({
      email: admin.email,
      role: UserRole.ADMIN,
    });
  });

  it('should reject login with an invalid password (401)', async () => {
    await login({ email: admin.email, password: 'errada' }).expect(401);
  });

  it('should access the protected /auth/me route with a valid token', async () => {
    const { body } = await login(admin);
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(200);
    expect(res.body.email).toBe(admin.email);
  });

  it('should block the protected route without a token (401)', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('should allow an admin to list users (200)', async () => {
    const { body } = await login(admin);
    const res = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).not.toHaveProperty('passwordHash');
  });

  it('should block a mechanic from listing users (403)', async () => {
    const { body } = await login(mechanic);
    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(403);
  });

  it('should renew the access token via refresh and invalidate the old refresh', async () => {
    const { body: loginBody } = await login(admin);
    const oldRefresh = loginBody.refreshToken;

    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(200);
    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.body.refreshToken).not.toBe(oldRefresh);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(401);
  });

  it('should log out and invalidate the refresh token', async () => {
    const { body } = await login(admin);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .send({ refreshToken: body.refreshToken })
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: body.refreshToken })
      .expect(401);
  });
});
