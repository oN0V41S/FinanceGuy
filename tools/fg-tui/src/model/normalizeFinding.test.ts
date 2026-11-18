import { describe, expect, it } from 'vitest';
import { normalizeFinding } from './normalizeFinding.js';

describe('normalizeFinding', () => {
  it('dado chaves em pt-BR, então normaliza para o contrato Finding', () => {
    const finding = normalizeFinding({
      severidade: 'alto',
      arquivo: 'src/a.ts',
      linha: 12,
      descrição: 'Falta validação',
    });
    expect(finding).toEqual({
      severity: 'alto',
      file: 'src/a.ts',
      line: 12,
      description: 'Falta validação',
    });
  });

  it('dado chaves em inglês, então normaliza para o contrato Finding', () => {
    const finding = normalizeFinding({
      severity: 'baixo',
      file: 'src/b.ts',
      line: 7,
      description: 'Nome pouco claro',
    });
    expect(finding).toEqual({
      severity: 'baixo',
      file: 'src/b.ts',
      line: 7,
      description: 'Nome pouco claro',
    });
  });

  it.each(['critico', 'alto', 'medio', 'baixo'] as const)('preserva a severidade conhecida %s', (severity) => {
    expect(normalizeFinding({ severity, description: 'x' }).severity).toBe(severity);
  });

  it('dado severidade desconhecida, então vira desconhecido', () => {
    expect(normalizeFinding({ severity: 'catastrófico', description: 'x' }).severity).toBe('desconhecido');
  });

  it('dado severidade ausente, então vira desconhecido', () => {
    expect(normalizeFinding({ description: 'x' }).severity).toBe('desconhecido');
  });

  it('dado severidade com tipo errado (número), então vira desconhecido sem lançar', () => {
    expect(normalizeFinding({ severity: 3, description: 'x' }).severity).toBe('desconhecido');
  });

  it('dado arquivo e linha ausentes, então ficam null', () => {
    const finding = normalizeFinding({ severity: 'medio', description: 'geral' });
    expect(finding.file).toBeNull();
    expect(finding.line).toBeNull();
  });

  it('dado linha não numérica, então line fica null', () => {
    expect(normalizeFinding({ severity: 'medio', line: 'doze', description: 'x' }).line).toBeNull();
  });

  it('dado objeto vazio, então não lança', () => {
    expect(() => normalizeFinding({})).not.toThrow();
  });
});

describe('normalizeFinding sanitização', () => {
  it('remove controles e quebras de linha de arquivo e descrição', () => {
    const f = normalizeFinding({ file: 'a\u001b[2J.ts', description: 'x\ny\u0007' });
    expect(f.file).toBe('a[2J.ts');
    expect(f.description).toBe('x y');
  });
});
