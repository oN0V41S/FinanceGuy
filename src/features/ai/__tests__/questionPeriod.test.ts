import { resolveQuestionPeriod } from '../questionPeriod';

const NOW = new Date('2026-10-15T15:00:00Z');

describe('resolveQuestionPeriod', () => {
  it('retorna null quando a pergunta não cita período', () => {
    expect(resolveQuestionPeriod('quanto gastei com mercado?', NOW)).toBeNull();
  });

  it.each([
    ['quanto gastei em janeiro de 2025?', ['2025-01', '2025-01']],
    ['gastos de mar/2024', ['2024-03', '2024-03']],
    ['resumo de 03/2025', ['2025-03', '2025-03']],
    ['transações de 12/07/2025', ['2025-07', '2025-07']],
    ['quanto ganhei em 2025?', ['2025-01', '2025-12']],
    ['e no ano passado?', ['2025-01', '2025-12']],
    ['gastos deste ano', ['2026-01', '2026-12']],
    ['quanto vou gastar em dezembro de 2026?', ['2026-12', '2026-12']],
    ['e em 2027?', ['2027-01', '2027-12']],
    ['e no mês passado?', ['2026-09', '2026-09']],
    ['últimos 12 meses', ['2025-11', '2026-10']],
    ['há 8 meses atrás', ['2026-02', '2026-02']],
    ['de março a maio de 2025', ['2025-03', '2025-05']],
  ])('%s', (q, [start, end]) => {
    expect(resolveQuestionPeriod(q, NOW)).toEqual({ startMonth: start, endMonth: end });
  });

  it('mês sem ano assume o mais recente já ocorrido', () => {
    expect(resolveQuestionPeriod('gastos em março', NOW)).toEqual({ startMonth: '2026-03', endMonth: '2026-03' });
    expect(resolveQuestionPeriod('gastos em dezembro', NOW)).toEqual({ startMonth: '2025-12', endMonth: '2025-12' });
  });

  it('limita a 36 meses', () => {
    const p = resolveQuestionPeriod('últimos 100 meses', NOW)!;
    expect(p.endMonth).toBe('2026-10');
    expect(p.startMonth).toBe('2023-11');
  });

  it('ignora anos fora do intervalo plausível', () => {
    expect(resolveQuestionPeriod('o ano 1850', NOW)).toBeNull();
  });
});
