import { CliError } from '../core/errors';
import { flagString, hasFlag } from '../core/args';
import { runSteps } from '../core/steps';
import type { Command } from '../core/types';

const PKG_DIR = 'tools/fg-tui';

export const tuiCommand: Command = {
  name: 'tui',
  summary: 'Kanban de specs no terminal (Ink)',
  usage: ['fg tui', 'fg tui --demo --once', 'fg tui --dump', 'fg tui --dir docs/specs', 'fg tui FING-30'],
  async run(args, ctx) {
    if (!ctx.fs.exists(`${PKG_DIR}/package.json`) || !ctx.fs.exists(`${PKG_DIR}/node_modules`)) {
      throw new CliError('failed', 'Pacote @financeguy/fg-tui ou dependências ausentes. Rode: pnpm install');
    }

    const forwarded: string[] = [];
    for (const flag of ['demo', 'once', 'dump']) {
      if (hasFlag(args, flag)) forwarded.push(`--${flag}`);
    }
    const dir = flagString(args, 'dir');
    if (dir) forwarded.push('--dir', dir);
    forwarded.push(...args.positionals);

    return runSteps('tui', [
      {
        name: 'fg-tui',
        command: 'pnpm',
        args: ['--filter', '@financeguy/fg-tui', 'exec', 'tsx', 'src/main.tsx', ...forwarded],
      },
    ], ctx);
  },
};
