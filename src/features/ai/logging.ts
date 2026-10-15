/** Log seguro: registra apenas o nome do erro, nunca mensagem, stack ou dados do usuário. */
export function logSafe(scope: string, message: string, error: unknown): void {
  const name = error instanceof Error ? error.name : 'UnknownError';
  console.error(`[${scope}] ${message}`, { name });
}
