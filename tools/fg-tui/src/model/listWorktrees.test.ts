import { describe, expect, it } from 'vitest';
import { listWorktrees } from './listWorktrees.js';
import type { FsLike, GitLike } from './types.js';

const REPO = '/repo/FinanceGuy';

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

function fakeGit(saida: string): GitLike {
  return { worktreeListPorcelain: () => saida };
}

function estadoJson(code: string, state: string): string {
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

const PORCELAIN = [
  `worktree ${REPO}`,
  'HEAD aaaaaaa',
  'branch refs/heads/main',
  '',
  'worktree /repo/FinanceGuy-FING-30',
  'HEAD bbbbbbb',
  'branch refs/heads/FING-30',
  '',
  'worktree /repo/FinanceGuy-FING-31',
  'HEAD ccccccc',
  'branch refs/heads/FING-31',
  '',
  'worktree /repo/FinanceGuy-detached',
  'HEAD ddddddd',
  'detached',
  '',
].join('\n');

const ARQ = '.fg-pipeline.json';

describe('listWorktrees', () => {
  it('dado nenhuma worktree com estado, então devolve lista vazia', () => {
    expect(listWorktrees(REPO, fakeGit(PORCELAIN), fakeFs({}))).toEqual([]);
  });

  it('mantém só as worktrees que têm .fg-pipeline.json', () => {
    const fs = fakeFs({ [`/repo/FinanceGuy-FING-30/${ARQ}`]: estadoJson('FING-30', 'step_2_running') });
    const refs = listWorktrees(REPO, fakeGit(PORCELAIN), fs);
    expect(refs).toHaveLength(1);
    expect(refs[0]?.path.replace(/\\/g, '/')).toBe('/repo/FinanceGuy-FING-30');
  });

  it('preenche branch, code e state quando o estado é legível', () => {
    const fs = fakeFs({ [`/repo/FinanceGuy-FING-30/${ARQ}`]: estadoJson('FING-30', 'committed') });
    const [ref] = listWorktrees(REPO, fakeGit(PORCELAIN), fs);
    expect(ref).toMatchObject({ branch: 'FING-30', code: 'FING-30', state: 'committed' });
  });

  it('dado estado ilegível, então mantém a worktree com code e state null', () => {
    const fs = fakeFs({ [`/repo/FinanceGuy-FING-31/${ARQ}`]: '{"truncado":' });
    const [ref] = listWorktrees(REPO, fakeGit(PORCELAIN), fs);
    expect(ref).toMatchObject({ branch: 'FING-31', code: null, state: null });
  });

  it('dado worktree com HEAD destacado, então branch é null', () => {
    const fs = fakeFs({ [`/repo/FinanceGuy-detached/${ARQ}`]: estadoJson('FING-9', 'pushed') });
    const [ref] = listWorktrees(REPO, fakeGit(PORCELAIN), fs);
    expect(ref?.branch).toBeNull();
    expect(ref?.code).toBe('FING-9');
  });

  it('lista várias worktrees com estado, na ordem do git', () => {
    const fs = fakeFs({
      [`/repo/FinanceGuy-FING-30/${ARQ}`]: estadoJson('FING-30', 'committed'),
      [`/repo/FinanceGuy-FING-31/${ARQ}`]: estadoJson('FING-31', 'spec_approved'),
    });
    const refs = listWorktrees(REPO, fakeGit(PORCELAIN), fs);
    expect(refs.map((r) => r.code)).toEqual(['FING-30', 'FING-31']);
  });

  it('dado saída vazia do git (fora de repositório), então devolve lista vazia sem lançar', () => {
    expect(listWorktrees(REPO, fakeGit(''), fakeFs({}))).toEqual([]);
  });

  it('dado git que lança (indisponível), então devolve lista vazia sem lançar', () => {
    const git: GitLike = {
      worktreeListPorcelain: () => {
        throw new Error('git: command not found');
      },
    };
    expect(listWorktrees(REPO, git, fakeFs({}))).toEqual([]);
  });
});
