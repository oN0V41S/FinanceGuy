import { classifyIntent } from '../../intent';
import { extractTransactionFields } from '../../extract';
import { computeMissing } from '../../missingFields';
import { EXTRACT_CASES, GOLDEN_NOW, INTENT_CASES, type IntentCase } from '../../../__fixtures__/agentGoldenPhrases';

function summarize(c: IntentCase) {
  const intent = classifyIntent(c.frase);
  if (intent.kind === 'write') {
    return { kind: 'write', segments: intent.segments.map((s) => ({ op: s.op, entity: s.entity })) };
  }
  if (intent.kind === 'clarify') return { kind: 'clarify', reason: intent.reason };
  return { kind: 'read' };
}

const extractFields = (text: string, now: Date): Record<string, unknown> =>
  extractTransactionFields(text, now) as unknown as Record<string, unknown>;

describe('golden: classifyIntent', () => {
  test.each(INTENT_CASES.filter((c) => !c.knownBug).map((c) => [c.frase, c] as const))('%j', (_f, c) => {
    expect(summarize(c)).toEqual(c.esperado);
  });

  // KNOWN_BUG: o resultado ainda diverge do esperado; remova knownBug ao corrigir.
  for (const c of INTENT_CASES.filter((x) => x.knownBug)) {
    it(`${JSON.stringify(c.frase)} (KNOWN_BUG: ${c.knownBug})`, () => {
      expect(summarize(c)).not.toEqual(c.esperado);
    });
  }
});

describe('golden: extractTransactionFields', () => {
  test.each(EXTRACT_CASES.filter((c) => !c.knownBug).map((c) => [c.frase, c] as const))('%j', (_f, c) => {
    const fields = extractTransactionFields(c.frase, GOLDEN_NOW);
    expect(fields).toMatchObject(c.esperado);
    for (const key of c.ausentes ?? []) expect(fields).not.toHaveProperty(key);
  });

  for (const c of EXTRACT_CASES.filter((x) => x.knownBug)) {
    it(`${JSON.stringify(c.frase)} (KNOWN_BUG: ${c.knownBug})`, () => {
      expect(extractTransactionFields(c.frase, GOLDEN_NOW)).not.toMatchObject(c.esperado);
    });
  }
});

describe('golden: padrões de computeMissing (regressão paid=Não)', () => {
  test.each([
    ['criar despesa de 50 reais no mercado', false],
    ['gastei 50 no mercado', false],
    ['paguei 50 no mercado', true],
    ['despesa de 50 mercado pendente', false],
  ])('%j -> paid=%s', (frase, paid) => {
    const fields = extractFields(frase, GOLDEN_NOW);
    const { fields: out } = computeMissing('transaction', 'create', fields, { now: GOLDEN_NOW });
    expect(out.paid).toBe(paid);
  });

  it('data padrão é hoje (BRT) e responsável ausente é pedido', () => {
    const { fields, missing } = computeMissing(
      'transaction',
      'create',
      extractFields('criar despesa de 50 reais no mercado', GOLDEN_NOW),
      { now: GOLDEN_NOW },
    );
    expect(fields.date).toBe('2026-10-14');
    expect(missing.map((m) => m.key)).toContain('responsible');
  });

  it('responsável informado não é pedido', () => {
    const { missing } = computeMissing(
      'transaction',
      'create',
      extractFields('criar despesa de 50 mercado responsável Maria', GOLDEN_NOW),
      { now: GOLDEN_NOW },
    );
    expect(missing.map((m) => m.key)).not.toContain('responsible');
  });
});
