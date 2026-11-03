import type { ReactElement } from 'react';
import { Box, Text } from 'ink';
import type { BoardCard } from '../model/types.js';
import { STATUS_COLOR } from './format.js';

export interface CardProps {
  card: BoardCard;
  selected?: boolean;
}

export function Card({ card, selected = false }: CardProps): ReactElement {
  const color = STATUS_COLOR[card.status];
  return (
    <Box
      flexDirection="column"
      borderStyle={selected ? 'bold' : 'round'}
      borderColor={selected ? 'cyan' : color}
      paddingX={1}
    >
      <Text bold color={selected ? 'cyan' : undefined}>
        {`${selected ? '› ' : ''}${card.index}. ${card.agent}`}
      </Text>
      <Text dimColor wrap="truncate-end">
        {card.model ?? 'modelo —'}
      </Text>
      {card.commitShort !== null ? <Text>{`commit ${card.commitShort}`}</Text> : null}
      {card.stale ? <Text color="yellow">{'⚠ sem atualização'}</Text> : null}
    </Box>
  );
}
