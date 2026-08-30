export function normalizeCode(value: string): string {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}
