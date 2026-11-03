import { watch as fsWatch } from 'node:fs';
import { join } from 'node:path';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { readGuarded, type FsGuard } from '../model/guardedRead.js';
import { readState } from '../model/readState.js';
import { tailProgress } from '../model/tailProgress.js';
import type { FsLike, ReadResult } from '../model/types.js';

/** Nomes fixos: a TUI nunca lê outro arquivo da worktree. */
const STATE_FILE = '.fg-pipeline.json';
const PROGRESS_FILE = '.fg-pipeline.progress.md';

export interface WatcherLike {
  close(): void;
}

/** Observa `dir`; chama `onEvent` com o nome do arquivo alterado (ou `null` se desconhecido). */
export type WatchFn = (dir: string, onEvent: (filename: string | null) => void) => WatcherLike;

export interface UseWatchStateOptions {
  /** Intervalo do polling de segurança (padrão 1000 ms). */
  intervalMs?: number;
  /** Debounce dos eventos do `fs.watch` (padrão 100 ms). */
  debounceMs?: number;
  /** Injeção do watcher (testes); padrão: `fs.watch` do Node. */
  watch?: WatchFn;
}

export interface WatchView {
  result: ReadResult;
  activity: string[];
  unstable: boolean;
}

export interface UseWatchStateReturn extends WatchView {
  /** Força uma releitura imediata (tecla `r`). */
  reload: () => void;
}

interface Held {
  dir: string;
  signature: string;
  view: WatchView;
}

export const defaultWatch: WatchFn = (dir, onEvent) => {
  const watcher = fsWatch(dir, { persistent: false }, (_event, filename) => {
    onEvent(filename === null || filename === undefined ? null : String(filename));
  });
  // Erros assíncronos do watcher (diretório removido etc.) não podem derrubar a TUI.
  watcher.on('error', () => undefined);
  return { close: () => watcher.close() };
};

const MAX_PROGRESS_BYTES = 1_000_000;

function readRaw(fs: FsLike & FsGuard, path: string, maxBytes: number): string | null {
  try {
    return readGuarded(fs, path, maxBytes);
  } catch (error) {
    return `\u0000erro:${error instanceof Error ? error.message : String(error)}`;
  }
}

function safeRead(dir: string, fs: FsLike): ReadResult {
  try {
    return readState(dir, fs);
  } catch (error) {
    return {
      ok: false,
      kind: 'unreadable',
      message: error instanceof Error ? error.message : 'falha desconhecida ao ler o estado',
    };
  }
}

function safeTail(text: string | null): string[] {
  if (text === null || text.length === 0 || text.startsWith('\u0000')) return [];
  try {
    return tailProgress(text);
  } catch {
    return [];
  }
}

/**
 * Lê o estado e o progresso. Devolve `prev` (mesma referência) quando o conteúdo não mudou,
 * para o React não re-renderizar.
 */
function load(dir: string, fs: FsLike, prev: Held | null): Held {
  const stateRaw = readRaw(fs, join(dir, STATE_FILE), MAX_PROGRESS_BYTES);
  const progressRaw = readRaw(fs, join(dir, PROGRESS_FILE), MAX_PROGRESS_BYTES);
  const signature = JSON.stringify([stateRaw, progressRaw]);
  const previous = prev !== null && prev.dir === dir ? prev : null;
  if (previous !== null && previous.signature === signature) return previous;

  const result = safeRead(dir, fs);
  const activity = safeTail(progressRaw);
  if (result.ok) {
    return { dir, signature, view: { result, activity, unstable: false } };
  }
  if (previous !== null && previous.view.result.ok) {
    // Gravação em andamento ou arquivo inconsistente: mantém o último estado válido.
    return { dir, signature, view: { result: previous.view.result, activity, unstable: true } };
  }
  return { dir, signature, view: { result, activity, unstable: false } };
}

/** Leitura única (modos sem watch: `--once`, `--dump`). */
export function readSnapshot(dir: string, fs: FsLike): WatchView {
  return load(dir, fs, null).view;
}

interface Store {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => Held;
  refresh: () => void;
}

/**
 * Store externo (em vez de useState): as atualizações viram renders síncronos do React,
 * sem depender do agendador, e um `refresh` sem mudança de conteúdo não notifica ninguém.
 */
function createStore(dir: string, fs: FsLike): Store {
  let held = load(dir, fs, null);
  const listeners = new Set<() => void>();
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => held,
    refresh: () => {
      const next = load(dir, fs, held);
      if (next === held) return;
      held = next;
      for (const listener of [...listeners]) listener();
    },
  };
}

export function useWatchState(dir: string, fs: FsLike, opts?: UseWatchStateOptions): UseWatchStateReturn {
  const intervalMs = opts?.intervalMs ?? 1000;
  const debounceMs = opts?.debounceMs ?? 100;
  const watch = opts?.watch ?? defaultWatch;

  const store = useMemo(() => createStore(dir, fs), [dir, fs]);
  const held = useSyncExternalStore(store.subscribe, store.getSnapshot);

  useEffect(() => {
    const refresh = store.refresh;
    refresh();

    const interval = setInterval(refresh, intervalMs);

    let debounce: ReturnType<typeof setTimeout> | null = null;
    let watcher: WatcherLike | null = null;
    try {
      watcher = watch(dir, (filename) => {
        if (filename !== null && filename !== STATE_FILE && filename !== PROGRESS_FILE) return;
        if (debounce !== null) clearTimeout(debounce);
        debounce = setTimeout(() => {
          debounce = null;
          refresh();
        }, debounceMs);
      });
    } catch {
      // fs.watch indisponível (ENOENT, limite de watchers, FS de rede): o polling cobre.
      watcher = null;
    }

    return () => {
      clearInterval(interval);
      if (debounce !== null) clearTimeout(debounce);
      try {
        watcher?.close();
      } catch {
        // fechar um watcher já inválido não deve falhar o unmount
      }
    };
  }, [store, dir, intervalMs, debounceMs, watch]);

  return { ...held.view, reload: store.refresh };
}
