import type { Board as BoardModel } from '../model/types.js';

export interface BoardProps {
  board: BoardModel;
  /** Seleção atual: índice da coluna e do card dentro dela. */
  selected?: { column: number; row: number };
}

export function Board(props: BoardProps): null {
  void props;
  return null;
}
