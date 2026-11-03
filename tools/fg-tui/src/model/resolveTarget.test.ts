import { describe, expect, it } from 'vitest';
import { resolveTarget } from './resolveTarget.js';
import type { FsLike, GitLike } from './types.js';

const REPO = '/repo/FinanceGuy';
const ARQ = '.fg-pipeline.json';

function norm(p: string): string {
  return p.replace(/\\/g, '/');
}

function fakeFs(files: Record<string, string>): FsLike {
  const mapa = new Map(Object.entries(files).map(([k, v]) => [norm(k), v]));
  return {
    exists: (p) => mapa.has(norm(p)),
    readFile: (p) => {
      const conteudo = mapa.get(norm(p));
      if (conteudo === undefined) throw new Error('ENOENT');
      return conteudo;
    },
  };
}

function estadoJson(code: string, state = 'step_1_running'): string {
  return JSON.stringify({
    code,
    slug: 'x',
    notionPageUrl: 'u',
    specPath: 's',
    worktree: 'w',
    baseSha: 'b',
    state,
    steps: [],
    review: { cycles: 0, findings: [] },
    updatedAt: '2026-11-01T10:00:00.000Z',
  });
}

function gitCom(worktrees: Array<{ path: string; branch: string | null }>): GitLike {
  const blocos = [`worktree ${REPO}`, 'HEAD aaaaaaa', 'branch refs/heads/main', ''];
  for (const w of worktrees) {
    blocos.push(`worktree ${w.path}`, 'HEAD bbbbbbb', w.branch ? `branch refs/heads/${w.branch}` : 'detached', '');
  }
  return { worktreeListPorcelain: () => blocos.join('\n') };
}

const W30 = '/repo/FinanceGuy-FING-30';
const W31 = '/repo/FinanceGuy-FING-31';

describe('resolveTarget - descoberta automática', () => {
  it('dado nenhuma worktree com estado, então none', () => {
    const git = gitCom([{ path: W30, branch: 'FING-30' }]);
    expect(resolveTarget({ repoRoot: REPO, git, fs: fakeFs({}) })).toEqual({ kind: 'none' });
  });

  it('dado exatamente uma worktree com estado, então one', () => {
    const git = gitCom([{ path: W30, branch: 'FING-30' }]);
    const fs = fakeFs({ [`${W30}/${ARQ}`]: estadoJson('FING-30') });
    const resultado = resolveTarget({ repoRoot: REPO, git, fs });
    expect(resultado.kind).toBe('one');
    if (resultado.kind === 'one') expect(resultado.ref.code).toBe('FING-30');
  });

  it('dado duas worktrees com estado, então many com as duas', () => {
    const git = gitCom([
      { path: W30, branch: 'FING-30' },
      { path: W31, branch: 'FING-31' },
    ]);
    const fs = fakeFs({
      [`${W30}/${ARQ}`]: estadoJson('FING-30'),
      [`${W31}/${ARQ}`]: estadoJson('FING-31'),
    });
    const resultado = resolveTarget({ repoRoot: REPO, git, fs });
    expect(resultado.kind).toBe('many');
    if (resultado.kind === 'many') expect(resultado.refs).toHaveLength(2);
  });
});

describe('resolveTarget - --dir', () => {
  it('dado --dir com estado, então one e prevalece sobre as demais worktrees', () => {
    const git = gitCom([
      { path: W30, branch: 'FING-30' },
      { path: W31, branch: 'FING-31' },
    ]);
    const fs = fakeFs({
      [`${W30}/${ARQ}`]: estadoJson('FING-30'),
      [`${W31}/${ARQ}`]: estadoJson('FING-31'),
    });
    const resultado = resolveTarget({ dir: W31, repoRoot: REPO, git, fs });
    expect(resultado.kind).toBe('one');
    if (resultado.kind === 'one') {
      expect(resultado.ref.path.replace(/\\/g, '/')).toBe(W31);
      expect(resultado.ref.code).toBe('FING-31');
    }
  });

  it('dado --dir fora da lista do git mas com estado, então one', () => {
    const fs = fakeFs({ ['/outro/lugar/' + ARQ]: estadoJson('FING-5') });
    const resultado = resolveTarget({ dir: '/outro/lugar', repoRoot: REPO, git: gitCom([]), fs });
    expect(resultado.kind).toBe('one');
  });

  it('dado --dir sem .fg-pipeline.json, então not-found com mensagem acionável', () => {
    const resultado = resolveTarget({ dir: '/vazio', repoRoot: REPO, git: gitCom([]), fs: fakeFs({}) });
    expect(resultado.kind).toBe('not-found');
    if (resultado.kind === 'not-found') {
      expect(resultado.message).toContain('/vazio');
      expect(resultado.message).toContain('.fg-pipeline.json');
    }
  });

  it('--dir sem estado não cai no automático, mesmo havendo outra worktree válida', () => {
    const git = gitCom([{ path: W30, branch: 'FING-30' }]);
    const fs = fakeFs({ [`${W30}/${ARQ}`]: estadoJson('FING-30') });
    expect(resolveTarget({ dir: '/vazio', repoRoot: REPO, git, fs }).kind).toBe('not-found');
  });
});

describe('resolveTarget - FING-N', () => {
  it('casa por state.code', () => {
    const git = gitCom([
      { path: W30, branch: null },
      { path: W31, branch: null },
    ]);
    const fs = fakeFs({
      [`${W30}/${ARQ}`]: estadoJson('FING-30'),
      [`${W31}/${ARQ}`]: estadoJson('FING-31'),
    });
    const resultado = resolveTarget({ code: 'FING-31', repoRoot: REPO, git, fs });
    expect(resultado.kind).toBe('one');
    if (resultado.kind === 'one') expect(resultado.ref.code).toBe('FING-31');
  });

  it('casa por branch quando o estado está ilegível', () => {
    const git = gitCom([
      { path: W30, branch: 'FING-30' },
      { path: W31, branch: 'FING-31' },
    ]);
    const fs = fakeFs({
      [`${W30}/${ARQ}`]: estadoJson('FING-30'),
      [`${W31}/${ARQ}`]: '{"truncado":',
    });
    const resultado = resolveTarget({ code: 'FING-31', repoRoot: REPO, git, fs });
    expect(resultado.kind).toBe('one');
    if (resultado.kind === 'one') expect(resultado.ref.branch).toBe('FING-31');
  });

  it('dado FING-N sem correspondência, então not-found citando o código', () => {
    const git = gitCom([{ path: W30, branch: 'FING-30' }]);
    const fs = fakeFs({ [`${W30}/${ARQ}`]: estadoJson('FING-30') });
    const resultado = resolveTarget({ code: 'FING-99', repoRoot: REPO, git, fs });
    expect(resultado.kind).toBe('not-found');
    if (resultado.kind === 'not-found') expect(resultado.message).toContain('FING-99');
  });

  it('dado FING-N ambíguo (duas worktrees com o mesmo code), então many filtrado', () => {
    const git = gitCom([
      { path: W30, branch: 'FING-30' },
      { path: W31, branch: 'FING-30-retry' },
    ]);
    const fs = fakeFs({
      [`${W30}/${ARQ}`]: estadoJson('FING-30'),
      [`${W31}/${ARQ}`]: estadoJson('FING-30'),
    });
    const resultado = resolveTarget({ code: 'FING-30', repoRoot: REPO, git, fs });
    expect(resultado.kind).toBe('many');
    if (resultado.kind === 'many') expect(resultado.refs).toHaveLength(2);
  });
});
