import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Part } from '../modules/parts/entities/part.entity';
import { Supply } from '../modules/supplies/entities/supply.entity';
import { StockService } from '../modules/stock/stock.service';
import { createPart, createSupply } from './support/fixtures';
import { TestApp, bootstrapTestApp } from './support/test-app';

describe('Stock (e2e)', () => {
  let ctx: TestApp;
  let dataSource: DataSource;
  let stockService: StockService;
  let partId: string;
  let supplyId: string;

  const readPart = () =>
    dataSource.getRepository(Part).findOneOrFail({ where: { id: partId } });

  const readSupply = () =>
    dataSource.getRepository(Supply).findOneOrFail({ where: { id: supplyId } });

  const reset = async () => {
    await dataSource
      .getRepository(Part)
      .update(partId, { stockQuantity: 10, reservedQuantity: 0 });
    await dataSource
      .getRepository(Supply)
      .update(supplyId, { stockQuantity: 40, reservedQuantity: 0 });
  };

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
    dataSource = ctx.dataSource;
    stockService = ctx.app.get(StockService);
    partId = await createPart(ctx);
    supplyId = await createSupply(ctx);
  });

  afterAll(async () => {
    await ctx?.close();
  });

  beforeEach(() => reset());

  describe('reserve', () => {
    it('should reserve without touching the physical stock', async () => {
      await dataSource.transaction((manager) =>
        stockService.reserve(
          [{ id: partId, quantity: 3 }],
          [{ id: supplyId, quantity: 5 }],
          manager,
        ),
      );

      const part = await readPart();
      const supply = await readSupply();
      expect(part).toMatchObject({ stockQuantity: 10, reservedQuantity: 3 });
      expect(supply).toMatchObject({ stockQuantity: 40, reservedQuantity: 5 });
    });

    it('should reserve everything that is free', async () => {
      await dataSource.transaction((manager) =>
        stockService.reserve([{ id: partId, quantity: 10 }], [], manager),
      );

      expect((await readPart()).reservedQuantity).toBe(10);
    });

    it('should refuse to reserve more than what is available', async () => {
      await expect(
        dataSource.transaction((manager) =>
          stockService.reserve([{ id: partId, quantity: 11 }], [], manager),
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      expect((await readPart()).reservedQuantity).toBe(0);
    });

    it('should count an existing reservation as unavailable', async () => {
      await dataSource.transaction((manager) =>
        stockService.reserve([{ id: partId, quantity: 8 }], [], manager),
      );

      await expect(
        dataSource.transaction((manager) =>
          stockService.reserve([{ id: partId, quantity: 3 }], [], manager),
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      expect((await readPart()).reservedQuantity).toBe(8);
    });

    it('should roll the whole reservation back when one line fails', async () => {
      await expect(
        dataSource.transaction((manager) =>
          stockService.reserve(
            [{ id: partId, quantity: 2 }],
            [{ id: supplyId, quantity: 999 }],
            manager,
          ),
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      expect((await readPart()).reservedQuantity).toBe(0);
      expect((await readSupply()).reservedQuantity).toBe(0);
    });
  });

  describe('consume', () => {
    it('should take the quantity out of the stock and of the reservation', async () => {
      await dataSource.transaction(async (manager) => {
        await stockService.reserve([{ id: partId, quantity: 4 }], [], manager);
        await stockService.consume([{ id: partId, quantity: 4 }], [], manager);
      });

      expect(await readPart()).toMatchObject({
        stockQuantity: 6,
        reservedQuantity: 0,
      });
    });
  });

  describe('release', () => {
    it('should give the reservation back without changing the stock', async () => {
      await dataSource.transaction(async (manager) => {
        await stockService.reserve([{ id: partId, quantity: 6 }], [], manager);
        await stockService.release([{ id: partId, quantity: 6 }], [], manager);
      });

      expect(await readPart()).toMatchObject({
        stockQuantity: 10,
        reservedQuantity: 0,
      });
    });
  });

  describe('concurrency', () => {
    it('should let only one of two transactions take the last units', async () => {
      await dataSource
        .getRepository(Part)
        .update(partId, { stockQuantity: 1, reservedQuantity: 0 });

      const reserveLastUnit = () =>
        dataSource.transaction((manager) =>
          stockService.reserve([{ id: partId, quantity: 1 }], [], manager),
        );

      const results = await Promise.allSettled([
        reserveLastUnit(),
        reserveLastUnit(),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((await readPart()).reservedQuantity).toBe(1);
    });
  });
});
