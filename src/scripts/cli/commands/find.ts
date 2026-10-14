import { flagString } from '../core/args';
import { CliError, emptyResult } from '../core/errors';
import { AREAS, globToRegExp, matchesArea, walkFiles } from '../core/walk';
import type { Command } from '../core/types';

export const findCommand: Command = {
  name: 'find',
  summary: 'Busca arquivos por nome (substring ou glob), ignorando node_modules/.next/coverage',
  usage: ['fg find GoalCard', 'fg find "*.test.tsx" --area tests', 'fg find service --area backend'],
  async run(args, ctx) {
    const pattern = args.positionals[0];
    if (!pattern) throw new CliError('invalid-args', 'Informe um padrão. Ex.: fg find GoalCard.');
    const area = flagString(args, 'area');
    if (area && !AREAS[area]) {
      throw new CliError('invalid-args', `Área desconhecida: ${area}. Use: ${Object.keys(AREAS).join(', ')}.`);
    }

    const isGlob = /[*?]/.test(pattern);
    const regex = isGlob ? globToRegExp(pattern) : null;
    const needle = pattern.toLowerCase();

    const matches = walkFiles(ctx.fs, ['src', 'docs', 'prisma', '.opencode', '.claude/skills'], /./)
      .filter((p) => matchesArea(p, area))
      .filter((p) => (regex ? regex.test(p) : p.toLowerCase().includes(needle)));

    return emptyResult('find', {
      message: `${matches.length} arquivo(s) encontrado(s).`,
      matches,
    });
  },
};
