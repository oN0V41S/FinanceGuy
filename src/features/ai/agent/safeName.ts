const CREDENTIAL_WORDS = /\b(pass|passwd|password|senha|pwd|token|secret|segredo|api[-_ ]?key)\b/i;
const MAX_NAME_LENGTH = 50;
const MAX_NAME_WORDS = 5;

/**
 * Indica se um texto parece credencial (senha, token, chave) em vez de um nome de pessoa.
 * O responsável padrão vem de campos livres do perfil; nunca pode expor segredo num card.
 */
export function looksLikeCredential(value: string): boolean {
  const text = value.trim();
  if (!text) return false;
  if (CREDENTIAL_WORDS.test(text)) return true;
  if (text.length > MAX_NAME_LENGTH || text.split(/\s+/).length > MAX_NAME_WORDS) return true;
  // Nome de pessoa não tem dígitos nem símbolos como "@" ou "#" ("Admin01@", "senha123").
  return /\d/.test(text) || /[^\p{L}\s'.-]/u.test(text);
}

/** Primeiro candidato utilizável como nome do responsável; ignora vazios e valores com cara de credencial. */
export function pickSafeResponsible(...candidates: Array<string | null | undefined>): string | undefined {
  for (const c of candidates) {
    const text = c?.trim();
    if (text && !looksLikeCredential(text)) return text;
  }
  return undefined;
}
