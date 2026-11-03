import { resolve } from 'node:path';
import { CliError } from '../core/errors';
import { flagString, flagStrings, hasFlag } from '../core/args';
import { runSteps } from '../core/steps';
import type { Command } from '../core/types';

const PKG_DIR = 'tools/fg-tui';
const USAGE = 'Uso: fg tui [FING-N] [--dir <caminho>]... [--root <pasta>] [--demo] [--once] [--dump]';
const ALLOWED_FLAGS = new Set(['demo', 'once', 'dump', 'dir', 'root', 'json', 'help']);

export const tuiCommand: Command = {
  name: 'tui',
  summary: 'Kanban de specs no terminal (Ink)',
  usage: ['fg tui', 'fg tui --demo --once', 'fg tui --dump', 'fg tui --dir docs/specs',
    'fg tui --dir ../A --dir ../B',
    'fg tui --root ..', 'fg tui FING-30'],
  async run(args, ctx) {
    const unknown = Object.keys(args.flags).filter((flag) => !ALLOWED_FLAGS.has(flag));
    if (unknown.length > 0) {
      throw new CliError('invalid-args', `Flag desconhecida: --${unknown[0]}. ${USAGE}`);
    }
    if (args.positionals.length > 1) {
      throw new CliError('invalid-args', `Informe no máximo uma tarefa (FING-N). ${USAGE}`);
    }
    const [task] = args.positionals;
    if (task !== undefined && !/^FING-\d+$/i.test(task)) {
      throw new CliError('invalid-args', `Tarefa inválida: "${task}". Use o formato FING-N. ${USAGE}`);
    }
    if (!ctx.fs.exists(`${PKG_DIR}/package.json`) || !ctx.fs.exists(`${PKG_DIR}/node_modules`)) {
      throw new CliError('blocked', 'Pacote @financeguy/fg-tui ou dependências ausentes. Rode: pnpm install');
    }

    const forwarded: string[] = [];
    for (const flag of ['demo', 'once', 'dump']) {
      if (hasFlag(args, flag)) forwarded.push(`--${flag}`);
    }
    for (const dir of flagStrings(args, 'dir')) forwarded.push('--dir', resolve(dir));
    const root = flagString(args, 'root');
    if (root) forwarded.push('--root', resolve(root));
    forwarded.push(...args.positionals);

    const result = await runSteps('tui', [
      {
        name: 'fg-tui',
        command: 'pnpm',
        args: ['--reporter=silent', '--filter', '@financeguy/fg-tui', 'exec', 'tsx', 'src/main.tsx', ...forwarded],
      },
    ], ctx);
    return { ...result, quiet: true };
  },
};
