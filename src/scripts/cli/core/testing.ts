import { createMemoryFs, type MemoryFs } from './fs-port';
import type { CommandContext, ExecPort } from './types';

export interface FakeExec extends ExecPort {
  calls: { command: string; args: string[] }[];
}

/** Exec falso: registra chamadas e devolve os exit codes configurados (0 por padrão). */
export function createFakeExec(codes: number[] = []): FakeExec {
  const calls: FakeExec['calls'] = [];
  return {
    calls,
    async run(command, args) {
      calls.push({ command, args });
      return codes[calls.length - 1] ?? 0;
    },
  };
}

export function makeCtx(
  files: Record<string, string> = {},
  codes: number[] = [],
): { ctx: CommandContext; fs: MemoryFs; exec: FakeExec } {
  const fs = createMemoryFs(files);
  const exec = createFakeExec(codes);
  return { ctx: { fs, exec }, fs, exec };
}
