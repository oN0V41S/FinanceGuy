import { computeMissing } from '../missingFields';

const full = { type: 'expense', value: 50, category: 'Alimentação', responsible: 'Ana' };

describe('computeMissing', () => {
  it('create completo aplica data e paid padrão', () => {
    const r = computeMissing('transaction', 'create', full, { today: '2026-10-14' });
    expect(r.missing).toEqual([]);
    expect(r.fields).toMatchObject({ date: '2026-10-14', paid: true });
  });

  it('mantém data e paid informados', () => {
    const r = computeMissing('transaction', 'create', { ...full, date: '2026-01-02', paid: false }, { today: '2026-10-14' });
    expect(r.fields).toMatchObject({ date: '2026-01-02', paid: false });
  });

  it('sem today calcula hoje em BRT a partir de now', () => {
    const r = computeMissing('transaction', 'create', full, { now: new Date('2026-10-15T01:00:00Z') });
    expect(r.fields.date).toBe('2026-10-14');
  });

  it('sem today nem now usa o relógio', () => {
    const r = computeMissing('transaction', 'create', full);
    expect(r.fields.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('lista tudo que falta com rótulos e exemplos', () => {
    const r = computeMissing('transaction', 'create', {}, { today: '2026-10-14' });
    expect(r.missing.map((m) => m.key)).toEqual(['type', 'value', 'category', 'responsible']);
    expect(r.missing.find((m) => m.key === 'value')).toEqual({ key: 'value', label: 'valor', example: 'R$ 50,00' });
    expect(r.missing.every((m) => m.label && m.example)).toBe(true);
  });

  it.each([0, -5, NaN, '50', null])('valor inválido %p é faltante', (value) => {
    const r = computeMissing('transaction', 'create', { ...full, value });
    expect(r.missing.map((m) => m.key)).toEqual(['value']);
  });

  it('tipo e categoria inválidos são faltantes', () => {
    const r = computeMissing('transaction', 'create', { ...full, type: 'x', category: 'Inexistente' });
    expect(r.missing.map((m) => m.key)).toEqual(['type', 'category']);
  });

  it('responsável usa padrão informado; vazio/espaços continua faltando sem padrão', () => {
    expect(computeMissing('transaction', 'create', { ...full, responsible: '' }, { defaultResponsible: ' Rafa ' }).fields.responsible).toBe('Rafa');
    expect(computeMissing('transaction', 'create', { ...full, responsible: '  ' }).missing.map((m) => m.key)).toEqual(['responsible']);
    expect(computeMissing('transaction', 'create', { ...full, responsible: '' }, { defaultResponsible: '  ' }).missing).toHaveLength(1);
  });

  it('paid nulo vira true', () => {
    expect(computeMissing('transaction', 'create', { ...full, paid: null }).fields.paid).toBe(true);
  });

  it('update exige ao menos um campo alterado', () => {
    expect(computeMissing('transaction', 'update', {}).missing.map((m) => m.key)).toEqual(['changes']);
    expect(computeMissing('transaction', 'update', { title: '  ' }).missing).toHaveLength(1);
    expect(computeMissing('transaction', 'update', { value: 80 })).toEqual({ fields: { value: 80 }, missing: [] });
  });

  it('delete e outras entidades não exigem nada', () => {
    expect(computeMissing('transaction', 'delete', {}).missing).toEqual([]);
    expect(computeMissing('investment', 'create', { a: 1 })).toEqual({ fields: { a: 1 }, missing: [] });
    expect(computeMissing('category', 'update', {}).missing).toEqual([]);
  });

  it('não muta a entrada', () => {
    const input = { ...full };
    computeMissing('transaction', 'create', input, { today: '2026-10-14' });
    expect(input).toEqual(full);
  });
});
