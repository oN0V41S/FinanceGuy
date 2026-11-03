const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;
const LINE_BREAKS = /\s*[\r\n]+\s*/g;

/**
 * Neutraliza texto vindo de arquivos antes de ir ao terminal: quebras de linha viram espaço
 * e caracteres de controle (incluindo ESC, base de sequências ANSI/OSC) são removidos.
 */
export function sanitizeText(value: string): string {
  return value.replace(LINE_BREAKS, ' ').replace(CONTROL_CHARS, '');
}

/** Variante para linhas já separadas (preserva tabulação e indentação). */
export function stripControl(value: string): string {
  return value.replace(CONTROL_CHARS, '');
}
