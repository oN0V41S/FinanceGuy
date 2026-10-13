import { CliError } from '../core/errors';
import { runSteps } from '../core/steps';
import type { Command } from '../core/types';

const TARGETS: Record<string, string> = { start: 'dev', build: 'build', lint: 'lint' };

export const devCommand: Command = {
  name: 'dev',
  summary: 'Atalhos de pnpm dev/build/lint',
  usage: ['fg dev start', 'fg dev build', 'fg dev lint'],
  async run(args, ctx) {
    const target = args.positionals[0];
    const script = target ? TARGETS[target] : undefined;
    if (!script) {
      throw new CliError('invalid-args', 'Use: fg dev start | build | lint.');
    }
    return runSteps('dev', [{ name: script, command: 'pnpm', args: [script] }], ctx);
  },
};
