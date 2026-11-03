import type { Gate, PipelineState } from './types.js';

export function detectGate(state: PipelineState): Gate | null {
  void state;
  throw new Error('not implemented');
}
