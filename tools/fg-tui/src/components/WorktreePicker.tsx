import { useState, type ReactElement } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { WorktreeRef } from '../model/types.js';

export interface WorktreePickerProps {
  refs: WorktreeRef[];
  onSelect: (ref: WorktreeRef) => void;
  /** Desative em modos sem raw mode (ex.: `--once`). */
  interactive?: boolean;
}

function baseName(path: string): string {
  const parts = path.split(/[\\/]/).filter((part) => part.length > 0);
  return parts[parts.length - 1] ?? path;
}

export function describeWorktree(ref: WorktreeRef): string {
  return `${ref.code ?? ref.branch ?? '—'} · ${baseName(ref.path)} · ${ref.state ?? 'estado desconhecido'}`;
}

export function WorktreePicker({ refs, onSelect, interactive = true }: WorktreePickerProps): ReactElement {
  const { exit } = useApp();
  const [cursor, setCursor] = useState(0);
  const current = Math.min(cursor, Math.max(0, refs.length - 1));

  useInput(
    (input, key) => {
      if (key.upArrow || input === 'k') {
        setCursor(Math.max(0, current - 1));
      } else if (key.downArrow || input === 'j') {
        setCursor(Math.min(refs.length - 1, current + 1));
      } else if (key.return) {
        const ref = refs[current];
        if (ref !== undefined) onSelect(ref);
      } else if (input === 'q') {
        exit();
      }
    },
    { isActive: interactive },
  );

  return (
    <Box flexDirection="column">
      <Text bold>Várias pipelines encontradas. Escolha uma:</Text>
      {refs.map((ref, index) => (
        <Box key={ref.path} flexDirection="column">
          <Text color={index === current ? 'cyan' : undefined} bold={index === current}>
            {`${index === current ? '› ' : '  '}${describeWorktree(ref)}`}
          </Text>
          <Text dimColor wrap="truncate-end">{`    ${ref.path}`}</Text>
        </Box>
      ))}
      <Text dimColor>↑/↓ escolhe · Enter abre · q sai</Text>
    </Box>
  );
}
