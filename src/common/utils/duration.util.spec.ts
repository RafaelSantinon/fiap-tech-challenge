import { durationToSeconds } from './duration.util';

describe('durationToSeconds', () => {
  it.each([
    ['30s', 30],
    ['10m', 600],
    ['2h', 7200],
    ['7d', 604800],
    ['45', 45],
  ])('should convert %s to %i seconds', (input, expected) => {
    expect(durationToSeconds(input)).toBe(expected);
  });

  it('should accept a plain number', () => {
    expect(durationToSeconds(120)).toBe(120);
  });

  it('should throw on an invalid format', () => {
    expect(() => durationToSeconds('abc')).toThrow();
    expect(() => durationToSeconds('10x')).toThrow();
  });
});
