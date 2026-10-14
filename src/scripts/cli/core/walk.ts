import type { FsPort } from './types';

const IGNORED_DIRS = new Set(['node_modules', '.next', 'coverage', '.git', 'worktrees']);
const TEXT_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|prisma|css)$/;

export const SOURCE_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

/** Lista recursivamente os arquivos de texto sob `roots`, ignorando node_modules/.next/coverage. */
export function walkFiles(fs: FsPort, roots: string[], filter: RegExp = TEXT_EXTENSIONS): string[] {
  const out: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of fs.list(dir)) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const path = dir === '' || dir === '.' ? entry.name : `${dir}/${entry.name}`;
      if (entry.isDir) visit(path);
      else if (filter.test(entry.name)) out.push(path);
    }
  };
  roots.forEach(visit);
  return out.sort();
}

/** Áreas do projeto → regex aplicada ao caminho do arquivo. */
export const AREAS: Record<string, RegExp> = {
  frontend: /(\/components\/|\/hooks\/|^src\/app\/(?!api\/))/,
  backend: /(\/api\/|service|repository|validations|^src\/lib\/|^src\/core\/)/,
  tests: /(__tests__\/|\.(test|spec)\.tsx?$)/,
  db: /(^prisma\/|repository)/,
};

export function matchesArea(path: string, area: string | undefined): boolean {
  if (!area) return true;
  const regex = AREAS[area];
  return regex ? regex.test(path) : false;
}

export function globToRegExp(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\u0000/g, '.*');
  return new RegExp(`${escaped}$`, 'i');
}
