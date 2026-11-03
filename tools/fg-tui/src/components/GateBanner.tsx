import type { ReactElement } from 'react';
import { Box, Text } from 'ink';
import type { Gate } from '../model/types.js';

export interface GateBannerProps {
  gate: Gate;
}

export function GateBanner({ gate }: GateBannerProps): ReactElement {
  const color = gate.kind === 'failed' ? 'red' : 'green';
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={color} paddingX={1}>
      <Text bold color={color}>
        {gate.title}
      </Text>
      <Text>{gate.message}</Text>
      {gate.command !== undefined ? (
        <>
          <Text bold>{`$ ${gate.command}`}</Text>
          <Text dimColor>A TUI é somente leitura: execute o comando você mesmo, se aprovar.</Text>
        </>
      ) : null}
    </Box>
  );
}
