import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from 'typeorm';
import { PartsService } from '../parts/parts.service';
import { SuppliesService } from '../supplies/supplies.service';
import { StockService } from './stock.service';

describe('StockService', () => {
  let service: StockService;
  let partsService: {
    reserve: jest.Mock;
    release: jest.Mock;
    consume: jest.Mock;
  };
  let suppliesService: {
    reserve: jest.Mock;
    release: jest.Mock;
    consume: jest.Mock;
  };

  const manager = {} as EntityManager;
  const parts = [{ id: 'part-1', quantity: 2 }];
  const supplies = [{ id: 'supply-1', quantity: 4 }];

  beforeEach(async () => {
    partsService = {
      reserve: jest.fn(),
      release: jest.fn(),
      consume: jest.fn(),
    };
    suppliesService = {
      reserve: jest.fn(),
      release: jest.fn(),
      consume: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: PartsService, useValue: partsService },
        { provide: SuppliesService, useValue: suppliesService },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('reserve', () => {
    it('should reserve every part and supply line', async () => {
      await service.reserve(parts, supplies, manager);

      expect(partsService.reserve).toHaveBeenCalledWith('part-1', 2, manager);
      expect(suppliesService.reserve).toHaveBeenCalledWith(
        'supply-1',
        4,
        manager,
      );
    });

    it('should do nothing when there is no line', async () => {
      await service.reserve([], [], manager);

      expect(partsService.reserve).not.toHaveBeenCalled();
      expect(suppliesService.reserve).not.toHaveBeenCalled();
    });
  });

  describe('release', () => {
    it('should release every part and supply line', async () => {
      await service.release(parts, supplies, manager);

      expect(partsService.release).toHaveBeenCalledWith('part-1', 2, manager);
      expect(suppliesService.release).toHaveBeenCalledWith(
        'supply-1',
        4,
        manager,
      );
    });

    it('should do nothing when there is no line', async () => {
      await service.release([], [], manager);

      expect(partsService.release).not.toHaveBeenCalled();
      expect(suppliesService.release).not.toHaveBeenCalled();
    });
  });

  describe('consume', () => {
    it('should consume every part and supply line', async () => {
      await service.consume(parts, supplies, manager);

      expect(partsService.consume).toHaveBeenCalledWith('part-1', 2, manager);
      expect(suppliesService.consume).toHaveBeenCalledWith(
        'supply-1',
        4,
        manager,
      );
    });

    it('should do nothing when there is no line', async () => {
      await service.consume([], [], manager);

      expect(partsService.consume).not.toHaveBeenCalled();
      expect(suppliesService.consume).not.toHaveBeenCalled();
    });
  });
});
