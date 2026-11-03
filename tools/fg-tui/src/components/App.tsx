import type { Board } from '../model/types.js';

export interface AppProps {
  board: Board;
  activity: string[];
  unstable?: boolean;
}

export function App(props: AppProps): null {
  void props;
  return null;
}
