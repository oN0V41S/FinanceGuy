import { flagString, hasFlag } from '../core/args';
import { CliError, emptyResult } from '../core/errors';
import { assertWritable } from '../core/guards';
import { globToRegExp, walkFiles } from '../core/walk';
import { compileRegex } from './grep';
import type { Command } from '../core/types';

const MAX_FILES = 50;

export const replaceCommand: Command = {
  name: 'replace',
  summary: 'Substitui regex por texto em arquivos de src/docs (dry-run por padrão)',
  usage: ['fg replace "oldName" "newName" --glob "src/features/goals/**" [--write]'],
  async run(args, ctx) {
    const [source, replacement] = args.positionals;
    if (source === undefined || replacement === undefined) {
      throw new CliError('invalid-args', 'Use: fg replace <regex> <texto> [--glob padrão].');
    }
    compileRegex(source);
    const glob = flagString(args, 'glob');
    const globRegex = glob ? globToRegExp(glob.replace(/\\/g, '/')) : null;

    const changes: { path: string; content: string; count: number }[] = [];
    for (const path of walkFiles(ctx.fs, ['src', 'docs'])) {
      if (globRegex && !globRegex.test(path)) continue;
      const original = ctx.fs.readFile(path);
      let count = 0;
      const updated = original.replace(new RegExp(source, 'g'), (...m: unknown[]) => {
        count += 1;
        return expand(replacement, m);
      });
      if (updated !== original) changes.push({ path: assertWritable(path), content: updated, count });
    }

    if (changes.length > MAX_FILES) {
      throw new CliError(
        'blocked',
        `A substituição afetaria ${changes.length} arquivos (limite ${MAX_FILES}). Restrinja com --glob.`,
      );
    }

    const write = hasFlag(args, 'write');
    if (write) changes.forEach((c) => ctx.fs.writeFile(c.path, c.content));

    return emptyResult('replace', {
      status: write ? 'ok' : 'dry-run',
      message: write
        ? `${changes.length} arquivo(s) alterado(s).`
        : `Dry-run: nada foi gravado (${changes.length} arquivo(s) seriam alterados). Use --write para efetivar.`,
      modified: changes.map((c) => `${c.path} (${c.count})`),
      nextSteps: changes.length > 0 ? ['Rode: pnpm fg test <área afetada> e pnpm fg dev lint'] : [],
    });
  },
};

/** Expande $1..$9 e $& usando os argumentos do callback de String.replace. */
function expand(template: string, m: unknown[]): string {
  const groupCount = m.findIndex((v) => typeof v === 'number');
  return template.replace(/\$(&|\d)/g, (_, token: string) => {
    if (token === '&') return String(m[0]);
    const index = Number(token);
    return index > 0 && index < groupCount ? String(m[index] ?? '') : '';
  });
}
