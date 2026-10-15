import type { RateLimitScope } from './types';

/** Erros de domínio da IA. Nenhum tipo do SDK do provedor vaza para fora do provider. */

export class AiUnavailableError extends Error {
  constructor(message = 'Assistente indisponível') {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

export class AiBusyError extends Error {
  constructor(message = 'Provedor com alta demanda') {
    super(message);
    this.name = 'AiBusyError';
  }
}

export class AiTimeoutError extends Error {
  constructor(message = 'Tempo esgotado ao consultar o provedor') {
    super(message);
    this.name = 'AiTimeoutError';
  }
}

export class AiConnectionError extends Error {
  constructor(message = 'Falha de conexão com o provedor') {
    super(message);
    this.name = 'AiConnectionError';
  }
}

export class AiUpstreamError extends Error {
  constructor(message = 'Resposta inesperada do provedor') {
    super(message);
    this.name = 'AiUpstreamError';
  }
}

export class AiRefusalError extends Error {
  constructor(message = 'Pergunta bloqueada pelo provedor') {
    super(message);
    this.name = 'AiRefusalError';
  }
}

export class AiContextLoadError extends Error {
  constructor(message = 'Falha ao carregar dados financeiros') {
    super(message);
    this.name = 'AiContextLoadError';
  }
}

export class AiRateLimitedError extends Error {
  readonly scope: RateLimitScope;
  readonly retryAfterSeconds: number;

  constructor(scope: RateLimitScope, retryAfterSeconds: number) {
    super('Limite de perguntas atingido');
    this.name = 'AiRateLimitedError';
    this.scope = scope;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
