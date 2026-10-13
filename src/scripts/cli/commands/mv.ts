import { posix } from 'path';
import { hasFlag } from '../core/args';
import { CliError, emptyResult } from '../core/errors';
import { assertWritable } from '../core/guards';
import { SOURCE_EXTENSIONS, walkFiles } from '../core/walk';
import type { Command, FsPort } from '../core/types';

const EXTENSIONS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];

const IMPORT_PATTERN =
  /(\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bjest\.(?:mock|requireActual|doMock|unmock)\s*\(\s*|\bimport\s+)(['"])([^'"\n]+)\2/g;
const DYNAMIC_PATTERN = /\b(?:import|require)\s*\(\s*[^'"\s)]/;

interface Resolved {
  file: string;
  viaIndex: boolean;
}

function resolveSpecifier(from: string, spec: string, files: Set<string>): Resolved | null {
  let base: string;
  if (spec.startsWith('@/')) base = `src/${spec.slice(2)}`;
  else if (spec.startsWith('.')) base = posix.join(posix.dirname(from), spec);
  else return null;

  for (const ext of EXTENSIONS) {
    if (files.has(base + ext)) return { file: base + ext, viaIndex: false };
  }
  for (const ext of EXTENSIONS.slice(1)) {
    if (files.has(`${base}/index${ext}`)) return { file: `${base}/index${ext}`, viaIndex: true };
  }
  return null;
}

function stripExt(path: string): string {
  return path.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '');
}

function buildSpecifier(original: string, resolved: Resolved, newTarget: string, newFrom: string): string {
  const hadExt = !resolved.viaIndex && /\.[a-z]+$/.test(original) && original.endsWith(posix.extname(resolved.file));
  let base: string;
  if (hadExt) base = newTarget;
  else if (resolved.viaIndex && posix.basename(stripExt(newTarget)) === 'index') base = posix.dirname(newTarget);
  else base = stripExt(newTarget);

  if (original.startsWith('@/') && base.startsWith('src/')) return `@/${base.slice(4)}`;

  const rel = posix.relative(posix.dirname(newFrom), base);
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function collectMoves(fs: FsPort, src: string, dst: string): Map<string, string> {
  const moves = new Map<string, string>();
  const files = walkFiles(fs, [src], /./);
  if (files.length === 0 && fs.exists(src)) {
    moves.set(src, dst);
    return moves;
  }
  files.forEach((f) => moves.set(f, dst + f.slice(src.length)));
  return moves;
}

export const mvCommand: Command = {
  name: 'mv',
  summary: 'Move/renomeia arquivo ou pasta e reescreve imports (@/… e relativos)',
  usage: ['fg mv src/features/goals/GoalCard.tsx src/features/goals/components/GoalCard.tsx [--write]'],
  async run(args, ctx) {
    const [rawSrc, rawDst] = args.positionals;
    if (!rawSrc || !rawDst) throw new CliError('invalid-args', 'Use: fg mv <origem> <destino>.');
    const src = assertWritable(rawSrc);
    const dst = assertWritable(rawDst);

    if (!ctx.fs.exists(src)) throw new CliError('invalid-args', `Origem não encontrada: ${src}`);
    if (dst === src || dst.startsWith(`${src}/`)) {
      throw new CliError('invalid-args', 'O destino não pode ser a própria origem ou estar dentro dela.');
    }

    const moves = collectMoves(ctx.fs, src, dst);

    if (!hasFlag(args, 'force')) {
      const conflicts = [...moves.values()].filter((d) => ctx.fs.exists(d));
      if (conflicts.length > 0) {
        throw new CliError('blocked', 'Destino já existe. Use --force para sobrescrever.', conflicts);
      }
    }

    const sourceFiles = walkFiles(ctx.fs, ['src'], SOURCE_EXTENSIONS);
    const fileSet = new Set(walkFiles(ctx.fs, ['src'], /./));
    const risky: string[] = [];
    const writes = new Map<string, string>();
    const modified: string[] = [];

    for (const file of sourceFiles) {
      const original = ctx.fs.readFile(file);
      const newFile = moves.get(file) ?? file;

      if (moves.has(file) && DYNAMIC_PATTERN.test(original)) {
        risky.push(`${file}: import/require dinâmico não literal — revise manualmente`);
      }

      const updated = original.replace(IMPORT_PATTERN, (match, prefix: string, quote: string, spec: string) => {
        const resolved = resolveSpecifier(file, spec, fileSet);
        if (!resolved) return match;
        const newTarget = moves.get(resolved.file) ?? resolved.file;
        const isAlias = spec.startsWith('@/');
        if (isAlias ? newTarget === resolved.file : newTarget === resolved.file && newFile === file) return match;
        return `${prefix}${quote}${buildSpecifier(spec, resolved, newTarget, newFile)}${quote}`;
      });

      if (updated !== original) {
        writes.set(file, updated);
        if (!moves.has(file)) modified.push(file);
      }
    }

    if (risky.length > 0) {
      throw new CliError('failed', 'Operação cancelada: nenhum arquivo foi alterado.', risky);
    }

    const movedList = [...moves.entries()].map(([from, to]) => `${from} -> ${to}`);
    const write = hasFlag(args, 'write');

    if (write) {
      for (const [from, to] of moves) {
        ctx.fs.writeFile(to, writes.get(from) ?? ctx.fs.readFile(from));
        ctx.fs.remove(from);
      }
      for (const [file, content] of writes) {
        if (!moves.has(file)) ctx.fs.writeFile(file, content);
      }
    }

    return emptyResult('mv', {
      status: write ? 'ok' : 'dry-run',
      message: write
        ? `${moves.size} arquivo(s) movido(s); ${modified.length} arquivo(s) com imports atualizados.`
        : `Dry-run: nada foi gravado (${moves.size} movido(s), ${modified.length} com imports a atualizar). Use --write para efetivar.`,
      moved: movedList,
      modified,
      nextSteps: ['Rode: pnpm fg test <área afetada> e pnpm fg dev lint'],
    });
  },
};
