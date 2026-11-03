import type { BoardCard } from '../model/types.js';

export interface CardProps {
  card: BoardCard;
  selected?: boolean;
}

export function Card(props: CardProps): null {
  void props;
  return null;
}
