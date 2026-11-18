import { mapToBoard } from './mapToBoard.js';
import { sanitizeText } from './sanitizeText.js';
import type { PipelineEvent } from './events.js';
import type { Board, ReadResult } from './types.js';

export function describeReadFailure(result: Extract<ReadResult, { ok: false }>): string {
  switch (result.kind) {
    case 'missing':
      return 'Esta worktree não tem estado de pipeline (`.fg-pipeline.json`).';
    case 'invalid-json':
      return 'Estado ainda sendo gravado, tentando de novo…';
    case 'invalid-schema':
      return `O estado da pipeline está em formato inesperado: ${sanitizeText(result.message)}`;
    case 'unreadable':
      return `Não foi possível ler o estado da pipeline: ${sanitizeText(result.message)}`;
  }
}

export function safeBoard(result: ReadResult, now: Date, events: readonly PipelineEvent[] = []): { board: Board } | { error: string } {
  if (!result.ok) return { error: describeReadFailure(result) };
  try {
    return { board: mapToBoard(result.state, now, events) };
  } catch (error) {
    return {
      error: `Falha ao montar o quadro da pipeline: ${sanitizeText(error instanceof Error ? error.message : String(error))}`,
    };
  }
}
