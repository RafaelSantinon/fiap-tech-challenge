import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ServicesService } from './services.service';
import { Service } from './entities/service.entity';

describe('ServicesService', () => {
  let service: ServicesService;
  let repo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  const buildService = (overrides: Partial<Service> = {}): Service =>
    ({
      id: 'service-1',
      name: 'Troca de óleo',
      description: null,
      price: 189.9,
      estimatedMinutes: 60,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Service;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 'service-1', ...v })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: getRepositoryToken(Service), useValue: repo },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('create', () => {
    it('should create a service with a null description by default', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.create({
        name: 'Troca de óleo',
        price: 189.9,
        estimatedMinutes: 60,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Troca de óleo',
          description: null,
          price: 189.9,
          estimatedMinutes: 60,
        }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('should reject a duplicated name', async () => {
      repo.findOne.mockResolvedValue(buildService());

      await expect(
        service.create({
          name: 'Troca de óleo',
          price: 100,
          estimatedMinutes: 30,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should list only active services by default', async () => {
      repo.find.mockResolvedValue([buildService()]);

      await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
      });
    });

    it('should list every service when inactive ones are included', async () => {
      repo.find.mockResolvedValue([buildService()]);

      await service.findAll(true);

      expect(repo.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return the service', async () => {
      const existing = buildService();
      repo.findOne.mockResolvedValue(existing);

      await expect(service.findOne('service-1')).resolves.toBe(existing);
    });

    it('should throw when the service does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('service-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update the editable fields', async () => {
      repo.findOne.mockResolvedValue(buildService());

      const result = await service.update('service-1', {
        description: 'Inclui o filtro.',
        price: 210.5,
        estimatedMinutes: 90,
        isActive: false,
      });

      expect(result).toMatchObject({
        description: 'Inclui o filtro.',
        price: 210.5,
        estimatedMinutes: 90,
        isActive: false,
      });
    });

    it('should apply a new name that is free', async () => {
      repo.findOne
        .mockResolvedValueOnce(buildService())
        .mockResolvedValueOnce(null);

      const result = await service.update('service-1', {
        name: 'Alinhamento',
      });

      expect(result.name).toBe('Alinhamento');
    });

    it('should reject changing to a name already in use', async () => {
      repo.findOne
        .mockResolvedValueOnce(buildService())
        .mockResolvedValueOnce(buildService({ id: 'other' }));

      await expect(
        service.update('service-1', { name: 'Alinhamento' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should not check the name when it did not change', async () => {
      repo.findOne.mockResolvedValue(buildService());

      await service.update('service-1', { name: 'Troca de óleo' });

      expect(repo.findOne).toHaveBeenCalledTimes(1);
    });

    it('should propagate NotFound when the service does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update('service-1', { price: 10 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should deactivate the service instead of deleting it', async () => {
      repo.findOne.mockResolvedValue(buildService());

      await service.remove('service-1');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'service-1', isActive: false }),
      );
    });

    it('should throw when the service does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove('service-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
