import { normalize, sanitizeText } from '../text';

describe('text', () => {
  it('normalize remove acentos e baixa caixa', () => {
    expect(normalize('LANÇAR Ação')).toBe('lancar acao');
  });

  it('sanitizeText remove controles e colapsa espaços', () => {
    expect(sanitizeText('  a\u0000b\n\tc   d\u007f ')).toBe('a b c d');
  });
});
