import { CategoryEnum } from '@/features/transactions/validations';
import { suggestCategory } from '../categoryHints';

describe('suggestCategory', () => {
  it.each([
    ['compras no mercado', 'Alimentação'],
    ['Almoço no restaurante', 'Alimentação'],
    ['uber para o trabalho', 'Transporte'],
    ['gasolina', 'Transporte'],
    ['farmácia', 'Saúde'],
    ['consulta no dentista', 'Saúde'],
    ['mensalidade da faculdade', 'Educação'],
    ['cinema com amigos', 'Lazer'],
    ['aluguel de outubro', 'Casa'],
    ['conta de LUZ', 'Casa'],
    ['recebi salário', 'Salário'],
    ['aporte no tesouro', 'Investimentos'],
  ])('"%s" -> %s', (text, expected) => {
    expect(suggestCategory(text)).toBe(expected);
  });

  it('retorna undefined sem pista', () => {
    expect(suggestCategory('coisa qualquer')).toBeUndefined();
    expect(suggestCategory('')).toBeUndefined();
  });

  it('não casa por substring (gas vs gasolina é tratado por palavra)', () => {
    expect(suggestCategory('barata')).toBeUndefined();
  });

  it('só retorna valores do CategoryEnum', () => {
    for (const w of ['mercado', 'uber', 'farmacia', 'curso', 'netflix', 'iptu', 'salario', 'cdb']) {
      expect(CategoryEnum.options).toContain(suggestCategory(w));
    }
  });
});
