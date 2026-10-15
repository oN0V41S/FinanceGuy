import { formatDateBR, parseBRL } from '@/shared/utils';
import { parseSearchAmount } from '@/features/transactions/hooks/useTransactions';

describe('formatDateBR', () => {
  it('converte YYYY-MM-DD em DD/MM/AAAA sem deslocar o dia', () => {
    expect(formatDateBR('2026-10-13')).toBe('13/10/2026');
    expect(formatDateBR('2026-01-01')).toBe('01/01/2026');
  });

  it('aceita ISO completo usando só a parte da data', () => {
    expect(formatDateBR('2026-12-31T23:59:59.000Z')).toBe('31/12/2026');
  });

  it('devolve o texto original quando não é uma data reconhecível', () => {
    expect(formatDateBR('')).toBe('');
    expect(formatDateBR('ontem')).toBe('ontem');
  });
});

describe('parseBRL', () => {
  it.each([
    ['300', 300],
    ['300,00', 300],
    ['R$ 5.000,00', 5000],
    ['1.234', 1234],
    ['12,5', 12.5],
    ['12.5', 12.5],
  ])('interpreta %s', (input, expected) => {
    expect(parseBRL(input)).toBe(expected);
  });

  it.each(['', 'abc', 'R$', '-5', '1,2,3x'])('retorna null para %j', (input) => {
    expect(parseBRL(input)).toBeNull();
  });

  it('parseSearchAmount segue exportado e equivalente', () => {
    expect(parseSearchAmount('R$ 5.000,00')).toBe(5000);
    expect(parseSearchAmount('mercado')).toBeNull();
  });
});
