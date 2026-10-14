import type { ExtractedTransactionFields } from '../agent/extract';
import type { ClarifyReason, IntentEntity, IntentOp } from '../agent/intent';

/** "Agora" fixo: 2026-10-14 12:00 em America/Sao_Paulo. */
export const GOLDEN_NOW = new Date('2026-10-14T15:00:00.000Z');

export type IntentExpectation =
  | { kind: 'read' }
  | { kind: 'clarify'; reason: ClarifyReason }
  | { kind: 'write'; segments: Array<{ op: IntentOp; entity: IntentEntity }> };

export interface IntentCase {
  frase: string;
  esperado: IntentExpectation;
  /** Caso que revela bug real (KNOWN_BUG): o teste afirma que o resultado ainda diverge do esperado. */
  knownBug?: string;
}

export interface ExtractCase {
  frase: string;
  esperado: ExtractedTransactionFields;
  /** Campos que NÃO podem aparecer no resultado. */
  ausentes?: Array<keyof ExtractedTransactionFields>;
  knownBug?: string;
}

const w = (op: IntentOp, entity: IntentEntity): IntentExpectation => ({
  kind: 'write',
  segments: [{ op, entity }],
});
const READ: IntentExpectation = { kind: 'read' };

export const INTENT_CASES: IntentCase[] = [
  // Ativação: criar
  { frase: 'criar despesa de 50 reais no mercado', esperado: w('create', 'transaction') },
  { frase: 'Crie uma receita de R$ 3.000 salário', esperado: w('create', 'transaction') },
  { frase: 'adicionar gasto de 30 reais com uber', esperado: w('create', 'transaction') },
  { frase: 'adicione uma despesa de 120 na farmácia', esperado: w('create', 'transaction') },
  { frase: 'registrar transação de 45,90 no ifood', esperado: w('create', 'transaction') },
  { frase: 'registre uma receita de 500 reais', esperado: w('create', 'transaction') },
  { frase: 'lançar despesa de 80 reais de luz', esperado: w('create', 'transaction') },
  { frase: 'lance um gasto de 25 na padaria', esperado: w('create', 'transaction') },
  { frase: 'cadastrar uma despesa de aluguel 1500', esperado: w('create', 'transaction') },
  { frase: 'nova despesa de 60 reais em gasolina', esperado: w('create', 'transaction') },
  { frase: 'por favor, adicione uma despesa de 10 reais', esperado: w('create', 'transaction') },
  { frase: 'ADICIONAR DESPESA DE 15 REAIS', esperado: w('create', 'transaction') },
  { frase: 'criar categoria Pets', esperado: w('create', 'category') },
  { frase: 'adicionar investimento em CDB de 1000 reais', esperado: w('create', 'investment') },
  // Verbos no passado (transação implícita)
  { frase: 'gastei 50 no mercado', esperado: w('create', 'transaction') },
  { frase: 'paguei 200 de luz hoje', esperado: w('create', 'transaction') },
  { frase: 'recebi 3500 de salário', esperado: w('create', 'transaction') },
  { frase: 'comprei um tênis por 299,90', esperado: w('create', 'transaction') },
  { frase: 'ganhei 100 reais de presente', esperado: w('create', 'transaction') },
  // Alterar
  { frase: 'alterar o valor da despesa do mercado para 80', esperado: w('update', 'transaction') },
  { frase: 'altere a categoria da transação de ontem', esperado: w('update', 'transaction') },
  { frase: 'mude a categoria da última despesa para Lazer', esperado: w('update', 'transaction') },
  { frase: 'altere a categoria de Lazer para Diversão', esperado: w('update', 'category') },
  { frase: 'remover a categoria Lazer', esperado: w('delete', 'category') },
  { frase: 'mudar o responsável da despesa de luz para Maria', esperado: w('update', 'transaction') },
  { frase: 'editar a receita de salário para 4000', esperado: w('update', 'transaction') },
  { frase: 'atualize o gasto do uber para 35 reais', esperado: w('update', 'transaction') },
  { frase: 'corrigir a despesa do aluguel para 1600', esperado: w('update', 'transaction') },
  { frase: 'renomear categoria Lazer', esperado: w('update', 'category') },
  // Remover
  { frase: 'remover a despesa do mercado de ontem', esperado: w('delete', 'transaction') },
  { frase: 'exclua a transação de 50 reais', esperado: w('delete', 'transaction') },
  { frase: 'apagar o gasto do uber', esperado: w('delete', 'transaction') },
  { frase: 'deletar a receita de hoje', esperado: w('delete', 'transaction') },
  { frase: 'excluir categoria Pets', esperado: w('delete', 'category') },
  { frase: 'remova o investimento em CDB', esperado: w('delete', 'investment') },
  // Negativos: leitura
  { frase: 'quanto gastei em março?', esperado: READ },
  { frase: 'qual meu saldo?', esperado: READ },
  { frase: 'quanto eu gastei com mercado esse mês', esperado: READ },
  { frase: 'quais foram minhas maiores despesas?', esperado: READ },
  { frase: 'como estão meus investimentos?', esperado: READ },
  { frase: 'quando paguei a conta de luz?', esperado: READ },
  { frase: 'por que minhas despesas subiram?', esperado: READ },
  { frase: 'qual o total de receitas de setembro?', esperado: READ },
  { frase: 'posso gastar mais esse mês?', esperado: READ },
  { frase: 'se eu gastar 500 reais, quanto sobra?', esperado: READ },
  { frase: 'oi, quanto recebi em agosto?', esperado: READ },
  { frase: 'resumo das minhas finanças', esperado: READ },
  { frase: 'me mostre as despesas de outubro', esperado: READ },
  { frase: 'olá', esperado: READ },
  { frase: '', esperado: READ },
  { frase: '   ', esperado: READ },
  { frase: 'como faço para excluir uma despesa?', esperado: READ },
  { frase: 'estou no início do novo mês', esperado: READ },
  // Múltiplos segmentos
  {
    frase: 'gastei 50 no mercado; paguei 30 de uber',
    esperado: { kind: 'write', segments: [{ op: 'create', entity: 'transaction' }, { op: 'create', entity: 'transaction' }] },
  },
  {
    frase: 'criar despesa de 20 reais e depois remover a despesa do uber',
    esperado: { kind: 'write', segments: [{ op: 'create', entity: 'transaction' }, { op: 'delete', entity: 'transaction' }] },
  },
  {
    frase: 'recebi 1000 de freela\ngastei 40 em lanche',
    esperado: { kind: 'write', segments: [{ op: 'create', entity: 'transaction' }, { op: 'create', entity: 'transaction' }] },
  },
  {
    frase: '1) gastei 10 no café 2) gastei 20 no almoço',
    esperado: { kind: 'write', segments: [{ op: 'create', entity: 'transaction' }, { op: 'create', entity: 'transaction' }] },
  },
  {
    frase: 'alterar a despesa do mercado para 90 e também remover a despesa do uber',
    esperado: { kind: 'write', segments: [{ op: 'update', entity: 'transaction' }, { op: 'delete', entity: 'transaction' }] },
  },
  { frase: 'gastei 1; gastei 2; gastei 3; gastei 4; gastei 5; gastei 6', esperado: { kind: 'clarify', reason: 'too_many' } },
  { frase: 'gastei 50 no mercado; e o resto vai para casa', esperado: { kind: 'clarify', reason: 'missing_verb' } },
  // Clarificações
  { frase: 'criar algo de 50 reais', esperado: { kind: 'clarify', reason: 'missing_entity' } },
  { frase: 'remover todas as despesas', esperado: { kind: 'clarify', reason: 'bulk_filter' } },
  { frase: 'excluir tudo', esperado: { kind: 'clarify', reason: 'bulk_filter' } },
  { frase: 'alterar todos os gastos para 10', esperado: { kind: 'clarify', reason: 'bulk_filter' } },
];

export const EXTRACT_CASES: ExtractCase[] = [
  // Valor
  { frase: 'gastei R$ 1.234,56 no mercado', esperado: { value: 1234.56, type: 'expense' } },
  { frase: 'gastei 50 reais no mercado', esperado: { value: 50, type: 'expense' } },
  { frase: 'gastei 12,5 no café', esperado: { value: 12.5 } },
  { frase: 'paguei R$ 230,40 de luz', esperado: { value: 230.4 } },
  { frase: 'recebi R$3.000 de salário', esperado: { value: 3000, type: 'income' } },
  { frase: 'comprei um tênis por 299.90', esperado: { value: 299.9 } },
  { frase: 'paguei 100 contos de internet', esperado: { value: 100 } },
  { frase: 'criar despesa mercado', esperado: {}, ausentes: ['value'] },
  // Tipo
  { frase: 'recebi 500 de freela', esperado: { type: 'income' } },
  { frase: 'ganhei 100 de presente', esperado: { type: 'income' } },
  { frase: 'criar receita de 800 salário', esperado: { type: 'income', value: 800 } },
  { frase: 'criar despesa de 80 de luz', esperado: { type: 'expense', value: 80 } },
  { frase: 'comprei pão por 8 reais', esperado: { type: 'expense' } },
  // Datas (hoje = 2026-10-14)
  { frase: 'gastei 50 hoje no mercado', esperado: { date: '2026-10-14' } },
  { frase: 'gastei 50 ontem no mercado', esperado: { date: '2026-10-13' } },
  { frase: 'gastei 50 anteontem no mercado', esperado: { date: '2026-10-12' } },
  { frase: 'gastei 50 dia 15 no mercado', esperado: { date: '2026-10-15', value: 50 } },
  { frase: 'gastei 50 dia 3 no mercado', esperado: { date: '2026-10-03', value: 50 } },
  { frase: 'gastei 50 no mercado em 20/11/2026', esperado: { date: '2026-11-20', value: 50 } },
  { frase: 'gastei 50 no mercado em 05/12', esperado: { date: '2026-12-05', value: 50 } },
  { frase: 'despesa de 70 em 01/01/27', esperado: { date: '2027-01-01', value: 70 } },
  { frase: 'despesa de 70 em 31/02/2026', esperado: {}, ausentes: ['date'] },
  { frase: 'despesa de 70 dia 32', esperado: {}, ausentes: ['date'] },
  { frase: 'criar despesa de 70 reais no mercado', esperado: { value: 70 }, ausentes: ['date'] },
  // Pago: padrão ausente (computeMissing aplica false)
  { frase: 'criar despesa de 50 reais no mercado', esperado: {}, ausentes: ['paid'] },
  { frase: 'registre uma despesa de 40 de luz', esperado: {}, ausentes: ['paid'] },
  { frase: 'recebi 500 de freela', esperado: {}, ausentes: ['paid'] },
  { frase: 'paguei 200 de luz', esperado: { paid: true } },
  { frase: 'despesa de 90 internet, já paga', esperado: { paid: true } },
  { frase: 'despesa de 90 internet pendente', esperado: { paid: false } },
  { frase: 'despesa de 90 internet a pagar', esperado: { paid: false } },
  { frase: 'despesa de 90 internet, vence dia 20', esperado: { paid: false, date: '2026-10-20' } },
  { frase: 'despesa de 90 internet em aberto', esperado: { paid: false } },
  { frase: 'ainda não paguei a internet de 90 reais', esperado: { paid: false } },
  { frase: 'despesa de 90 internet não foi paga', esperado: { paid: false } },
  // Responsável (regressão)
  { frase: 'criar despesa de 50 mercado responsável Maria', esperado: { responsible: 'Maria', value: 50 } },
  { frase: 'criar despesa de 50 mercado resp: João Silva', esperado: { responsible: 'João Silva' } },
  { frase: 'criar despesa de 50 mercado, responsável é Ana', esperado: { responsible: 'Ana' } },
  { frase: 'despesa de 50 mercado responsável "Carlos"', esperado: { responsible: 'Carlos' } },
  { frase: 'despesa de 50 mercado responsavel Pedro', esperado: { responsible: 'Pedro' } },
  { frase: 'despesa de 50 mercado responsável Maria hoje', esperado: { responsible: 'Maria', date: '2026-10-14' } },
  { frase: 'criar despesa de 50 no mercado', esperado: {}, ausentes: ['responsible'] },
  // Título
  { frase: 'gastei 50 no mercado', esperado: { title: 'Mercado' } },
  { frase: 'paguei 200 de luz hoje', esperado: { title: 'Luz' } },
  { frase: 'criar despesa de 50 reais no mercado responsável Maria', esperado: { title: 'Mercado' } },
  // Futuro / valores com ponto de milhar
  { frase: 'despesa de 1.500 aluguel em 05/11', esperado: { value: 1500, date: '2026-11-05' } },
  { frase: 'receita de 2.000,00 em 30/12/2026', esperado: { value: 2000, date: '2026-12-30', type: 'income' } },
];
