import { IsPlateConstraint } from './is-plate.decorator';

describe('IsPlateConstraint', () => {
  const constraint = new IsPlateConstraint();

  it('should accept both plate formats', () => {
    expect(constraint.validate('ABC1234')).toBe(true);
    expect(constraint.validate('abc-1d23')).toBe(true);
  });

  it('should reject an invalid plate', () => {
    expect(constraint.validate('AB1234')).toBe(false);
  });

  it('should reject a non-string value', () => {
    expect(constraint.validate(1234567)).toBe(false);
  });

  it('should expose a message in portuguese', () => {
    expect(constraint.defaultMessage()).toBe('Placa inválida.');
  });
});
