import type { ReactElement } from 'react';
import { Box, Text } from 'ink';
import type { PhaseItem, PhaseStatus } from '../model/types.js';

export interface PhaseBarProps {
  phases: PhaseItem[];
}

const SYMBOL: Record<PhaseStatus, string> = {
  done: '✔',
  current: '●',
  pending: '○',
  failed: '✖',
};

const COLOR: Record<PhaseStatus, string> = {
  done: 'green',
  current: 'cyan',
  pending: 'gray',
  failed: 'red',
};

export function PhaseBar({ phases }: PhaseBarProps): ReactElement {
  return (
    <Box flexWrap="wrap" columnGap={2}>
      {phases.map((phase) => (
        <Text key={phase.id} color={COLOR[phase.status]} bold={phase.status === 'current'}>
          {`${SYMBOL[phase.status]} ${phase.label}`}
        </Text>
      ))}
    </Box>
  );
}
