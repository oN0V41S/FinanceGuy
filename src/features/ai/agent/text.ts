/** Utilitários puros de texto compartilhados pelos módulos do agente (sem dependências). */

/** Minúsculas e sem acentos (comprimento pode mudar; use só para casar padrões). */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Remove caracteres de controle e colapsa espaços. */
export function sanitizeText(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim();
}
