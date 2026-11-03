import { useMemo, useState, type ReactElement } from 'react';
import { basename } from 'node:path';
import { Box, Text, useApp, useInput } from 'ink';
import { useWatchState, type UseWatchStateOptions } from '../hooks/useWatchState.js';
import { formatSummary, summarizeResult } from '../model/aggregate.js';
import { describeReadFailure } from '../model/safeBoard.js';
import { sanitizeText } from '../model/sanitizeText.js';
import type { FsLike, WorktreeRef } from '../model/types.js';
import { LiveApp } from './LiveApp.js';

export interface MultiAppProps {
  refs: WorktreeRef[];
  fs: FsLike;
  /** `false` desliga a captura de teclado (testes/--once). */
  interactive?: boolean;
  /** Injeção de watcher/intervalos (testes). */
  watchOptions?: UseWatchStateOptions;
}

export const ALL_TAB = 'Todas';

export function tabLabel(ref: WorktreeRef): string {
  return sanitizeText(ref.code ?? basename(ref.path));
}

function SummaryRow({
  worktree,
  fs,
  selected,
  watchOptions,
}: {
  worktree: WorktreeRef;
  fs: FsLike;
  selected: boolean;
  watchOptions?: UseWatchStateOptions;
}): ReactElement {
  const { result } = useWatchState(worktree.path, fs, watchOptions);
  const summary = summarizeResult(result);
  const text = summary !== null ? sanitizeText(formatSummary(summary)) : `${tabLabel(worktree)} · ${result.ok ? '' : describeReadFailure(result)}`;
  return (
    <Text color={summary === null ? 'red' : undefined} bold={selected} wrap="wrap">
      {`${selected ? '> ' : '  '}${text}`}
    </Text>
  );
}

function AllTab({
  refs,
  fs,
  selected,
  watchOptions,
}: {
  refs: WorktreeRef[];
  fs: FsLike;
  selected: number;
  watchOptions?: UseWatchStateOptions;
}): ReactElement {
  return (
    <Box flexDirection="column">
      {refs.map((ref, i) => (
        <SummaryRow key={ref.path} worktree={ref} fs={fs} selected={i === selected} watchOptions={watchOptions} />
      ))}
    </Box>
  );
}

/** Abas: "Todas" (resumo) + uma por worktree. Só a aba ativa monta o <App>; ao sair, os watchers são fechados. */
export function MultiApp({ refs, fs, interactive = true, watchOptions }: MultiAppProps): ReactElement {
  const { exit } = useApp();
  // 0 = "Todas"; 1..n = worktrees.
  const [tab, setTab] = useState(0);
  const [row, setRow] = useState(0);
  const total = refs.length + 1;

  const labels = useMemo(() => [ALL_TAB, ...refs.map(tabLabel)], [refs]);

  useInput(
    (input, key) => {
      if (key.tab) {
        setTab((current) => (current + (key.shift ? total - 1 : 1)) % total);
        return;
      }
      if (tab !== 0) return; // nas abas de worktree o <App> trata as demais teclas
      if (input === 'q' || key.escape) exit();
      else if (key.upArrow || input === 'k') setRow((r) => Math.max(0, r - 1));
      else if (key.downArrow || input === 'j') setRow((r) => Math.min(refs.length - 1, r + 1));
      else if (key.return) setTab(Math.min(refs.length, row) + 1);
    },
    { isActive: interactive },
  );

  const active = tab > 0 ? refs[tab - 1] : undefined;

  return (
    <Box flexDirection="column">
      <Box flexWrap="wrap" columnGap={2}>
        {labels.map((label, i) => (
          <Text key={`${label}-${i}`} bold={i === tab} color={i === tab ? 'cyan' : undefined} inverse={i === tab}>
            {` ${label} `}
          </Text>
        ))}
      </Box>
      <Box marginTop={1} flexDirection="column">
        {active === undefined ? (
          <AllTab refs={refs} fs={fs} selected={row} watchOptions={watchOptions} />
        ) : (
          <LiveApp key={active.path} dir={active.path} fs={fs} watchOptions={watchOptions} onBack={() => setTab(0)} />
        )}
      </Box>
      <Text dimColor>
        {tab === 0 ? 'Tab/Shift+Tab alterna aba · ↑/↓ escolhe · Enter abre · Esc/q sai' : 'Tab/Shift+Tab alterna aba · Esc volta a Todas · q sai'}
      </Text>
    </Box>
  );
}
