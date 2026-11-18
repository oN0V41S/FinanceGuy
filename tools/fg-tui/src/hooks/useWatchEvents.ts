import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { EVENTS_FILE, readEvents, type PipelineEvent } from '../model/events.js';
import type { FsLike } from '../model/types.js';
import { defaultWatch, type UseWatchStateOptions, type WatcherLike } from './useWatchState.js';

export type UseWatchEventsOptions = UseWatchStateOptions;

export interface UseWatchEventsReturn {
  events: PipelineEvent[];
  skipped: number;
}

interface Held {
  signature: string;
  view: UseWatchEventsReturn;
}

interface Store {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => Held;
  refresh: () => void;
}

function load(dir: string, fs: FsLike, prev: Held | null): Held {
  let view: UseWatchEventsReturn;
  try {
    view = readEvents(dir, fs);
  } catch {
    view = { events: [], skipped: 0 };
  }
  const signature = JSON.stringify(view);
  if (prev !== null && prev.signature === signature) return prev;
  return { signature, view };
}

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

/** Observa `<dir>/.fg-pipeline.events.jsonl` (somente leitura): fs.watch com debounce + polling. */
export function useWatchEvents(dir: string, fs: FsLike, opts?: UseWatchEventsOptions): UseWatchEventsReturn {
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
        if (filename !== null && filename !== EVENTS_FILE) return;
        if (debounce !== null) clearTimeout(debounce);
        debounce = setTimeout(() => {
          debounce = null;
          refresh();
        }, debounceMs);
      });
    } catch {
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

  return held.view;
}
