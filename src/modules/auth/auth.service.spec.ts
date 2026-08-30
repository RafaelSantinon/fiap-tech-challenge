import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserToken } from './entities/user-token.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';

jest.mock('bcrypt');

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock };
  let jwtService: { signAsync: jest.Mock };
  let tokenRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  const buildUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-1',
      name: 'Admin',
      email: 'admin@oficina.com',
      passwordHash: 'hashed',
      role: UserRole.ADMIN,
      isActive: true,
      tokens: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as User;

  beforeEach(async () => {
    usersService = { findByEmail: jest.fn() };
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed-access') };
    tokenRepo = {
      findOne: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve(v)),
    };

    const configValues: Record<string, string> = {
      'jwt.accessSecret': 'access-secret',
      'jwt.accessExpires': '10m',
      'jwt.refreshExpires': '7d',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (key: string, def?: string) => configValues[key] ?? def,
            ),
          },
        },
        { provide: getRepositoryToken(UserToken), useValue: tokenRepo },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('login', () => {
    it('should issue tokens when credentials are valid', async () => {
      const user = buildUser();
      usersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: user.email,
        password: 'senha',
      });

      expect(result.accessToken).toBe('signed-access');
      expect(result.refreshToken).toHaveLength(96);
      expect(result.expiresIn).toBe(600);
      expect(result.tokenType).toBe('Bearer');
      expect(result.user).toMatchObject({
        id: 'user-1',
        role: UserRole.ADMIN,
      });
      expect(tokenRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should reject when the user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'x@x.com', password: 'y' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should reject when the user is inactive', async () => {
      usersService.findByEmail.mockResolvedValue(
        buildUser({ isActive: false }),
      );
      await expect(
        service.login({ email: 'admin@oficina.com', password: 'y' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should reject when the password is incorrect', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.login({ email: 'admin@oficina.com', password: 'errada' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should rotate the token and issue a new pair', async () => {
      const user = buildUser();
      const stored: Partial<UserToken> = {
        id: 'tok-1',
        userId: user.id,
        refreshTokenHash: hashToken('valid-refresh'),
        expiresAt: new Date(Date.now() + 60_000),
        revoked: false,
        user,
      };
      tokenRepo.findOne.mockResolvedValue(stored);

      const result = await service.refresh('valid-refresh');

      expect(stored.revoked).toBe(true);
      expect(result.accessToken).toBe('signed-access');
      expect(result.refreshToken).not.toBe('valid-refresh');
      expect(tokenRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should reject a non-existent token', async () => {
      tokenRepo.findOne.mockResolvedValue(null);
      await expect(service.refresh('nope')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('should reject a revoked token', async () => {
      tokenRepo.findOne.mockResolvedValue({
        revoked: true,
        expiresAt: new Date(Date.now() + 60_000),
        user: buildUser(),
      });
      await expect(service.refresh('x')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('should reject an expired token', async () => {
      tokenRepo.findOne.mockResolvedValue({
        revoked: false,
        expiresAt: new Date(Date.now() - 1000),
        user: buildUser(),
      });
      await expect(service.refresh('x')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('should reject when the token user is inactive', async () => {
      tokenRepo.findOne.mockResolvedValue({
        revoked: false,
        expiresAt: new Date(Date.now() + 60_000),
        user: buildUser({ isActive: false }),
      });
      await expect(service.refresh('x')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should revoke the existing refresh token', async () => {
      const stored: Partial<UserToken> = { revoked: false };
      tokenRepo.findOne.mockResolvedValue(stored);
      await service.logout('some-token');
      expect(stored.revoked).toBe(true);
      expect(tokenRepo.save).toHaveBeenCalledWith(stored);
    });

    it('should not fail when the token does not exist', async () => {
      tokenRepo.findOne.mockResolvedValue(null);
      await expect(service.logout('ghost')).resolves.toBeUndefined();
      expect(tokenRepo.save).not.toHaveBeenCalled();
    });
  });
});
