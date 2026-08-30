import { Test, TestingModule } from '@nestjs/testing';
import { SuppliesController } from './supplies.controller';
import { SuppliesService } from './supplies.service';
import { Supply } from './entities/supply.entity';
import { MeasurementUnit } from '../../common/enums/measurement-unit.enum';

describe('SuppliesController', () => {
  let controller: SuppliesController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    findByCode: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
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
      minimumStock: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Supply;

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
      controllers: [SuppliesController],
      providers: [{ provide: SuppliesService, useValue: service }],
    }).compile();

    controller = module.get<SuppliesController>(SuppliesController);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('create', () => {
    it('should create a supply and return a DTO with the normalized code', async () => {
      service.create.mockResolvedValue(buildSupply());

      const result = await controller.create({
        code: 'oleo-5w30',
        name: 'Óleo sintético 5W30',
        unit: MeasurementUnit.L,
        unitPrice: 38.5,
      });

      expect(result.code).toBe('OLEO-5W30');
      expect(result.unit).toBe(MeasurementUnit.L);
    });
  });

  describe('findAll', () => {
    it('should list supplies forwarding the includeInactive flag', async () => {
      service.findAll.mockResolvedValue([buildSupply()]);

      const result = await controller.findAll(true);

      expect(service.findAll).toHaveBeenCalledWith(true);
      expect(result).toHaveLength(1);
    });
  });

  describe('findByCode', () => {
    it('should identify a supply by its code', async () => {
      service.findByCode.mockResolvedValue(buildSupply());

      const result = await controller.findByCode('oleo-5w30');

      expect(service.findByCode).toHaveBeenCalledWith('oleo-5w30');
      expect(result.code).toBe('OLEO-5W30');
    });
  });

  describe('findOne', () => {
    it('should detail a supply by id', async () => {
      service.findOne.mockResolvedValue(buildSupply());

      const result = await controller.findOne('supply-1');

      expect(service.findOne).toHaveBeenCalledWith('supply-1');
      expect(result.name).toBe('Óleo sintético 5W30');
    });
  });

  describe('update', () => {
    it('should forward the payload to the service', async () => {
      service.update.mockResolvedValue(buildSupply({ stockQuantity: 60 }));

      const result = await controller.update('supply-1', {
        stockQuantity: 60,
      });

      expect(service.update).toHaveBeenCalledWith('supply-1', {
        stockQuantity: 60,
      });
      expect(result.stockQuantity).toBe(60);
    });
  });

  describe('remove', () => {
    it('should deactivate the supply', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('supply-1');

      expect(service.remove).toHaveBeenCalledWith('supply-1');
    });
  });
});
