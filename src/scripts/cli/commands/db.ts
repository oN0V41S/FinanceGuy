import { hasFlag } from '../core/args';
import { CliError } from '../core/errors';
import { runSteps } from '../core/steps';
import type { Command } from '../core/types';

export const dbCommand: Command = {
  name: 'db',
  summary: 'Prisma: generate, studio e push (push exige --yes)',
  usage: ['fg db generate', 'fg db studio', 'fg db push --yes'],
  async run(args, ctx) {
    const action = args.positionals[0];

    if (action === 'generate' || action === 'studio') {
      return runSteps('db', [{ name: `prisma ${action}`, command: 'npx', args: ['prisma', action] }], ctx);
    }

    if (action === 'push') {
      if (!hasFlag(args, 'yes')) {
        throw new CliError(
          'blocked',
          'prisma db push altera o schema do banco. Confirme com --yes e evite rodar contra produção.',
        );
      }
      return runSteps('db', [{ name: 'prisma db push', command: 'npx', args: ['prisma', 'db', 'push'] }], ctx, [
        'Rode: pnpm fg db generate',
      ]);
    }

    throw new CliError('invalid-args', 'Use: fg db generate | studio | push --yes.');
  },
};
