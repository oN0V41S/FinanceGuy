import type { ReactElement } from 'react';
import { Box, Text } from 'ink';

export interface ActivityFeedProps {
  lines: string[];
}

export function ActivityFeed({ lines }: ActivityFeedProps): ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold>Atividade</Text>
      {lines.length === 0 ? (
        <Text dimColor>Sem atividade registrada ainda.</Text>
      ) : (
        lines.map((line, index) => (
          <Text key={`${index}:${line}`} wrap="truncate-end">
            {line}
          </Text>
        ))
      )}
    </Box>
  );
}
