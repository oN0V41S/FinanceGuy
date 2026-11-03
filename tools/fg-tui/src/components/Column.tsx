import type { ReactElement } from 'react';
import { Box, Text } from 'ink';
import type { BoardColumn } from '../model/types.js';
import { Card } from './Card.js';
import { STATUS_COLOR } from './format.js';

export interface ColumnProps {
  column: BoardColumn;
  /** Índice do card selecionado nesta coluna; `null`/ausente = coluna sem seleção. */
  selectedRow?: number | null;
  /** Colunas empilhadas (terminal estreito) ocupam a largura toda. */
  stacked?: boolean;
}

export function Column({ column, selectedRow = null, stacked = false }: ColumnProps): ReactElement {
  return (
    <Box flexDirection="column" width={stacked ? undefined : '25%'} paddingRight={stacked ? 0 : 1}>
      <Text bold color={STATUS_COLOR[column.id]}>
        {`${column.title} (${column.cards.length})`}
      </Text>
      {column.cards.length === 0 ? (
        <Text dimColor>—</Text>
      ) : (
        column.cards.map((card, row) => <Card key={card.index} card={card} selected={selectedRow === row} />)
      )}
    </Box>
  );
}
