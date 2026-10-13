import * as nodeFs from 'fs';
import { posix, resolve } from 'path';
import type { FsEntry, FsPort } from './types';

export function createRealFs(root: string): FsPort {
  const abs = (p: string): string => resolve(root, p);

  return {
    exists: (p) => nodeFs.existsSync(abs(p)),
    readFile: (p) => nodeFs.readFileSync(abs(p), 'utf8'),
    writeFile(p, content) {
      nodeFs.mkdirSync(resolve(abs(p), '..'), { recursive: true });
      nodeFs.writeFileSync(abs(p), content, 'utf8');
    },
    remove(p) {
      nodeFs.rmSync(abs(p), { force: true });
      // Limpa diretórios vazios deixados para trás (sem nunca subir acima de src/docs).
      let dir = posix.dirname(p);
      while (dir.includes('/')) {
        try {
          nodeFs.rmdirSync(abs(dir));
        } catch {
          break;
        }
        dir = posix.dirname(dir);
      }
    },
    list(dir) {
      const target = abs(dir);
      if (!nodeFs.existsSync(target)) return [];
      return nodeFs
        .readdirSync(target, { withFileTypes: true })
        .map((e): FsEntry => ({ name: e.name, isDir: e.isDirectory() }));
    },
  };
}

export interface MemoryFs extends FsPort {
  files: Map<string, string>;
}

/** FS em memória para testes. Diretórios são implícitos (derivados dos caminhos). */
export function createMemoryFs(initial: Record<string, string> = {}): MemoryFs {
  const files = new Map<string, string>(Object.entries(initial));
  const isDir = (p: string): boolean => {
    const prefix = p === '' || p === '.' ? '' : `${p}/`;
    return [...files.keys()].some((k) => k.startsWith(prefix) && k !== p);
  };

  return {
    files,
    exists: (p) => files.has(p) || isDir(p),
    readFile(p) {
      const content = files.get(p);
      if (content === undefined) throw new Error(`ENOENT: ${p}`);
      return content;
    },
    writeFile(p, content) {
      files.set(p, content);
    },
    remove(p) {
      files.delete(p);
    },
    list(dir) {
      const prefix = dir === '' || dir === '.' ? '' : `${dir}/`;
      const seen = new Map<string, boolean>();
      for (const key of files.keys()) {
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        const slash = rest.indexOf('/');
        const name = slash === -1 ? rest : rest.slice(0, slash);
        seen.set(name, slash !== -1 || seen.get(name) === true);
      }
      return [...seen.entries()].map(([name, dirFlag]) => ({ name, isDir: dirFlag }));
    },
  };
}
