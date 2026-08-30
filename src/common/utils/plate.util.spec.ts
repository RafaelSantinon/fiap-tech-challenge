import { isValidPlate, normalizePlate } from './plate.util';

describe('normalizePlate', () => {
  it('should uppercase and strip separators', () => {
    expect(normalizePlate('abc-1d23')).toBe('ABC1D23');
    expect(normalizePlate(' abc 1234 ')).toBe('ABC1234');
  });
});

describe('isValidPlate', () => {
  it.each(['ABC1234', 'ABC1D23', 'abc-1d23', 'ABC1J23'])(
    'should accept %s',
    (input) => {
      expect(isValidPlate(input)).toBe(true);
    },
  );

  it.each(['AB1234', 'ABC12345', 'ABCD123', '1234ABC', 'ABC1K23', ''])(
    'should reject %s',
    (input) => {
      expect(isValidPlate(input)).toBe(false);
    },
  );
});
