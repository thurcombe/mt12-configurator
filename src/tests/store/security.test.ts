import { describe, it, expect } from 'vitest';
import { assertValidModelKey, safeImageExt } from '../../store/useEditorStore.ts';

describe('assertValidModelKey', () => {
  it('accepts valid model keys', () => {
    expect(() => assertValidModelKey('model00')).not.toThrow();
    expect(() => assertValidModelKey('model99')).not.toThrow();
    expect(() => assertValidModelKey('model123')).not.toThrow();
  });

  it('rejects path traversal in key', () => {
    expect(() => assertValidModelKey('../model00')).toThrow();
    expect(() => assertValidModelKey('../../etc/passwd')).toThrow();
  });

  it('rejects keys without the model prefix', () => {
    expect(() => assertValidModelKey('radio')).toThrow();
    expect(() => assertValidModelKey('MODELS/model00')).toThrow();
    expect(() => assertValidModelKey('')).toThrow();
  });

  it('rejects keys with wrong casing', () => {
    expect(() => assertValidModelKey('MODEL00')).toThrow();
    expect(() => assertValidModelKey('Model00')).toThrow();
  });

  it('rejects keys with non-digit suffix', () => {
    expect(() => assertValidModelKey('model0a')).toThrow();
    expect(() => assertValidModelKey('model')).toThrow();
  });
});

describe('safeImageExt', () => {
  it('returns the extension for allowed types', () => {
    expect(safeImageExt('photo.png')).toBe('.png');
    expect(safeImageExt('photo.jpg')).toBe('.jpg');
    expect(safeImageExt('photo.jpeg')).toBe('.jpeg');
    expect(safeImageExt('photo.bmp')).toBe('.bmp');
    expect(safeImageExt('photo.gif')).toBe('.gif');
    expect(safeImageExt('photo.webp')).toBe('.webp');
  });

  it('normalises extension to lowercase', () => {
    expect(safeImageExt('photo.PNG')).toBe('.png');
    expect(safeImageExt('photo.JPG')).toBe('.jpg');
  });

  it('falls back to .png for disallowed extensions', () => {
    expect(safeImageExt('evil.php')).toBe('.png');
    expect(safeImageExt('evil.exe')).toBe('.png');
    expect(safeImageExt('evil.html')).toBe('.png');
    expect(safeImageExt('evil.svg')).toBe('.png');
  });

  it('falls back to .png when there is no extension', () => {
    expect(safeImageExt('noextension')).toBe('.png');
    expect(safeImageExt('')).toBe('.png');
  });

  it('handles path traversal in filename gracefully', () => {
    expect(safeImageExt('../evil.php')).toBe('.png');
    expect(safeImageExt('../photo.png')).toBe('.png');
  });

  it('uses the last extension for double-extension filenames', () => {
    // evil.php.png → extension is .png (allowed)
    expect(safeImageExt('evil.php.png')).toBe('.png');
    // evil.png.php → extension is .php (blocked)
    expect(safeImageExt('evil.png.php')).toBe('.png');
  });

  it('falls back to .png for a trailing-dot filename', () => {
    expect(safeImageExt('file.')).toBe('.png');
  });
});
