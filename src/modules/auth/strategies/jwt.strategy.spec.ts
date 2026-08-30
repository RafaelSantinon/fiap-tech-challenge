import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: { findByEmail: jest.Mock };

  const config = {
    get: jest.fn((key: string) =>
      key === 'jwt.accessSecret' ? 'secret' : undefined,
    ),
  } as unknown as ConfigService;

  const payload: JwtPayload = {
    sub: 'user-1',
    email: 'admin@oficina.com',
    role: UserRole.ADMIN,
  };

  const buildUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-1',
      email: 'admin@oficina.com',
      role: UserRole.ADMIN,
      isActive: true,
      ...overrides,
    }) as User;

  beforeEach(() => {
    usersService = { findByEmail: jest.fn() };
    strategy = new JwtStrategy(config, usersService as unknown as UsersService);
  });

  it('should return the authenticated user for a valid payload', async () => {
    usersService.findByEmail.mockResolvedValue(buildUser());
    await expect(strategy.validate(payload)).resolves.toEqual({
      id: 'user-1',
      email: 'admin@oficina.com',
      role: UserRole.ADMIN,
    });
  });

  it('should reject when the user does not exist', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should reject when the user is inactive', async () => {
    usersService.findByEmail.mockResolvedValue(buildUser({ isActive: false }));
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should reject when the token id differs from the user', async () => {
    usersService.findByEmail.mockResolvedValue(buildUser({ id: 'outro' }));
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
