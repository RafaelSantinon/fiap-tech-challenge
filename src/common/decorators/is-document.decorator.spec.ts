import { IsDocumentConstraint } from './is-document.decorator';

describe('IsDocumentConstraint', () => {
  const constraint = new IsDocumentConstraint();

  it('should accept a valid CPF and a valid CNPJ', () => {
    expect(constraint.validate('529.982.247-25')).toBe(true);
    expect(constraint.validate('11.222.333/0001-81')).toBe(true);
  });

  it('should reject an invalid document', () => {
    expect(constraint.validate('52998224724')).toBe(false);
  });

  it('should reject a non-string value', () => {
    expect(constraint.validate(52998224725)).toBe(false);
    expect(constraint.validate(undefined)).toBe(false);
  });

  it('should expose a message in portuguese', () => {
    expect(constraint.defaultMessage()).toBe('CPF/CNPJ inválido.');
  });
});
