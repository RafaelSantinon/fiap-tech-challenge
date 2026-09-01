import { DocumentType } from '../enums/document-type.enum';

const CPF_LENGTH = 11;
const CNPJ_LENGTH = 14;
const CPF_FIRST_WEIGHTS = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const CPF_SECOND_WEIGHTS = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function normalizeDocument(value: string): string {
  return value.replace(/\D/g, '');
}

function hasSingleRepeatedDigit(digits: string): boolean {
  return new Set(digits).size === 1;
}

function checkDigit(digits: string, weights: number[]): number {
  const sum = weights.reduce(
    (total, weight, index) => total + Number(digits[index]) * weight,
    0,
  );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCpf(value: string): boolean {
  const digits = normalizeDocument(value);
  if (digits.length !== CPF_LENGTH || hasSingleRepeatedDigit(digits)) {
    return false;
  }
  return (
    checkDigit(digits, CPF_FIRST_WEIGHTS) === Number(digits[9]) &&
    checkDigit(digits, CPF_SECOND_WEIGHTS) === Number(digits[10])
  );
}

export function isValidCnpj(value: string): boolean {
  const digits = normalizeDocument(value);
  if (digits.length !== CNPJ_LENGTH || hasSingleRepeatedDigit(digits)) {
    return false;
  }
  return (
    checkDigit(digits, CNPJ_FIRST_WEIGHTS) === Number(digits[12]) &&
    checkDigit(digits, CNPJ_SECOND_WEIGHTS) === Number(digits[13])
  );
}

export function isValidDocument(value: string): boolean {
  const digits = normalizeDocument(value);
  if (digits.length === CPF_LENGTH) {
    return isValidCpf(digits);
  }
  if (digits.length === CNPJ_LENGTH) {
    return isValidCnpj(digits);
  }
  return false;
}

export function resolveDocumentType(value: string): DocumentType {
  const digits = normalizeDocument(value);
  if (digits.length === CPF_LENGTH) {
    return DocumentType.CPF;
  }
  if (digits.length === CNPJ_LENGTH) {
    return DocumentType.CNPJ;
  }
  throw new Error(`Documento inválido: "${value}"`);
}
