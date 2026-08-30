import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SuppliesService } from './supplies.service';
import { Supply } from './entities/supply.entity';
import { MeasurementUnit } from '../../common/enums/measurement-unit.enum';

describe('SuppliesService', () => {
  let service: SuppliesService;
  let repo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  const buildSupply = (overrides: Partial<Supply> = {}): Supply =>
    ({
      id: 'supply-1',
      code: 'OLEO-5W30',
      name: 'Óleo sintético 5W30',
      description: null,
      unit: MeasurementUnit.L,
      unitPrice: 38.5,
      stockQuantity: 40,
      reservedQuantity: 0,
      minimumStock: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Supply;

  let manager: { findOne: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    manager = {
      findOne: jest.fn(),
      save: jest.fn((_entity, value) => Promise.resolve(value)),
    };

    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 'supply-1', ...v })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliesService,
        { provide: getRepositoryToken(Supply), useValue: repo },
      ],
    }).compile();

    service = module.get<SuppliesService>(SuppliesService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('create', () => {
    it('should normalize the code before saving', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.create({
        code: 'oleo 5w30',
        name: 'Óleo sintético 5W30',
        unit: MeasurementUnit.L,
        unitPrice: 38.5,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'OLEO5W30', unit: MeasurementUnit.L }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('should default the stock fields to zero', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.create({
        code: 'OLEO-5W30',
        name: 'Óleo sintético 5W30',
        unit: MeasurementUnit.L,
        unitPrice: 38.5,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
          stockQuantity: 0,
          minimumStock: 0,
        }),
      );
    });

    it('should reject a duplicated code', async () => {
      repo.findOne.mockResolvedValue(buildSupply());

      await expect(
        service.create({
          code: 'OLEO-5W30',
          name: 'Outro óleo',
          unit: MeasurementUnit.L,
          unitPrice: 30,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should list only active supplies by default', async () => {
      repo.find.mockResolvedValue([buildSupply()]);

      await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
      });
    });

    it('should list every supply when inactive ones are included', async () => {
      repo.find.mockResolvedValue([buildSupply()]);

      await service.findAll(true);

      expect(repo.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return the supply', async () => {
      const existing = buildSupply();
      repo.findOne.mockResolvedValue(existing);

      await expect(service.findOne('supply-1')).resolves.toBe(existing);
    });

    it('should throw when the supply does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('supply-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findByCode', () => {
    it('should normalize the code before searching', async () => {
      repo.findOne.mockResolvedValue(buildSupply());

      await service.findByCode('oleo-5w30');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { code: 'OLEO-5W30' },
      });
    });

    it('should throw when no supply has the code', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findByCode('OLEO-5W30')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update the editable fields', async () => {
      repo.findOne.mockResolvedValue(buildSupply());

      const result = await service.update('supply-1', {
        name: 'Óleo sintético 5W40',
        description: 'Indicado para motores turbo.',
        unit: MeasurementUnit.ML,
        unitPrice: 42,
        stockQuantity: 60,
        minimumStock: 20,
        isActive: false,
      });

      expect(result).toMatchObject({
        name: 'Óleo sintético 5W40',
        description: 'Indicado para motores turbo.',
        unit: MeasurementUnit.ML,
        unitPrice: 42,
        stockQuantity: 60,
        minimumStock: 20,
        isActive: false,
      });
    });

    it('should apply a new code that is free', async () => {
      repo.findOne
        .mockResolvedValueOnce(buildSupply())
        .mockResolvedValueOnce(null);

      const result = await service.update('supply-1', { code: 'graxa 001' });

      expect(result.code).toBe('GRAXA001');
    });

    it('should reject changing to a code already in use', async () => {
      repo.findOne
        .mockResolvedValueOnce(buildSupply())
        .mockResolvedValueOnce(buildSupply({ id: 'other' }));

      await expect(
        service.update('supply-1', { code: 'GRAXA-001' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should not check the code when it did not change', async () => {
      repo.findOne.mockResolvedValue(buildSupply());

      await service.update('supply-1', { code: 'oleo-5w30' });

      expect(repo.findOne).toHaveBeenCalledTimes(1);
    });

    it('should propagate NotFound when the supply does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update('supply-1', { unitPrice: 10 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should deactivate the supply instead of deleting it', async () => {
      repo.findOne.mockResolvedValue(buildSupply());

      await service.remove('supply-1');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'supply-1', isActive: false }),
      );
    });

    it('should throw when the supply does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove('supply-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('availableQuantity', () => {
    it('should discount the reserved quantity from the stock', () => {
      const supply = buildSupply({ stockQuantity: 10, reservedQuantity: 3 });

      expect(service.availableQuantity(supply)).toBe(7);
    });
  });

  describe('assertAvailable', () => {
    it('should return the supply when there is enough free stock', async () => {
      const existing = buildSupply({ stockQuantity: 10, reservedQuantity: 2 });
      repo.findOne.mockResolvedValue(existing);

      await expect(service.assertAvailable('supply-1', 8)).resolves.toBe(
        existing,
      );
    });

    it('should reject when the free stock is not enough', async () => {
      repo.findOne.mockResolvedValue(
        buildSupply({ stockQuantity: 10, reservedQuantity: 5 }),
      );

      await expect(
        service.assertAvailable('supply-1', 6),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('reserve', () => {
    it('should lock the row and increase the reserved quantity', async () => {
      manager.findOne.mockResolvedValue(
        buildSupply({ stockQuantity: 10, reservedQuantity: 1 }),
      );

      await service.reserve('supply-1', 4, manager as unknown as EntityManager);

      expect(manager.findOne).toHaveBeenCalledWith(
        Supply,
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
      expect(manager.save).toHaveBeenCalledWith(
        Supply,
        expect.objectContaining({ reservedQuantity: 5 }),
      );
    });

    it('should reject when the free stock is not enough', async () => {
      manager.findOne.mockResolvedValue(
        buildSupply({ stockQuantity: 10, reservedQuantity: 8 }),
      );

      await expect(
        service.reserve('supply-1', 3, manager as unknown as EntityManager),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('should throw when the supply does not exist', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(
        service.reserve('supply-1', 1, manager as unknown as EntityManager),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('release', () => {
    it('should give the reserved quantity back', async () => {
      manager.findOne.mockResolvedValue(
        buildSupply({ stockQuantity: 10, reservedQuantity: 4 }),
      );

      await service.release('supply-1', 3, manager as unknown as EntityManager);

      expect(manager.save).toHaveBeenCalledWith(
        Supply,
        expect.objectContaining({ reservedQuantity: 1, stockQuantity: 10 }),
      );
    });

    it('should never leave a negative reserved quantity', async () => {
      manager.findOne.mockResolvedValue(
        buildSupply({ stockQuantity: 10, reservedQuantity: 1 }),
      );

      await service.release('supply-1', 5, manager as unknown as EntityManager);

      expect(manager.save).toHaveBeenCalledWith(
        Supply,
        expect.objectContaining({ reservedQuantity: 0 }),
      );
    });
  });

  describe('consume', () => {
    it('should take the quantity out of the stock and of the reservation', async () => {
      manager.findOne.mockResolvedValue(
        buildSupply({ stockQuantity: 10, reservedQuantity: 4 }),
      );

      await service.consume('supply-1', 4, manager as unknown as EntityManager);

      expect(manager.save).toHaveBeenCalledWith(
        Supply,
        expect.objectContaining({ reservedQuantity: 0, stockQuantity: 6 }),
      );
    });
  });
});
