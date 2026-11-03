import { stripControl } from './sanitizeText.js';

const DEFAULT_LINES = 15;

/** Últimas `n` linhas não vazias do texto, com `trimEnd` (indentação à esquerda preservada). */
export function tailProgress(text: string, n: number = DEFAULT_LINES): string[] {
  if (n <= 0) return [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => stripControl(line).trimEnd())
    .filter((line) => line.length > 0);
  return lines.slice(-n);
}
