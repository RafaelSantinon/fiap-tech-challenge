import { DocumentType } from '../enums/document-type.enum';
import {
  isValidCnpj,
  isValidCpf,
  isValidDocument,
  normalizeDocument,
  resolveDocumentType,
} from './document.util';

describe('normalizeDocument', () => {
  it('should keep only digits', () => {
    expect(normalizeDocument('529.982.247-25')).toBe('52998224725');
    expect(normalizeDocument('11.222.333/0001-81')).toBe('11222333000181');
  });
});

describe('isValidCpf', () => {
  it.each(['52998224725', '12345678909', '529.982.247-25'])(
    'should accept %s',
    (input) => {
      expect(isValidCpf(input)).toBe(true);
    },
  );

  it('should reject a wrong check digit', () => {
    expect(isValidCpf('52998224724')).toBe(false);
  });

  it('should reject a repeated digit sequence', () => {
    expect(isValidCpf('11111111111')).toBe(false);
  });

  it('should reject a wrong length', () => {
    expect(isValidCpf('5299822472')).toBe(false);
  });
});

describe('isValidCnpj', () => {
  it.each(['11222333000181', '06990590000123', '11.222.333/0001-81'])(
    'should accept %s',
    (input) => {
      expect(isValidCnpj(input)).toBe(true);
    },
  );

  it('should reject a wrong check digit', () => {
    expect(isValidCnpj('11222333000180')).toBe(false);
  });

  it('should reject a repeated digit sequence', () => {
    expect(isValidCnpj('00000000000000')).toBe(false);
  });

  it('should reject a wrong length', () => {
    expect(isValidCnpj('1122233300018')).toBe(false);
  });
});

describe('isValidDocument', () => {
  it('should accept both a CPF and a CNPJ', () => {
    expect(isValidDocument('529.982.247-25')).toBe(true);
    expect(isValidDocument('11.222.333/0001-81')).toBe(true);
  });

  it('should reject a value that is neither a CPF nor a CNPJ', () => {
    expect(isValidDocument('123')).toBe(false);
    expect(isValidDocument('')).toBe(false);
  });
});

describe('resolveDocumentType', () => {
  it('should resolve a CPF', () => {
    expect(resolveDocumentType('529.982.247-25')).toBe(DocumentType.CPF);
  });

  it('should resolve a CNPJ', () => {
    expect(resolveDocumentType('11.222.333/0001-81')).toBe(DocumentType.CNPJ);
  });

  it('should throw on an unsupported length', () => {
    expect(() => resolveDocumentType('123')).toThrow();
  });
});
