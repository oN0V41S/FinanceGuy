import type { ReactElement } from 'react';
import { Box, Text } from 'ink';

export interface ErrorViewProps {
  message: string;
}

export function ErrorView({ message }: ErrorViewProps): ReactElement {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={1}>
      <Text color="red" bold>
        Não foi possível exibir a pipeline
      </Text>
      <Text>{message}</Text>
    </Box>
  );
}
