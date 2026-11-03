import { PipelineStateSchema } from './schema.js';
import type { FsLike, ReadResult } from './types.js';

export const STATE_FILE = '.fg-pipeline.json';

/** Junta o diretório ao nome fixo do arquivo de estado (nunca outro caminho). */
export function stateFilePath(dir: string): string {
  return `${dir.replace(/[\\/]+$/, '')}/${STATE_FILE}`;
}

/** Lê e valida `<dir>/.fg-pipeline.json`. Nunca lança: devolve o motivo tipado. */
export function readState(dir: string, fs: FsLike): ReadResult {
  const file = stateFilePath(dir);

  let raw: string;
  try {
    if (!fs.exists(file)) {
      return {
        ok: false,
        kind: 'missing',
        message: `Esta worktree não tem estado de pipeline (${STATE_FILE}).`,
      };
    }
    raw = fs.readFile(file);
  } catch {
    return {
      ok: false,
      kind: 'unreadable',
      message: `Não foi possível ler ${STATE_FILE}.`,
    };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      kind: 'invalid-json',
      message: `${STATE_FILE} ainda está sendo gravado ou contém JSON inválido.`,
    };
  }

  const parsed = PipelineStateSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue && issue.path.length > 0 ? issue.path.map(String).join('.') : 'raiz';
    return {
      ok: false,
      kind: 'invalid-schema',
      message: `Estado com formato inesperado: campo inválido "${field}".`,
    };
  }

  return { ok: true, state: parsed.data };
}
