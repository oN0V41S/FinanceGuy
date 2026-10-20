import { GeminiLlmProvider } from '../gemini.provider';
import { AiUpstreamError } from '../errors';
import type { AiConfig, LlmRequest } from '../types';

const CONFIG: AiConfig = {
  apiKey: 'KEY',
  model: 'modelo-teste',
  timeoutMs: 1000,
  maxOutputTokens: 100,
  rateLimitPerMinute: 10,
  rateLimitWindowSeconds: 60,
  rateLimitPerDay: 50,
};

const TOOL = {
  name: 'create_transaction',
  description: 'Cria transação',
  parameters: { type: 'object', properties: { value: { type: 'number' } } },
};

const REQUEST: LlmRequest = {
  system: 'S',
  messages: [{ role: 'user', content: 'oi' }],
  tools: [TOOL],
  toolChoice: { mode: 'any', allowedNames: ['create_transaction'] },
};

function setup(response: unknown) {
  const generateContent = jest.fn().mockResolvedValue(response);
  const provider = new GeminiLlmProvider({
    getConfig: () => CONFIG,
    clientFactory: () => ({ models: { generateContent } }),
  });
  return { provider, generateContent };
}

describe('GeminiLlmProvider — tools', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('mapeia tools, toolChoice e desliga automaticFunctionCalling', async () => {
    const { provider, generateContent } = setup({
      text: undefined,
      functionCalls: [{ name: 'create_transaction', args: { value: 10 } }],
      candidates: [{ finishReason: 'STOP' }],
    });
    await provider.complete(REQUEST);
    const config = generateContent.mock.calls[0][0].config;
    expect(config.tools).toEqual([
      {
        functionDeclarations: [
          { name: 'create_transaction', description: 'Cria transação', parametersJsonSchema: TOOL.parameters },
        ],
      },
    ]);
    expect(config.toolConfig).toEqual({
      functionCallingConfig: {
        mode: 'ANY',
        allowedFunctionNames: ['create_transaction'],
      },
    });
    expect(config.automaticFunctionCalling).toEqual({ disable: true });
  });

  it('toolChoice none mapeia para NONE', async () => {
    const { provider, generateContent } = setup({ text: 'ok', candidates: [{ finishReason: 'STOP' }] });
    await provider.complete({ ...REQUEST, toolChoice: { mode: 'none' } });
    const config = generateContent.mock.calls[0][0].config;
    expect(config.toolConfig.functionCallingConfig.mode).toBe('NONE');
    expect(config.toolConfig.functionCallingConfig.allowedFunctionNames).toBeUndefined();
  });

  it('sem tools não envia tools/toolConfig/automaticFunctionCalling', async () => {
    const { provider, generateContent } = setup({ text: 'ok', candidates: [{ finishReason: 'STOP' }] });
    await provider.complete({ system: 'S', messages: REQUEST.messages });
    const config = generateContent.mock.calls[0][0].config;
    expect(config.tools).toBeUndefined();
    expect(config.toolConfig).toBeUndefined();
    expect(config.automaticFunctionCalling).toBeUndefined();
  });

  it('parseia functionCalls em toolCalls e não lança com texto vazio', async () => {
    const { provider } = setup({
      text: '',
      functionCalls: [{ name: 'create_transaction', args: { value: 10 } }],
      candidates: [{ finishReason: 'STOP' }],
    });
    const res = await provider.complete(REQUEST);
    expect(res.toolCalls).toEqual([{ name: 'create_transaction', args: { value: 10 } }]);
    expect(res.text).toBe('');
  });

  it('ignora functionCalls malformadas; args ausente vira {}', async () => {
    const { provider } = setup({
      text: 'texto',
      functionCalls: [{ args: {} }, { name: 42 }, null, { name: 'a' }],
      candidates: [{ finishReason: 'STOP' }],
    });
    const res = await provider.complete(REQUEST);
    expect(res.toolCalls).toEqual([{ name: 'a', args: {} }]);
  });

  it('texto vazio sem tool call válida continua sendo AiUpstreamError', async () => {
    const { provider } = setup({
      text: '',
      functionCalls: [{ args: {} }],
      candidates: [{ finishReason: 'STOP' }],
    });
    await expect(provider.complete(REQUEST)).rejects.toBeInstanceOf(AiUpstreamError);
  });

  it('resposta sem toolCalls não define a propriedade', async () => {
    const { provider } = setup({ text: 'ok', candidates: [{ finishReason: 'STOP' }] });
    const res = await provider.complete({ system: 'S', messages: REQUEST.messages });
    expect(res).not.toHaveProperty('toolCalls');
  });
});
