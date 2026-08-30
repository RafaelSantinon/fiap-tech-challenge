import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should delegate login to the service', async () => {
    const dto = { email: 'a@a.com', password: 'x' };
    authService.login.mockResolvedValue({ accessToken: 't' });
    await expect(controller.login(dto)).resolves.toEqual({ accessToken: 't' });
    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it('should delegate refresh to the service', async () => {
    authService.refresh.mockResolvedValue({ accessToken: 't2' });
    await controller.refresh({ refreshToken: 'r' });
    expect(authService.refresh).toHaveBeenCalledWith('r');
  });

  it('should delegate logout to the service', async () => {
    authService.logout.mockResolvedValue(undefined);
    await controller.logout({ refreshToken: 'r' });
    expect(authService.logout).toHaveBeenCalledWith('r');
  });

  it('should return the authenticated user on /me', () => {
    const user: AuthenticatedUser = {
      id: '1',
      email: 'a@a.com',
      role: UserRole.ADMIN,
    };
    expect(controller.me(user)).toBe(user);
  });
});
