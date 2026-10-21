import { wantsPortfolio } from '../portfolioIntent';

describe('wantsPortfolio', () => {
  it.each([
    'Como está minha carteira?',
    'quanto investi este ano?',
    'quanto guardar todo mês para aposentadoria?',
    'previdência privada vale a pena?',
    'quanto tenho em renda fixa?',
    'renda variável subiu?',
    'quanto recebo de renda passiva?',
    'montei a reserva de emergência?',
    'como estão minhas ações?',
    'vale a pena meus FIIs?',
    'quanto tenho em cripto?',
    'devo aportar mais este mês?',
    'meus rendimentos caíram?',
    'qual é o meu patrimônio total?',
  ])('verdadeira para %s', (question) => {
    expect(wantsPortfolio(question)).toBe(true);
  });

  it.each([
    'quanto gastei com mercado?',
    'qual foi meu saldo em julho?',
    'como faço um bolo de cenoura?',
    'quanto gastei com transporte no mês passado?',
    'confiido no banco',
    '',
  ])('falsa para %p', (question) => {
    expect(wantsPortfolio(question)).toBe(false);
  });

  it('ignora caixa e acentos', () => {
    expect(wantsPortfolio('QUANTO TENHO EM RENDA VARIÁVEL?')).toBe(true);
    expect(wantsPortfolio('Como está o PATRIMÔNIO?')).toBe(true);
  });
});
