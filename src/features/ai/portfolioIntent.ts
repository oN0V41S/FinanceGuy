const normalize = (question: string): string =>
  question
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/**
 * Termos da carteira (FING-27 §2.4), sem acento/caixa. Substrings de propósito:
 * "aport" cobre aportar/aporte/aportes, "invest" cobre investir/investimento.
 * `\bfii` usa borda à esquerda para não casar em palavras como "confiido".
 */
const PORTFOLIO_TERMS =
  /invest|carteira|aposent|previdenc|renda\s+fixa|renda\s+variavel|renda\s+passiva|reserva|acoes|\bfii|cripto|aport|rendimento|patrimonio/;

/**
 * Detecta (sem LLM) se a pergunta trata da carteira de investimentos.
 * Decide se o contexto financeiro ganha a seção `portfolioByCategory` e se o
 * cache de contexto deve ser ignorado (a seção varia por pergunta).
 */
export function wantsPortfolio(question: string): boolean {
  if (!question) return false;
  return PORTFOLIO_TERMS.test(normalize(question));
}
