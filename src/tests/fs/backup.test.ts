import { describe, it, expect } from 'vitest';
import { sanitiseModelName } from '../../fs/backup.ts';

describe('sanitiseModelName', () => {
  it('leaves a clean name unchanged', () => {
    expect(sanitiseModelName('TRX4m')).toBe('TRX4m');
  });

  it('replaces forward slash', () => {
    expect(sanitiseModelName('../../etc/passwd')).not.toContain('/');
  });

  it('replaces backslash', () => {
    expect(sanitiseModelName('..\\evil')).not.toContain('\\');
  });

  it('replaces consecutive dots (traversal sequences)', () => {
    expect(sanitiseModelName('..foo')).not.toContain('..');
    expect(sanitiseModelName('foo...bar')).not.toContain('...');
  });

  it('replaces null byte', () => {
    expect(sanitiseModelName('foo\0bar')).not.toContain('\0');
  });

  it('replaces other forbidden filename characters', () => {
    for (const ch of ['<', '>', ':', '"', '|', '?', '*']) {
      expect(sanitiseModelName(`foo${ch}bar`)).not.toContain(ch);
    }
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitiseModelName('  model  ')).toBe('model');
  });

  it('returns "unknown" for an empty or whitespace-only name', () => {
    expect(sanitiseModelName('')).toBe('unknown');
    expect(sanitiseModelName('   ')).toBe('unknown');
  });

  it('path traversal payload produces a safe filename segment', () => {
    const result = sanitiseModelName('../../../etc/shadow');
    expect(result).not.toContain('/');
    expect(result).not.toContain('..');
    expect(result.length).toBeGreaterThan(0);
  });

  it('all-dots name is sanitised to a non-empty safe value', () => {
    const result = sanitiseModelName('...');
    expect(result).not.toContain('..');
    expect(result.length).toBeGreaterThan(0);
  });
});
