import { ServiceOrder } from './entities/service-order.entity';
import { toPartLines, toSupplyLines } from './service-order-stock.util';

describe('serviceOrderStockUtil', () => {
  const buildOrder = (overrides: Partial<ServiceOrder> = {}): ServiceOrder =>
    ({
      id: 'order-1',
      parts: [{ partId: 'part-1', quantity: 2 }],
      supplies: [{ supplyId: 'supply-1', quantity: 4 }],
      ...overrides,
    }) as ServiceOrder;

  afterEach(() => jest.restoreAllMocks());

  describe('toPartLines', () => {
    it('should map the part items to stock lines', () => {
      expect(toPartLines(buildOrder())).toEqual([
        { id: 'part-1', quantity: 2 },
      ]);
    });

    it('should return an empty list when the items were not loaded', () => {
      expect(toPartLines(buildOrder({ parts: undefined }))).toEqual([]);
    });
  });

  describe('toSupplyLines', () => {
    it('should map the supply items to stock lines', () => {
      expect(toSupplyLines(buildOrder())).toEqual([
        { id: 'supply-1', quantity: 4 },
      ]);
    });

    it('should return an empty list when the items were not loaded', () => {
      expect(toSupplyLines(buildOrder({ supplies: undefined }))).toEqual([]);
    });
  });
});
