import { flagString, hasFlag } from '../core/args';
import { CliError } from '../core/errors';
import { runSteps } from '../core/steps';
import type { Command } from '../core/types';

/** Regex (padrão posicional do jest) por área do projeto. */
const AREA_PATTERNS: Record<string, string> = {
  frontend: 'components|hooks|src/app/(?!api)',
  backend: 'api|service|repository|validations',
  db: 'repository',
};

export const testCommand: Command = {
  name: 'test',
  summary: 'npx jest filtrado por alvo/área',
  usage: [
    'fg test [alvo]',
    'fg test --area frontend|backend|db',
    'fg test src/features/goals --coverage',
    'fg test -t "nome do teste"',
  ],
  async run(args, ctx) {
    const area = flagString(args, 'area');
    if (area && !AREA_PATTERNS[area]) {
      throw new CliError('invalid-args', `Área desconhecida: ${area}. Use: ${Object.keys(AREA_PATTERNS).join(', ')}.`);
    }

    const jestArgs = ['jest', ...args.positionals];
    if (args.positionals.length === 0 && area) jestArgs.push(AREA_PATTERNS[area]);
    if (hasFlag(args, 'coverage')) jestArgs.push('--coverage');
    const name = flagString(args, 't');
    if (name) jestArgs.push('-t', name);

    return runSteps('test', [{ name: 'jest', command: 'npx', args: jestArgs }], ctx, [
      'Rode também: pnpm fg dev lint',
    ]);
  },
};
