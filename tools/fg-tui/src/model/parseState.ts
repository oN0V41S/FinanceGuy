export type ParsedState =
  | { kind: 'known'; name: string }
  | { kind: 'step'; index: number; phase: 'running' | 'done' }
  | { kind: 'review'; cycle: number }
  | { kind: 'unknown'; raw: string };

export function parseState(s: string): ParsedState {
  void s;
  throw new Error('not implemented');
}
