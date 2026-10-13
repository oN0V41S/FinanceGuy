import type { CliStatus, CommandResult } from './types';

type ErrorStatus = Extract<CliStatus, 'invalid-args' | 'blocked' | 'failed'>;

/** Erro esperado do CLI: vira um CommandResult amigável, nunca stack trace. */
export class CliError extends Error {
  constructor(
    public readonly status: ErrorStatus,
    message: string,
    public readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'CliError';
  }
}

export function emptyResult(command: string, overrides: Partial<CommandResult> = {}): CommandResult {
  return {
    status: 'ok',
    command,
    message: '',
    created: [],
    modified: [],
    moved: [],
    matches: [],
    nextSteps: [],
    errors: [],
    ...overrides,
  };
}

export function errorToResult(command: string, error: unknown): CommandResult {
  if (error instanceof CliError) {
    return emptyResult(command, {
      status: error.status,
      message: error.message,
      errors: error.details,
    });
  }
  const message = error instanceof Error ? error.message : 'Erro inesperado.';
  return emptyResult(command, {
    status: 'failed',
    message: `Algo inesperado aconteceu: ${message}`,
  });
}
