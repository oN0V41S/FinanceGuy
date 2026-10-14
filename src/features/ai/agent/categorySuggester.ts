import { CategoryEnum } from '@/features/transactions/validations';
import { logSafe } from '../logging';
import type { ILlmProvider, IRateLimiter } from '../types';
import { suggestCategory } from './categoryHints';
import { normalize } from './text';

/** Limite do trecho enviado ao modelo: a categoria sai do título, não de contexto longo. */
export const CATEGORY_MAX_INPUT_CHARS = 80;
const CATEGORY_MAX_OUTPUT_TOKENS = 16;

const SYSTEM = `Classifique o gasto em UMA categoria: ${CategoryEnum.options.join(', ')}. Responda só com o nome.`;

export interface CategorySuggesterDeps {
  llm: ILlmProvider;
  rateLimiter: IRateLimiter;
  /** Menor modelo disponível; a cadeia de fallback do provider continua valendo. */
  model: string;
}

export interface ICategorySuggester {
  suggest(userId: string, text: string): Promise<string | undefined>;
}

/** Escolhe a categoria quando o usuário não informa: palavra-chave primeiro (0 tokens), modelo pequeno depois. */
export class CategorySuggester implements ICategorySuggester {
  constructor(private readonly deps: CategorySuggesterDeps) {}

  async suggest(userId: string, text: string): Promise<string | undefined> {
    const trimmed = text.trim();
    if (!trimmed) return undefined;
    const byKeyword = suggestCategory(trimmed);
    if (byKeyword) return byKeyword;

    try {
      const limit = await this.deps.rateLimiter.consume(userId);
      if (!limit.allowed) return undefined;
      const response = await this.deps.llm.complete({
        system: SYSTEM,
        messages: [{ role: 'user', content: trimmed.slice(0, CATEGORY_MAX_INPUT_CHARS) }],
        model: this.deps.model,
        maxOutputTokens: CATEGORY_MAX_OUTPUT_TOKENS,
      });
      return matchCategory(response.text);
    } catch (error) {
      logSafe('ai.category', 'Não foi possível sugerir a categoria', error);
      return undefined;
    }
  }
}

function matchCategory(answer: string): string | undefined {
  const norm = normalize(answer);
  return CategoryEnum.options.find((option) => normalize(option) === norm.replace(/[^a-z]/g, ''));
}
