import { normalizeCode } from './code.util';

describe('normalizeCode', () => {
  it('should uppercase and strip inner spaces', () => {
    expect(normalizeCode('flt oil-001')).toBe('FLTOIL-001');
  });

  it('should trim surrounding whitespace', () => {
    expect(normalizeCode('  abc-123  ')).toBe('ABC-123');
  });

  it('should keep an already normalized code untouched', () => {
    expect(normalizeCode('ABC-123')).toBe('ABC-123');
  });
});
