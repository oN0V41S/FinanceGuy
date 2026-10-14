import { z } from 'zod';
import type { AgentConfig, AiConfig } from './types';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
/** Ordem de tentativa quando o modelo principal está indisponível (503/429/404). */
export const DEFAULT_GEMINI_FALLBACK_MODELS = ['gemini-3.7-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];

type EnvSource = Record<string, string | undefined>;

const positiveInt = (fallback: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().positive())
    .catch(fallback);

const EnvSchema = z.object({
  GEMINI_API_KEY: z.string().trim().optional().catch(undefined),
  GEMINI_MODEL: z.string().trim().min(1).catch(DEFAULT_GEMINI_MODEL).default(DEFAULT_GEMINI_MODEL),
  GEMINI_FALLBACK_MODELS: z.string().optional().catch(undefined),
  AI_REQUEST_TIMEOUT_MS: positiveInt(20000).default(20000),
  AI_MAX_OUTPUT_TOKENS: positiveInt(2048).default(2048),
  AI_RATE_LIMIT_PER_MINUTE: positiveInt(10).default(10),
  AI_RATE_LIMIT_WINDOW_SECONDS: positiveInt(60).default(60),
  AI_RATE_LIMIT_PER_DAY: positiveInt(50).default(50),
});

/**
 * Lê e valida a configuração de IA SOB DEMANDA (nunca no import).
 * Nunca lança: valores ausentes/inválidos caem nos defaults; a chave é opcional
 * (sem ela o provider responde AiUnavailableError em vez de quebrar o boot).
 */
export function getAiConfig(env: EnvSource = process.env): AiConfig {
  const parsed = EnvSchema.parse({
    GEMINI_API_KEY: env.GEMINI_API_KEY,
    GEMINI_MODEL: env.GEMINI_MODEL,
    GEMINI_FALLBACK_MODELS: env.GEMINI_FALLBACK_MODELS,
    AI_REQUEST_TIMEOUT_MS: env.AI_REQUEST_TIMEOUT_MS,
    AI_MAX_OUTPUT_TOKENS: env.AI_MAX_OUTPUT_TOKENS,
    AI_RATE_LIMIT_PER_MINUTE: env.AI_RATE_LIMIT_PER_MINUTE,
    AI_RATE_LIMIT_WINDOW_SECONDS: env.AI_RATE_LIMIT_WINDOW_SECONDS,
    AI_RATE_LIMIT_PER_DAY: env.AI_RATE_LIMIT_PER_DAY,
  });

  const fallbackModels =
    parsed.GEMINI_FALLBACK_MODELS === undefined
      ? DEFAULT_GEMINI_FALLBACK_MODELS
      : parsed.GEMINI_FALLBACK_MODELS.split(',').map((m) => m.trim()).filter(Boolean);

  return {
    apiKey: parsed.GEMINI_API_KEY ? parsed.GEMINI_API_KEY : null,
    model: parsed.GEMINI_MODEL,
    fallbackModels: fallbackModels.filter((m) => m !== parsed.GEMINI_MODEL),
    timeoutMs: parsed.AI_REQUEST_TIMEOUT_MS,
    maxOutputTokens: parsed.AI_MAX_OUTPUT_TOKENS,
    rateLimitPerMinute: parsed.AI_RATE_LIMIT_PER_MINUTE,
    rateLimitWindowSeconds: parsed.AI_RATE_LIMIT_WINDOW_SECONDS,
    rateLimitPerDay: parsed.AI_RATE_LIMIT_PER_DAY,
  };
}

/** Menor modelo para tarefas triviais (ex.: sugerir categoria). */
export const DEFAULT_CATEGORY_MODEL = 'gemini-3.1-flash-lite';

export function getCategoryModel(env: NodeJS.ProcessEnv = process.env): string {
  return env.AI_CATEGORY_MODEL?.trim() || DEFAULT_CATEGORY_MODEL;
}

const AgentEnvSchema = z.object({
  AI_ACTION_TTL_MINUTES: positiveInt(10).default(10),
  AI_MAX_QUEUE: positiveInt(5).default(5),
  AI_MAX_PENDING: positiveInt(20).default(20),
  AI_COMPACT_TOKENS: positiveInt(80000).default(80000),
  AI_CONTEXT_CACHE_TTL_SECONDS: positiveInt(60).default(60),
  AI_SESSION_KEEP_MESSAGES: positiveInt(10).default(10),
});

/** Configuração do agente de escrita (FING-18). Lida sob demanda; nunca lança (inválido => default). */
export function getAgentConfig(env: EnvSource = process.env): AgentConfig {
  const parsed = AgentEnvSchema.parse({
    AI_ACTION_TTL_MINUTES: env.AI_ACTION_TTL_MINUTES,
    AI_MAX_QUEUE: env.AI_MAX_QUEUE,
    AI_MAX_PENDING: env.AI_MAX_PENDING,
    AI_COMPACT_TOKENS: env.AI_COMPACT_TOKENS,
    AI_CONTEXT_CACHE_TTL_SECONDS: env.AI_CONTEXT_CACHE_TTL_SECONDS,
    AI_SESSION_KEEP_MESSAGES: env.AI_SESSION_KEEP_MESSAGES,
  });
  return {
    actionTtlMinutes: parsed.AI_ACTION_TTL_MINUTES,
    maxQueue: parsed.AI_MAX_QUEUE,
    maxPending: parsed.AI_MAX_PENDING,
    compactTokens: parsed.AI_COMPACT_TOKENS,
    contextCacheTtlSeconds: parsed.AI_CONTEXT_CACHE_TTL_SECONDS,
    sessionKeepMessages: parsed.AI_SESSION_KEEP_MESSAGES,
  };
}
