import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PartsService } from './parts.service';
import { Part } from './entities/part.entity';

describe('PartsService', () => {
  let service: PartsService;
  let repo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  const buildPart = (overrides: Partial<Part> = {}): Part =>
    ({
      id: 'part-1',
      code: 'FLTOIL-001',
      name: 'Filtro de óleo',
      description: null,
      brand: 'Bosch',
      unitPrice: 49.9,
      stockQuantity: 10,
      minimumStock: 2,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Part;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 'part-1', ...v })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartsService,
        { provide: getRepositoryToken(Part), useValue: repo },
      ],
    }).compile();

    service = module.get<PartsService>(PartsService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('create', () => {
    it('should normalize the code before saving', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.create({
        code: 'flt oil-001',
        name: 'Filtro de óleo',
        unitPrice: 49.9,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'FLTOIL-001' }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('should default the stock fields to zero', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.create({
        code: 'FLTOIL-001',
        name: 'Filtro de óleo',
        unitPrice: 49.9,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
          brand: null,
          stockQuantity: 0,
          minimumStock: 0,
        }),
      );
    });

    it('should reject a duplicated code', async () => {
      repo.findOne.mockResolvedValue(buildPart());

      await expect(
        service.create({
          code: 'FLTOIL-001',
          name: 'Outro filtro',
          unitPrice: 30,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should list only active parts by default', async () => {
      repo.find.mockResolvedValue([buildPart()]);

      await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
      });
    });

    it('should list every part when inactive ones are included', async () => {
      repo.find.mockResolvedValue([buildPart()]);

      await service.findAll(true);

      expect(repo.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return the part', async () => {
      const existing = buildPart();
      repo.findOne.mockResolvedValue(existing);

      await expect(service.findOne('part-1')).resolves.toBe(existing);
    });

    it('should throw when the part does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('part-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findByCode', () => {
    it('should normalize the code before searching', async () => {
      repo.findOne.mockResolvedValue(buildPart());

      await service.findByCode('flt oil-001');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { code: 'FLTOIL-001' },
      });
    });

    it('should throw when no part has the code', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findByCode('FLTOIL-001')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update the editable fields', async () => {
      repo.findOne.mockResolvedValue(buildPart());

      const result = await service.update('part-1', {
        name: 'Filtro de óleo premium',
        description: 'Compatível com motores 1.0 a 2.0.',
        brand: 'Mann',
        unitPrice: 59.9,
        stockQuantity: 25,
        minimumStock: 5,
        isActive: false,
      });

      expect(result).toMatchObject({
        name: 'Filtro de óleo premium',
        description: 'Compatível com motores 1.0 a 2.0.',
        brand: 'Mann',
        unitPrice: 59.9,
        stockQuantity: 25,
        minimumStock: 5,
        isActive: false,
      });
    });

    it('should apply a new code that is free', async () => {
      repo.findOne
        .mockResolvedValueOnce(buildPart())
        .mockResolvedValueOnce(null);

      const result = await service.update('part-1', { code: 'pst fre-002' });

      expect(result.code).toBe('PSTFRE-002');
    });

    it('should reject changing to a code already in use', async () => {
      repo.findOne
        .mockResolvedValueOnce(buildPart())
        .mockResolvedValueOnce(buildPart({ id: 'other' }));

      await expect(
        service.update('part-1', { code: 'PSTFRE-002' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should not check the code when it did not change', async () => {
      repo.findOne.mockResolvedValue(buildPart());

      await service.update('part-1', { code: 'flt oil-001' });

      expect(repo.findOne).toHaveBeenCalledTimes(1);
    });

    it('should propagate NotFound when the part does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update('part-1', { unitPrice: 10 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should deactivate the part instead of deleting it', async () => {
      repo.findOne.mockResolvedValue(buildPart());

      await service.remove('part-1');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'part-1', isActive: false }),
      );
    });

    it('should throw when the part does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove('part-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
