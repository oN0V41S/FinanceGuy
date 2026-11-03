import type { FsLike, ReadResult } from '../model/types.js';

export function useWatchState(
  dir: string,
  fs: FsLike,
  opts?: { intervalMs?: number; debounceMs?: number },
): { result: ReadResult; activity: string[]; unstable: boolean } {
  void dir;
  void fs;
  void opts;
  throw new Error('not implemented');
}
