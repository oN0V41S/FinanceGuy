import { describe, expect, it } from 'vitest';
import { tailProgress } from './tailProgress.js';

function linhas(total: number): string {
  return Array.from({ length: total }, (_, i) => `linha ${i + 1}`).join('\n');
}

describe('tailProgress', () => {
  it('dado texto vazio, então devolve lista vazia', () => {
    expect(tailProgress('')).toEqual([]);
  });

  it('dado só quebras de linha e espaços, então devolve lista vazia', () => {
    expect(tailProgress('\n  \n\t\n')).toEqual([]);
  });

  it('por padrão devolve as últimas 15 linhas', () => {
    const resultado = tailProgress(linhas(20));
    expect(resultado).toHaveLength(15);
    expect(resultado[0]).toBe('linha 6');
    expect(resultado[14]).toBe('linha 20');
  });

  it('limite: com exatamente 15 linhas devolve todas; com 16 descarta a primeira', () => {
    expect(tailProgress(linhas(15))).toHaveLength(15);
    expect(tailProgress(linhas(16))[0]).toBe('linha 2');
  });

  it('respeita o n informado', () => {
    expect(tailProgress(linhas(10), 3)).toEqual(['linha 8', 'linha 9', 'linha 10']);
  });

  it('dado menos linhas que n, então devolve todas', () => {
    expect(tailProgress(linhas(2), 5)).toEqual(['linha 1', 'linha 2']);
  });

  it('ignora linhas vazias antes de contar as últimas N', () => {
    const texto = 'a\n\n\nb\n\nc\n\n';
    expect(tailProgress(texto, 2)).toEqual(['b', 'c']);
  });

  it('aplica trimEnd em cada linha preservando a indentação à esquerda', () => {
    expect(tailProgress('  item   \nfim\t')).toEqual(['  item', 'fim']);
  });

  it('aceita fim de linha CRLF', () => {
    expect(tailProgress('a\r\nb\r\n')).toEqual(['a', 'b']);
  });
});
