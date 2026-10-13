import { runSteps } from '../core/steps';
import type { Command } from '../core/types';

export const prCommand: Command = {
  name: 'pr',
  summary: 'Pipeline pré-PR: lint → coverage → build → audit',
  usage: ['fg pr'],
  run(_args, ctx) {
    return runSteps(
      'pr',
      [
        { name: 'Lint', command: 'pnpm', args: ['run', 'lint'] },
        { name: 'Test Coverage', command: 'pnpm', args: ['run', 'test:coverage'] },
        { name: 'Build', command: 'pnpm', args: ['run', 'build'] },
        { name: 'Security Audit', command: 'pnpm', args: ['audit'] },
      ],
      ctx,
      [
        'Revisão manual: aderência à Clean Architecture e à identidade visual (docs/ui-guidelines.md).',
        'PR pronto para abrir (Conventional Commits, GitHub Flow).',
      ],
    );
  },
};
