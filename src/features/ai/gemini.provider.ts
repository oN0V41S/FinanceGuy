import type { FunctionCallingConfigMode, GenerateContentConfig, GenerateContentParameters, GenerateContentResponse, ThinkingConfig } from '@google/genai';
import { getAiConfig } from './config';
import {
  AiBusyError,
  AiConnectionError,
  AiRefusalError,
  AiTimeoutError,
  AiUnavailableError,
  AiUpstreamError,
} from './errors';
import type { AiConfig, ILlmProvider, LlmRequest, LlmResponse, LlmToolCall } from './types';

/** Subconjunto do cliente do SDK usado aqui (permite cliente fake nos testes). */
export interface GenAiClientLike {
  models: {
    generateContent(params: GenerateContentParameters): Promise<GenerateContentResponse>;
  };
}

export type GenAiClientFactory = (apiKey: string) => GenAiClientLike | Promise<GenAiClientLike>;

export interface GeminiProviderOptions {
  getConfig?: () => AiConfig;
  clientFactory?: GenAiClientFactory;
}

/** Tentativas por chamada (inclui a inicial). O SDK usa 5 por padrão: limitamos para respeitar maxDuration. */
const MAX_ATTEMPTS = 1;
/** Orçamento total (ms) para percorrer a cadeia de modelos; abaixo de maxDuration=60s da rota. */
const TOTAL_BUDGET_MS = 50000;
const TEMPERATURE = 0.3;
const REFUSAL_FINISH_REASONS = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'IMAGE_SAFETY']);
const NETWORK_ERROR_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT']);

const defaultClientFactory: GenAiClientFactory = async (apiKey) => {
  const { GoogleGenAI } = await import('@google/genai');
  return new GoogleGenAI({ apiKey });
};

/** Série 3.x usa thinkingLevel; 2.x usa thinkingBudget (0 = desligado). Thinking consome maxOutputTokens. */
function buildThinkingConfig(model: string): ThinkingConfig {
  if (/^gemini-2\./.test(model)) return { thinkingBudget: 0 };
  return { thinkingLevel: 'LOW' as ThinkingConfig['thinkingLevel'] };
}

export class GeminiLlmProvider implements ILlmProvider {
  private readonly getConfig: () => AiConfig;
  private readonly clientFactory: GenAiClientFactory;
  private client: GenAiClientLike | null = null;
  private clientKey: string | null = null;

  constructor(options: GeminiProviderOptions = {}) {
    this.getConfig = options.getConfig ?? (() => getAiConfig());
    this.clientFactory = options.clientFactory ?? defaultClientFactory;
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const config = this.getConfig();
    if (!config.apiKey) {
      throw new AiUnavailableError('GEMINI_API_KEY não configurada');
    }

    const models = [config.model, ...(config.fallbackModels ?? [])];
    const startedAt = Date.now();
    let response: GenerateContentResponse | undefined;
    let lastError: Error = new AiUpstreamError();

    for (let i = 0; i < models.length; i++) {
      if (i > 0 && Date.now() - startedAt + config.timeoutMs > TOTAL_BUDGET_MS) break;
      try {
        const client = await this.getClient(config.apiKey);
        response = await this.generate(client, models[i], request, config);
        break;
      } catch (error) {
        lastError = this.mapError(error, models[i]);
        if (!this.shouldFallback(lastError, error)) throw lastError;
      }
    }

    if (!response) throw lastError;
    return this.parseResponse(response);
  }

  private generate(
    client: GenAiClientLike,
    model: string,
    request: LlmRequest,
    config: AiConfig,
  ): Promise<GenerateContentResponse> {
    return client.models.generateContent({
      model,
      contents: request.messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      config: {
        systemInstruction: request.system,
        maxOutputTokens: config.maxOutputTokens,
        temperature: TEMPERATURE,
        thinkingConfig: buildThinkingConfig(model),
        httpOptions: {
          timeout: config.timeoutMs,
          retryOptions: { attempts: MAX_ATTEMPTS },
        },
        abortSignal: AbortSignal.timeout(config.timeoutMs + 5000),
        ...this.buildToolsConfig(request),
      },
    });
  }

  /** Tools single-turn: o SDK nunca executa a função (automaticFunctionCalling desligado). */
  private buildToolsConfig(request: LlmRequest): Partial<GenerateContentConfig> {
    const out: Partial<GenerateContentConfig> = {};
    if (request.tools && request.tools.length > 0) {
      out.tools = [
        {
          functionDeclarations: request.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parametersJsonSchema: t.parameters,
          })),
        },
      ];
      out.automaticFunctionCalling = { disable: true };
    }
    if (request.toolChoice) {
      out.toolConfig = {
        functionCallingConfig:
          request.toolChoice.mode === 'any'
            ? {
                mode: 'ANY' as FunctionCallingConfigMode,
                ...(request.toolChoice.allowedNames ? { allowedFunctionNames: request.toolChoice.allowedNames } : {}),
              }
            : { mode: 'NONE' as FunctionCallingConfigMode },
      };
    }
    return out;
  }

  private parseToolCalls(response: GenerateContentResponse): LlmToolCall[] {
    const raw = response.functionCalls;
    if (!Array.isArray(raw)) return [];
    const calls: LlmToolCall[] = [];
    for (const item of raw) {
      if (!item || typeof item.name !== 'string' || item.name === '') continue;
      const args = item.args && typeof item.args === 'object' && !Array.isArray(item.args) ? item.args : {};
      calls.push({ name: item.name, args: args as Record<string, unknown> });
    }
    return calls;
  }

  /** Indisponibilidade do modelo (alta demanda, timeout, 5xx, modelo inexistente) tenta o próximo; chave inválida/rede não. */
  private shouldFallback(mapped: Error, raw: unknown): boolean {
    if (mapped instanceof AiBusyError || mapped instanceof AiTimeoutError || mapped instanceof AiUpstreamError) return true;
    return (raw as { status?: unknown } | null)?.status === 404;
  }

  private async getClient(apiKey: string): Promise<GenAiClientLike> {
    if (!this.client || this.clientKey !== apiKey) {
      this.client = await this.clientFactory(apiKey);
      this.clientKey = apiKey;
    }
    return this.client;
  }

  private parseResponse(response: GenerateContentResponse): LlmResponse {
    if (response.promptFeedback?.blockReason) {
      this.log('refusal', { name: 'PromptBlocked' });
      throw new AiRefusalError();
    }

    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason ? String(candidate.finishReason) : undefined;

    if (finishReason && REFUSAL_FINISH_REASONS.has(finishReason)) {
      this.log('refusal', { name: 'FinishReason', finishReason });
      throw new AiRefusalError();
    }

    const text = typeof response.text === 'string' ? response.text.trim() : '';
    const toolCalls = this.parseToolCalls(response);
    if (!text && toolCalls.length === 0) {
      this.log('empty', { name: 'EmptyResponse', finishReason });
      throw new AiUpstreamError();
    }

    return {
      text,
      stopReason: finishReason === 'MAX_TOKENS' ? 'max_tokens' : 'stop',
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
      },
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
    };
  }

  private mapError(error: unknown, model?: string): Error {
    const err = (error ?? {}) as { name?: unknown; status?: unknown; code?: unknown; message?: unknown };
    const name = typeof err.name === 'string' ? err.name : 'UnknownError';
    const status = typeof err.status === 'number' ? err.status : undefined;
    // Logs: apenas nome e status. Nunca message, prompt, chave ou dados.
    this.log('error', { name, status, model });

    if (status !== undefined) {
      if (status === 429 || status === 503) return new AiBusyError();
      if (status === 400 || status === 401 || status === 403 || status === 404) return new AiUnavailableError();
      if (status === 408 || status === 504) return new AiTimeoutError();
      return new AiUpstreamError();
    }

    const message = typeof err.message === 'string' ? err.message : '';
    if (name === 'AbortError' || name === 'TimeoutError' || name === 'RequestAbortedError' || /\babort|timed? ?out/i.test(message)) {
      return new AiTimeoutError();
    }

    const code = typeof err.code === 'string' ? err.code : '';
    if (error instanceof TypeError || NETWORK_ERROR_CODES.has(code) || /fetch failed|network/i.test(message)) {
      return new AiConnectionError();
    }

    return new AiUpstreamError();
  }

  private log(event: string, details: Record<string, unknown>): void {
    console.error('[ai.gemini]', event, details);
  }
}
