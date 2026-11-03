import type { FsLike, ReadResult } from './types.js';

export function readState(dir: string, fs: FsLike): ReadResult {
  void dir;
  void fs;
  throw new Error('not implemented');
}
