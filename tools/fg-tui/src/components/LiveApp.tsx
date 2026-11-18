import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Text, useApp, useInput } from 'ink';
import { useWatchEvents } from '../hooks/useWatchEvents.js';
import { useWatchState, type UseWatchStateOptions } from '../hooks/useWatchState.js';
import { safeBoard } from '../model/safeBoard.js';
import type { FsLike } from '../model/types.js';
import { App } from './App.js';
import { ErrorView } from './ErrorView.js';

export function ErrorScreen({ message, onBack }: { message: string; onBack?: () => void }): ReactElement {
  const { exit } = useApp();
  useInput((input, key) => {
    if (input === 'q') exit();
    else if (key.escape) {
      if (onBack !== undefined) onBack();
      else exit();
    }
  });
  return (
    <>
      <ErrorView message={message} />
      <Text dimColor>{onBack !== undefined ? 'Esc volta · q sai' : 'Esc/q sai'}</Text>
    </>
  );
}

const CLOCK_TICK_MS = 5000;

/** Observa uma worktree e renderiza o <App> com o estado vivo. */
export function LiveApp({
  dir,
  fs,
  watchOptions,
  onBack,
}: {
  dir: string;
  fs: FsLike;
  watchOptions?: UseWatchStateOptions;
  onBack?: () => void;
}): ReactElement {
  const { result, activity, unstable, reload } = useWatchState(dir, fs, watchOptions);
  const { events } = useWatchEvents(dir, fs, watchOptions);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const view = useMemo(() => {
    const now = new Date();
    void tick;
    return { now, built: safeBoard(result, now, events) };
  }, [result, tick, events]);

  if ('error' in view.built) return <ErrorScreen message={view.built.error} onBack={onBack} />;
  return <App board={view.built.board} activity={activity} unstable={unstable} now={view.now} onReload={reload} onBack={onBack} events={events} />;
}
