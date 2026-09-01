import { moneyTransformer } from './money.transformer';

describe('moneyTransformer', () => {
  describe('to', () => {
    it('should forward the number to the database', () => {
      expect(moneyTransformer.to(49.9)).toBe(49.9);
    });

    it('should forward null', () => {
      expect(moneyTransformer.to(null)).toBeNull();
    });
  });

  describe('from', () => {
    it('should convert the numeric string into a number', () => {
      expect(moneyTransformer.from('49.90')).toBe(49.9);
    });

    it('should return null when the column is null', () => {
      expect(moneyTransformer.from(null)).toBeNull();
    });

    it('should return null when the column is undefined', () => {
      expect(moneyTransformer.from(undefined)).toBeNull();
    });
  });
});
