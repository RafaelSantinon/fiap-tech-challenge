export function durationToSeconds(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }

  const trimmed = value.trim();
  const match = /^(\d+)\s*(s|m|h|d)?$/i.exec(trimmed);
  if (!match) {
    throw new Error(`Formato de duração inválido: "${value}"`);
  }

  const amount = parseInt(match[1], 10);
  const unit = (match[2] ?? 's').toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24,
  };

  return amount * multipliers[unit];
}
