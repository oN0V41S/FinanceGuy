import { CategorySuggester, CATEGORY_MAX_INPUT_CHARS } from '../categorySuggester';
import type { ILlmProvider, IRateLimiter } from '../../types';

function setup(text: string | Error, allowed = true) {
  const llm: jest.Mocked<ILlmProvider> = {
    complete:
      text instanceof Error
        ? jest.fn().mockRejectedValue(text)
        : jest.fn().mockResolvedValue({ text, stopReason: 'stop' }),
  };
  const rateLimiter: jest.Mocked<IRateLimiter> = {
    consume: jest.fn().mockResolvedValue(allowed ? { allowed: true } : { allowed: false, scope: 'minute', retryAfterSeconds: 5 }),
  };
  return { llm, rateLimiter, suggester: new CategorySuggester({ llm, rateLimiter, model: 'small-model' }) };
}

describe('CategorySuggester', () => {
  it('usa palavra-chave sem chamar o LLM (0 tokens)', async () => {
    const { suggester, llm, rateLimiter } = setup('Lazer');
    await expect(suggester.suggest('u1', 'Uber para o trabalho')).resolves.toBe('Transporte');
    expect(llm.complete).not.toHaveBeenCalled();
    expect(rateLimiter.consume).not.toHaveBeenCalled();
  });

  it('sem pista, chama o menor modelo com prompt compacto e valida a resposta', async () => {
    const { suggester, llm } = setup(' lazer.\n');
    await expect(suggester.suggest('u1', 'x'.repeat(500))).resolves.toBe('Lazer');
    const req = llm.complete.mock.calls[0][0];
    expect(req.model).toBe('small-model');
    expect(req.maxOutputTokens).toBeLessThanOrEqual(16);
    expect(req.messages).toHaveLength(1);
    expect(req.messages[0].content.length).toBeLessThanOrEqual(CATEGORY_MAX_INPUT_CHARS);
    expect(req.system.length).toBeLessThan(400);
  });

  it('resposta fora do enum vira undefined', async () => {
    const { suggester } = setup('Pets');
    await expect(suggester.suggest('u1', 'ração do totó')).resolves.toBeUndefined();
  });

  it('falha do LLM vira undefined', async () => {
    const { suggester } = setup(new Error('boom'));
    await expect(suggester.suggest('u1', 'coisa qualquer')).resolves.toBeUndefined();
  });

  it('sem cota não chama o LLM e retorna undefined', async () => {
    const { suggester, llm } = setup('Lazer', false);
    await expect(suggester.suggest('u1', 'coisa qualquer')).resolves.toBeUndefined();
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('texto vazio retorna undefined sem LLM', async () => {
    const { suggester, llm } = setup('Lazer');
    await expect(suggester.suggest('u1', '   ')).resolves.toBeUndefined();
    expect(llm.complete).not.toHaveBeenCalled();
  });
});
