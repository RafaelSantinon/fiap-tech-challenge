const PLATE_PATTERN = /^[A-Z]{3}\d[0-9A-J]\d{2}$/;

export function normalizePlate(value: string): string {
  return value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
}

export function isValidPlate(value: string): boolean {
  return PLATE_PATTERN.test(normalizePlate(value));
}
