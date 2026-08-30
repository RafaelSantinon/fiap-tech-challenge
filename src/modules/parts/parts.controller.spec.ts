import { Test, TestingModule } from '@nestjs/testing';
import { PartsController } from './parts.controller';
import { PartsService } from './parts.service';
import { Part } from './entities/part.entity';

describe('PartsController', () => {
  let controller: PartsController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    findByCode: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
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
      reservedQuantity: 0,
      minimumStock: 2,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Part;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByCode: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartsController],
      providers: [{ provide: PartsService, useValue: service }],
    }).compile();

    controller = module.get<PartsController>(PartsController);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('create', () => {
    it('should create a part and return a DTO with the normalized code', async () => {
      service.create.mockResolvedValue(buildPart());

      const result = await controller.create({
        code: 'flt oil-001',
        name: 'Filtro de óleo',
        unitPrice: 49.9,
      });

      expect(result.code).toBe('FLTOIL-001');
      expect(result.unitPrice).toBe(49.9);
    });
  });

  describe('findAll', () => {
    it('should list parts forwarding the includeInactive flag', async () => {
      service.findAll.mockResolvedValue([buildPart()]);

      const result = await controller.findAll(true);

      expect(service.findAll).toHaveBeenCalledWith(true);
      expect(result).toHaveLength(1);
    });
  });

  describe('findByCode', () => {
    it('should identify a part by its code', async () => {
      service.findByCode.mockResolvedValue(buildPart());

      const result = await controller.findByCode('flt oil-001');

      expect(service.findByCode).toHaveBeenCalledWith('flt oil-001');
      expect(result.code).toBe('FLTOIL-001');
    });
  });

  describe('findOne', () => {
    it('should detail a part by id', async () => {
      service.findOne.mockResolvedValue(buildPart());

      const result = await controller.findOne('part-1');

      expect(service.findOne).toHaveBeenCalledWith('part-1');
      expect(result.name).toBe('Filtro de óleo');
    });
  });

  describe('update', () => {
    it('should forward the payload to the service', async () => {
      service.update.mockResolvedValue(buildPart({ stockQuantity: 25 }));

      const result = await controller.update('part-1', { stockQuantity: 25 });

      expect(service.update).toHaveBeenCalledWith('part-1', {
        stockQuantity: 25,
      });
      expect(result.stockQuantity).toBe(25);
    });
  });

  describe('remove', () => {
    it('should deactivate the part', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('part-1');

      expect(service.remove).toHaveBeenCalledWith('part-1');
    });
  });
});
