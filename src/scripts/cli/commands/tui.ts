import { resolve } from 'node:path';
import { CliError } from '../core/errors';
import { flagString, hasFlag } from '../core/args';
import { runSteps } from '../core/steps';
import type { Command } from '../core/types';

const PKG_DIR = 'tools/fg-tui';
const ALLOWED_FLAGS = new Set(['demo', 'once', 'dump', 'dir', 'json', 'help']);

export const tuiCommand: Command = {
  name: 'tui',
  summary: 'Kanban de specs no terminal (Ink)',
  usage: ['fg tui', 'fg tui --demo --once', 'fg tui --dump', 'fg tui --dir docs/specs', 'fg tui FING-30'],
  async run(args, ctx) {
    const unknown = Object.keys(args.flags).filter((flag) => !ALLOWED_FLAGS.has(flag));
    if (unknown.length > 0) {
      throw new CliError('invalid-args', `Flag desconhecida: --${unknown[0]}. Uso: fg tui [FING-N] [--dir <caminho>] [--demo] [--once] [--dump]`);
    }
    if (args.positionals.length > 1) {
      throw new CliError('invalid-args', 'Informe no máximo uma tarefa (FING-N). Uso: fg tui [FING-N] [--dir <caminho>] [--demo] [--once] [--dump]');
    }
    if (!ctx.fs.exists(`${PKG_DIR}/package.json`) || !ctx.fs.exists(`${PKG_DIR}/node_modules`)) {
      throw new CliError('blocked', 'Pacote @financeguy/fg-tui ou dependências ausentes. Rode: pnpm install');
    }

    const forwarded: string[] = [];
    for (const flag of ['demo', 'once', 'dump']) {
      if (hasFlag(args, flag)) forwarded.push(`--${flag}`);
    }
    const dir = flagString(args, 'dir');
    if (dir) forwarded.push('--dir', resolve(dir));
    forwarded.push(...args.positionals);

    const result = await runSteps('tui', [
      {
        name: 'fg-tui',
        command: 'pnpm',
        args: ['--filter', '@financeguy/fg-tui', 'exec', 'tsx', 'src/main.tsx', ...forwarded],
      },
    ], ctx);
    return { ...result, quiet: true };
  },
};
