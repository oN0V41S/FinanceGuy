import { describe, expect, it } from 'vitest';
import { sanitizeText } from './sanitizeText.js';

describe('sanitizeText', () => {
  it('remove sequências ANSI (ESC)', () => {
    expect(sanitizeText('a\u001b[2Jb')).toBe('a[2Jb');
  });

  it('remove OSC e BEL', () => {
    expect(sanitizeText('\u001b]0;x\u0007ok')).toBe(']0;xok');
  });

  it('remove controles C1', () => {
    expect(sanitizeText('a\u009bb')).toBe('ab');
  });

  it('colapsa quebras de linha em espaço', () => {
    expect(sanitizeText('a\r\nb\nc')).toBe('a b c');
  });

  it('preserva texto comum e acentos', () => {
    expect(sanitizeText('Implementação')).toBe('Implementação');
  });
});
