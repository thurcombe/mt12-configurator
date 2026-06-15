import { describe, it, expect } from 'vitest';
import { assertSafeSegments } from '../../fs/sdcard.ts';

describe('assertSafeSegments', () => {
  it('accepts normal path segments', () => {
    expect(() => assertSafeSegments(['BACKUP', 'TRX4m-2026-06-15T10-00-00.yml'])).not.toThrow();
    expect(() => assertSafeSegments(['MODELS'])).not.toThrow();
  });

  it('rejects empty segment', () => {
    expect(() => assertSafeSegments([''])).toThrow();
    expect(() => assertSafeSegments(['BACKUP', ''])).toThrow();
  });

  it('rejects "." segment', () => {
    expect(() => assertSafeSegments(['.'])).toThrow();
    expect(() => assertSafeSegments(['BACKUP', '.'])).toThrow();
  });

  it('rejects ".." segment', () => {
    expect(() => assertSafeSegments(['..'])).toThrow();
    expect(() => assertSafeSegments(['BACKUP', '..', 'etc'])).toThrow();
  });

  it('rejects segment containing a null byte', () => {
    expect(() => assertSafeSegments(['foo\0bar'])).toThrow();
  });

  it('accepts an empty segments array without throwing', () => {
    expect(() => assertSafeSegments([])).not.toThrow();
  });
});
