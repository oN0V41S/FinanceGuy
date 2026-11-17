import type { FsLike } from './types.js';

/** Sondas opcionais do sistema de arquivos (ausentes em fakes simples: então não restringem). */
export interface FsGuard {
  isSymlink?(p: string): boolean;
  size?(p: string): number;
}

/**
 * Lê um arquivo de nome fixo recusando link simbólico e arquivo maior que `maxBytes`
 * (checado antes de carregar em memória). Devolve `null` quando ausente, recusado ou grande demais.
 */
export function readGuarded(fs: FsLike & FsGuard, path: string, maxBytes: number): string | null {
  if (!fs.exists(path)) return null;
  if (fs.isSymlink?.(path) === true) return null;
  const size = fs.size?.(path);
  if (size !== undefined && size > maxBytes) return null;
  const raw = fs.readFile(path);
  return raw.length > maxBytes ? null : raw;
}
