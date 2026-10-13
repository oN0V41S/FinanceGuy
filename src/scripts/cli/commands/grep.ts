import { flagString } from '../core/args';
import { CliError, emptyResult } from '../core/errors';
import { AREAS, matchesArea, walkFiles } from '../core/walk';
import type { Command } from '../core/types';

const MAX_MATCHES = 200;

export function compileRegex(source: string): RegExp {
  try {
    return new RegExp(source);
  } catch {
    throw new CliError('invalid-args', `Regex inválida: ${source}`);
  }
}

export const grepCommand: Command = {
  name: 'grep',
  summary: 'Busca regex no conteúdo dos arquivos (src, docs, prisma), com contexto opcional',
  usage: ['fg grep "useGoals"', 'fg grep "prisma\\." --area backend -C 1'],
  async run(args, ctx) {
    const source = args.positionals[0];
    if (!source) throw new CliError('invalid-args', 'Informe uma regex. Ex.: fg grep "useGoals".');
    const area = flagString(args, 'area');
    if (area && !AREAS[area]) {
      throw new CliError('invalid-args', `Área desconhecida: ${area}. Use: ${Object.keys(AREAS).join(', ')}.`);
    }
    const contextRaw = flagString(args, 'C');
    const context = contextRaw === undefined ? 0 : Number.parseInt(contextRaw, 10);
    if (Number.isNaN(context) || context < 0) {
      throw new CliError('invalid-args', '-C precisa de um número inteiro >= 0.');
    }

    const regex = compileRegex(source);
    const matches: string[] = [];
    let truncated = false;

    for (const path of walkFiles(ctx.fs, ['src', 'docs', 'prisma']).filter((p) => matchesArea(p, area))) {
      const lines = ctx.fs.readFile(path).split(/\r?\n/);
      for (let i = 0; i < lines.length; i += 1) {
        if (!regex.test(lines[i])) continue;
        if (matches.length >= MAX_MATCHES) {
          truncated = true;
          break;
        }
        for (let j = Math.max(0, i - context); j <= Math.min(lines.length - 1, i + context); j += 1) {
          matches.push(`${path}:${j + 1}${j === i ? ':' : '-'} ${lines[j].trim()}`);
        }
      }
      if (truncated) break;
    }

    return emptyResult('grep', {
      message: truncated
        ? `Mostrando os primeiros ${MAX_MATCHES} resultados; refine a regex ou use --area.`
        : `${matches.length} linha(s) encontrada(s).`,
      matches,
    });
  },
};
