import { CategoryEnum } from '@/features/transactions/validations';
import { normalize } from './text';

type Category = (typeof CategoryEnum.options)[number];

const KEYWORDS: Array<[Category, string[]]> = [
  ['Salário', ['salario', 'holerite', 'contracheque', '13o', 'decimo terceiro']],
  ['Investimentos', ['investimento', 'investimentos', 'aplicacao', 'dividendo', 'dividendos', 'tesouro', 'cdb', 'fii', 'acoes']],
  ['Alimentação', [
    'mercado', 'supermercado', 'padaria', 'restaurante', 'lanche', 'ifood', 'comida', 'almoco',
    'jantar', 'cafe', 'feira', 'acougue', 'pizza', 'hamburguer', 'sorvete', 'refeicao',
  ]],
  ['Transporte', [
    'uber', '99', 'taxi', 'onibus', 'gasolina', 'combustivel', 'metro', 'estacionamento',
    'pedagio', 'passagem', 'carro', 'moto', 'mecanico',
  ]],
  ['Saúde', ['farmacia', 'remedio', 'remedios', 'medico', 'consulta', 'dentista', 'plano de saude', 'exame', 'hospital']],
  ['Educação', ['escola', 'faculdade', 'curso', 'mensalidade', 'livro', 'livros', 'matricula']],
  ['Lazer', ['cinema', 'netflix', 'spotify', 'show', 'viagem', 'bar', 'festa', 'jogo', 'streaming', 'passeio', 'academia']],
  ['Casa', [
    'aluguel', 'condominio', 'luz', 'energia', 'agua', 'internet', 'gas', 'iptu', 'reforma',
    'moveis', 'limpeza', 'faxina',
  ]],
];

const COMPILED: Array<[Category, RegExp]> = KEYWORDS.map(([category, words]) => [
  category,
  new RegExp(`\\b(?:${words.join('|')})\\b`),
]);

/** Sugere uma categoria existente por palavra-chave (sem acento); undefined se não houver pista. */
export function suggestCategory(text: string): string | undefined {
  const norm = normalize(text);
  for (const [category, regex] of COMPILED) {
    if (regex.test(norm)) return category;
  }
  return undefined;
}
