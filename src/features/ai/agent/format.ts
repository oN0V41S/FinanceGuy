/** Formatadores locais do agente (PT-BR). Sem `new Date('YYYY-MM-DD')` (evita recuar um dia por fuso). */

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** "R$ 1.234,50" (espaço comum no lugar do NBSP, para texto previsível). */
export function formatBRL(value: number): string {
  return BRL.format(value).replace(/ /g, ' ');
}

/** "2026-10-14" -> "14/10/2026". Entrada fora do formato volta como veio. */
export function formatDateBR(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ymd;
}
