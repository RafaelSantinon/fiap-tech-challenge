import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../enums/user-role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const buildContext = (user?: { role: string }): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow public routes', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key) => key === 'isPublic');
    expect(guard.canActivate(buildContext())).toBe(true);
  });

  it('should allow when the route declares no roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key) => (key === 'roles' ? undefined : false));
    expect(guard.canActivate(buildContext({ role: UserRole.MECHANIC }))).toBe(
      true,
    );
  });

  it('should allow when the user role is permitted', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key) => (key === 'roles' ? [UserRole.ADMIN] : false));
    expect(guard.canActivate(buildContext({ role: UserRole.ADMIN }))).toBe(
      true,
    );
  });

  it('should block when the user role is not permitted', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key) => (key === 'roles' ? [UserRole.ADMIN] : false));
    expect(() =>
      guard.canActivate(buildContext({ role: UserRole.MECHANIC })),
    ).toThrow(ForbiddenException);
  });

  it('should block when there is no user in the request', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key) => (key === 'roles' ? [UserRole.ADMIN] : false));
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
