import { describe, expect, it } from 'vitest';
import { readState } from './readState.js';
import type { FsLike } from './types.js';

const DIR = '/repo/FinanceGuy-FING-30';

function norm(p: string): string {
  return p.replace(/\\/g, '/');
}

function fakeFs(files: Record<string, string>, opts: { throwOnRead?: boolean } = {}): FsLike {
  const mapa = new Map(Object.entries(files).map(([k, v]) => [norm(k), v]));
  return {
    exists: (p) => mapa.has(norm(p)),
    readFile: (p) => {
      if (opts.throwOnRead) throw new Error('EACCES: permissão negada');
      const conteudo = mapa.get(norm(p));
      if (conteudo === undefined) throw new Error('ENOENT');
      return conteudo;
    },
  };
}

function estadoValido(): Record<string, unknown> {
  return {
    code: 'FING-30',
    slug: 'fg-tui',
    notionPageUrl: 'https://notion.so/x',
    specPath: 'docs/specs/FING-30-fg-tui.md',
    worktree: DIR,
    baseSha: 'abc1234',
    state: 'step_2_running',
    steps: [],
    review: { cycles: 0, findings: [] },
    updatedAt: '2026-11-01T10:00:00.000Z',
  };
}

const ARQUIVO = `${DIR}/.fg-pipeline.json`;

describe('readState - symlink', () => {
  it('recusa .fg-pipeline.json que é link simbólico', () => {
    const fsLink = {
      exists: () => true,
      readFile: () => '{}',
      isSymlink: () => true,
    };
    const r = readState('/w', fsLink);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.kind).toBe('unreadable');
      expect(r.message).toMatch(/link simbólico/);
    }
  });
});

describe('readState', () => {
  it('dado um JSON válido, quando lido, então retorna ok com o estado', () => {
    const resultado = readState(DIR, fakeFs({ [ARQUIVO]: JSON.stringify(estadoValido()) }));
    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.state.code).toBe('FING-30');
  });

  it('dado arquivo ausente, quando lido, então retorna missing', () => {
    const resultado = readState(DIR, fakeFs({}));
    expect(resultado).toMatchObject({ ok: false, kind: 'missing' });
  });

  it('dado JSON truncado, quando lido, então retorna invalid-json', () => {
    const resultado = readState(DIR, fakeFs({ [ARQUIVO]: '{"code": "FING-30", "slug":' }));
    expect(resultado).toMatchObject({ ok: false, kind: 'invalid-json' });
  });

  it('dado campo obrigatório ausente, quando lido, então retorna invalid-schema citando o campo', () => {
    const { slug: _slug, ...semSlug } = estadoValido();
    const resultado = readState(DIR, fakeFs({ [ARQUIVO]: JSON.stringify(semSlug) }));
    expect(resultado).toMatchObject({ ok: false, kind: 'invalid-schema' });
    if (!resultado.ok) expect(resultado.message).toContain('slug');
  });

  it('dado campo extra desconhecido, quando lido, então aceita', () => {
    const json = JSON.stringify({ ...estadoValido(), campoNovo: true });
    expect(readState(DIR, fakeFs({ [ARQUIVO]: json })).ok).toBe(true);
  });

  it('dado exceção no readFile, quando lido, então retorna unreadable', () => {
    const fs = fakeFs({ [ARQUIVO]: JSON.stringify(estadoValido()) }, { throwOnRead: true });
    expect(readState(DIR, fs)).toMatchObject({ ok: false, kind: 'unreadable' });
  });

  it('dado schema inválido, quando lido, então a mensagem não despeja o conteúdo do arquivo', () => {
    const json = JSON.stringify({ ...estadoValido(), slug: undefined, reason: 'SEGREDO-NAO-VAZAR' });
    const resultado = readState(DIR, fakeFs({ [ARQUIVO]: json }));
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.message).not.toContain('SEGREDO-NAO-VAZAR');
  });

  it('lê somente o arquivo fixo .fg-pipeline.json dentro do diretório', () => {
    const lidos: string[] = [];
    const fs: FsLike = {
      exists: (p) => {
        lidos.push(norm(p));
        return false;
      },
      readFile: (p) => {
        lidos.push(norm(p));
        return '';
      },
    };
    readState(DIR, fs);
    expect(lidos.length).toBeGreaterThan(0);
    for (const p of lidos) expect(p).toBe(ARQUIVO);
  });
});

describe('readState limite de tamanho', () => {
  it('recusa arquivo acima de 1MB como unreadable', () => {
    const fs = { exists: () => true, readFile: () => ' '.repeat(1_000_001) };
    const r = readState('/x', fs);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe('unreadable');
  });
});
