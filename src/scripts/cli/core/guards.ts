import { posix } from 'path';
import { CliError } from './errors';

const ALLOWED_PREFIXES = ['src/', 'docs/', '.claude/skills/'];
const DENIED_SEGMENTS = new Set(['node_modules', '.next', '.git']);
const DENIED_PREFIXES = ['prisma/migrations'];

/** Converte para caminho relativo ao repo com `/`. Bloqueia absolutos e `..`. */
export function normalizeRepoPath(input: string): string {
  const unified = input.replace(/\\/g, '/');
  if (/^([A-Za-z]:)?\//.test(unified)) {
    throw new CliError('blocked', `Caminho absoluto não é permitido: ${input}`);
  }
  const normalized = posix.normalize(unified).replace(/^\.\//, '');
  if (normalized === '..' || normalized.startsWith('../')) {
    throw new CliError('blocked', `Caminho fora do repositório não é permitido: ${input}`);
  }
  return normalized;
}

/** Garante que o caminho pode ser escrito: dentro de src/, docs/ ou .claude/skills/ e fora da denylist. */
export function assertWritable(input: string): string {
  const path = normalizeRepoPath(input);
  const segments = path.split('/');

  const denied =
    segments.some((s) => DENIED_SEGMENTS.has(s) || s.startsWith('.env')) ||
    DENIED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  if (denied) {
    throw new CliError('blocked', `Escrita bloqueada em área protegida: ${path}`);
  }

  if (!ALLOWED_PREFIXES.some((p) => path.startsWith(p))) {
    throw new CliError(
      'blocked',
      `Escrita permitida apenas em ${ALLOWED_PREFIXES.join(', ')}. Recebido: ${path}`,
    );
  }
  return path;
}
