import { runSteps } from '../core/steps';
import type { Command } from '../core/types';

export const auditCommand: Command = {
  name: 'audit',
  summary: 'Executa o context-audit (somente leitura)',
  usage: ['fg audit'],
  run(_args, ctx) {
    return runSteps(
      'audit',
      [{ name: 'context-audit', command: 'node', args: ['.opencode/scripts/context-audit.js', 'after'] }],
      ctx,
    );
  },
};
