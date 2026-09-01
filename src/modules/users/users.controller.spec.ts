import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';

describe('UsersController', () => {
  let controller: UsersController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const user: User = {
    id: 'user-1',
    name: 'João',
    email: 'joao@oficina.com',
    passwordHash: 'secret-hash',
    role: UserRole.MECHANIC,
    isActive: true,
    tokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should create a user and return a DTO without exposing the password hash', async () => {
    service.create.mockResolvedValue(user);
    const result = await controller.create({
      name: 'João',
      email: 'joao@oficina.com',
      password: 'SenhaForte@1',
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.id).toBe('user-1');
  });

  it('should list users', async () => {
    service.findAll.mockResolvedValue([user]);
    const result = await controller.findAll();
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('passwordHash');
  });

  it('should detail a user', async () => {
    service.findOne.mockResolvedValue(user);
    const result = await controller.findOne('user-1');
    expect(result.email).toBe('joao@oficina.com');
  });

  it('should update a user', async () => {
    service.update.mockResolvedValue({ ...user, name: 'Novo' });
    const result = await controller.update('user-1', { name: 'Novo' });
    expect(result.name).toBe('Novo');
    expect(service.update).toHaveBeenCalledWith('user-1', { name: 'Novo' });
  });

  it('should remove a user', async () => {
    service.remove.mockResolvedValue(undefined);
    await controller.remove('user-1');
    expect(service.remove).toHaveBeenCalledWith('user-1');
  });
});
