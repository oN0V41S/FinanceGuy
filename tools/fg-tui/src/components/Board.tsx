import type { ReactElement } from 'react';
import { Box, useStdout } from 'ink';
import type { Board as BoardModel } from '../model/types.js';
import { Column } from './Column.js';

export interface BoardProps {
  board: BoardModel;
  /** Seleção atual: índice da coluna e do card dentro dela. */
  selected?: { column: number; row: number };
  /** Largura do terminal em colunas; padrão: a do stdout (ou 80). */
  width?: number;
}

export const NARROW_WIDTH = 80;

export function useTerminalWidth(width?: number): number {
  const { stdout } = useStdout();
  if (typeof width === 'number') return width;
  const columns: unknown = stdout.columns;
  return typeof columns === 'number' && columns > 0 ? columns : NARROW_WIDTH;
}

export function Board({ board, selected, width }: BoardProps): ReactElement {
  const terminalWidth = useTerminalWidth(width);
  const stacked = terminalWidth < NARROW_WIDTH;
  return (
    <Box flexDirection={stacked ? 'column' : 'row'}>
      {board.columns.map((column, index) => (
        <Column
          key={column.id}
          column={column}
          stacked={stacked}
          selectedRow={selected !== undefined && selected.column === index ? selected.row : null}
        />
      ))}
    </Box>
  );
}
