import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let repo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };

  const buildUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-1',
      name: 'João',
      email: 'joao@oficina.com',
      passwordHash: 'hashed',
      role: UserRole.MECHANIC,
      isActive: true,
      tokens: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as User;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 'user-1', ...v })),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => 10) },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('create', () => {
    it('should hash the password and default the role to mechanic', async () => {
      repo.findOne.mockResolvedValue(null);
      const hashSpy = bcrypt.hash as jest.Mock;
      hashSpy.mockResolvedValue('hashed-pass');

      await service.create({
        name: 'João',
        email: 'joao@oficina.com',
        password: 'SenhaForte@1',
      });

      expect(hashSpy).toHaveBeenCalledWith('SenhaForte@1', 10);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: 'hashed-pass',
          role: UserRole.MECHANIC,
        }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('should respect the provided role', async () => {
      repo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('h');

      await service.create({
        name: 'Chefe',
        email: 'chefe@oficina.com',
        password: 'SenhaForte@1',
        role: UserRole.ADMIN,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.ADMIN }),
      );
    });

    it('should reject a duplicated email', async () => {
      repo.findOne.mockResolvedValue(buildUser());
      await expect(
        service.create({
          name: 'X',
          email: 'joao@oficina.com',
          password: 'SenhaForte@1',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return the existing user', async () => {
      const user = buildUser();
      repo.findOne.mockResolvedValue(user);
      await expect(service.findOne('user-1')).resolves.toBe(user);
    });

    it('should throw NotFound when the user does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should delegate to the repository', async () => {
      const user = buildUser();
      repo.findOne.mockResolvedValue(user);
      await expect(service.findByEmail(user.email)).resolves.toBe(user);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { email: user.email },
      });
    });
  });

  describe('update', () => {
    it('should update the name and re-hash the password when provided', async () => {
      const user = buildUser();
      repo.findOne.mockResolvedValueOnce(user);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

      const result = await service.update('user-1', {
        name: 'Novo Nome',
        password: 'OutraSenha@1',
      });

      expect(result.name).toBe('Novo Nome');
      expect(result.passwordHash).toBe('new-hash');
    });

    it('should reject changing to an already used email', async () => {
      const user = buildUser();
      repo.findOne
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(buildUser({ id: 'other' }));

      await expect(
        service.update('user-1', { email: 'em-uso@oficina.com' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('should remove the existing user', async () => {
      const user = buildUser();
      repo.findOne.mockResolvedValue(user);
      await service.remove('user-1');
      expect(repo.remove).toHaveBeenCalledWith(user);
    });
  });
});
