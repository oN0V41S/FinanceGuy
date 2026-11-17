import type { BoardCard } from '../model/types.js';

export type CardStatus = BoardCard['status'];

/** Cor do Ink por status (tokens, sem hex, degradam em terminais sem cor). */
export const STATUS_COLOR: Record<CardStatus, string> = {
  pending: 'gray',
  running: 'yellow',
  done: 'green',
  failed: 'red',
};

export const STATUS_LABEL: Record<CardStatus, string> = {
  pending: 'Pendente',
  running: 'Rodando',
  done: 'Concluída',
  failed: 'Falhou',
};

/** Minutos inteiros desde `updatedAt`; `null` se a data for inválida. */
export function minutesSince(updatedAt: string, now: Date): number | null {
  const t = Date.parse(updatedAt);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / 60_000));
}

/** "há 5 s", "há 3 min", "há 2 h", "há 4 d". */
export function formatAge(updatedAt: string, now: Date): string {
  const t = Date.parse(updatedAt);
  if (Number.isNaN(t)) return 'há tempo indeterminado';
  const seconds = Math.max(0, Math.floor((now.getTime() - t) / 1000));
  if (seconds < 60) return `há ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `há ${hours} h`;
  return `há ${Math.floor(hours / 24)} d`;
}
