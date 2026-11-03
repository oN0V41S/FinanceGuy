import { describe, expect, it } from 'vitest';
import { formatSummary, readSummaries, resolveTargets, summarizeState } from './aggregate.js';
import { demoState } from './demo.js';
import type { FsLike, GitLike } from './types.js';

const git: GitLike = { worktreeListPorcelain: () => '' };

function norm(p: string): string {
  return p.split(String.fromCharCode(92)).join('/');
}

interface Setup {
  files?: Record<string, string>;
  dirs?: string[];
  links?: string[];
  listing?: Record<string, string[]>;
}

function makeFs(setup: Setup) {
  const files = setup.files ?? {};
  const dirs = new Set(setup.dirs ?? []);
  const links = new Set(setup.links ?? []);
  const listing = setup.listing ?? {};
  const fs: FsLike & {
    isSymlink(p: string): boolean;
    isDirectory(p: string): boolean;
    listDir(p: string): string[];
  } = {
    exists: (p) => norm(p) in files,
    readFile: (p) => files[norm(p)] ?? '',
    isSymlink: (p) => links.has(norm(p)),
    isDirectory: (p) => dirs.has(norm(p)),
    listDir: (p) => {
      const names = listing[norm(p)];
      if (names === undefined) throw new Error('ENOENT');
      return names;
    },
  };
  return fs;
}

function stateJson(code: string, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ ...demoState(), code, ...overrides });
}

describe('resolveTargets', () => {
  it('--dir repetido resolve cada worktree na ordem e remove duplicatas', () => {
    const fs = makeFs({
      dirs: ['/w/a', '/w/b'],
      files: { '/w/a/.fg-pipeline.json': stateJson('FING-1'), '/w/b/.fg-pipeline.json': stateJson('FING-2') },
    });
    const r = resolveTargets({ dirs: ['/w/a', '/w/b', '/w/a'], repoRoot: '/w', git, fs });
    expect(r.kind).toBe('ok');
    if (r.kind !== 'ok') return;
    expect(r.refs.map((x) => x.code)).toEqual(['FING-1', 'FING-2']);
  });

  it('--dir inexistente ou symlink devolve not-found acionável', () => {
    const fs = makeFs({ dirs: ['/w/a'], links: ['/w/a'] });
    const link = resolveTargets({ dirs: ['/w/a'], repoRoot: '/w', git, fs });
    expect(link).toMatchObject({ kind: 'not-found' });
    const missing = resolveTargets({ dirs: ['/w/zzz'], repoRoot: '/w', git, fs });
    expect(missing).toMatchObject({ kind: 'not-found' });
  });

  it('--root varre só subpastas diretas com estado, ignora symlink e sem estado', () => {
    const fs = makeFs({
      dirs: ['/r', '/r/a', '/r/b', '/r/semestado', '/r/link', '/r/a/profunda'],
      links: ['/r/link'],
      listing: { '/r': ['b', 'a', 'semestado', 'link', 'arquivo.txt'] },
      files: {
        '/r/a/.fg-pipeline.json': stateJson('FING-1'),
        '/r/b/.fg-pipeline.json': stateJson('FING-2'),
        '/r/link/.fg-pipeline.json': stateJson('FING-3'),
        '/r/a/profunda/.fg-pipeline.json': stateJson('FING-4'),
      },
    });
    const r = resolveTargets({ dirs: [], root: '/r', repoRoot: '/r', git, fs });
    expect(r.kind).toBe('ok');
    if (r.kind !== 'ok') return;
    expect(r.refs.map((x) => x.code)).toEqual(['FING-1', 'FING-2']);
  });

  it('--root symlink, inexistente ou ilegível devolve not-found', () => {
    const fs = makeFs({ dirs: ['/r', '/s'], links: ['/s'], listing: {} });
    expect(resolveTargets({ dirs: [], root: '/s', repoRoot: '/', git, fs })).toMatchObject({ kind: 'not-found' });
    expect(resolveTargets({ dirs: [], root: '/nada', repoRoot: '/', git, fs })).toMatchObject({ kind: 'not-found' });
    expect(resolveTargets({ dirs: [], root: '/r', repoRoot: '/', git, fs })).toMatchObject({ kind: 'not-found' });
  });

  it('--root vazio devolve none; --dir e --root se combinam sem duplicar', () => {
    const fs = makeFs({
      dirs: ['/r', '/r/a'],
      listing: { '/r': ['a'] },
      files: { '/r/a/.fg-pipeline.json': stateJson('FING-1') },
    });
    const both = resolveTargets({ dirs: ['/r/a'], root: '/r', repoRoot: '/r', git, fs });
    expect(both.kind === 'ok' && both.refs).toHaveLength(1);
    const empty = makeFs({ dirs: ['/e'], listing: { '/e': [] } });
    expect(resolveTargets({ dirs: [], root: '/e', repoRoot: '/e', git, fs: empty })).toEqual({ kind: 'none' });
  });
});

describe('resumo por pipeline', () => {
  it('formata FING-N · state · etapa atual · k/n', () => {
    const state = demoState();
    const summary = summarizeState(state);
    const text = formatSummary(summary);
    expect(text.startsWith(`${state.code} · ${state.state} · `)).toBe(true);
    expect(text.endsWith(`${summary.done}/${state.steps.length}`)).toBe(true);
  });

  it('etapa em andamento tem prioridade; sem etapa abertas usa travessão', () => {
    const base = demoState();
    const running = summarizeState({
      ...base,
      steps: [
        { index: 1, agent: 'backend-engineer', sessionID: null, model: null, commit: null, status: 'done' },
        { index: 2, agent: 'frontend', sessionID: null, model: null, commit: null, status: 'running' },
        { index: 3, agent: 'qa', sessionID: null, model: null, commit: null, status: 'pending' },
      ],
    });
    expect(running.currentStep).toBe('etapa 2 (frontend)');
    expect(running.done).toBe(1);
    expect(running.total).toBe(3);
    const finished = summarizeState({
      ...base,
      steps: [{ index: 1, agent: 'x', sessionID: null, model: null, commit: null, status: 'done' }],
    });
    expect(formatSummary(finished)).toContain(' · — · 1/1');
  });

  it('readSummaries devolve null para estado ilegível, sem lançar', () => {
    const fs = makeFs({ files: { '/a/.fg-pipeline.json': stateJson('FING-1'), '/b/.fg-pipeline.json': '{quebrado' } });
    const out = readSummaries(
      [
        { path: '/a', branch: null, code: null, state: null },
        { path: '/b', branch: null, code: null, state: null },
        { path: '/c', branch: null, code: null, state: null },
      ],
      fs,
    );
    expect(out[0]?.code).toBe('FING-1');
    expect(out[1]).toBeNull();
    expect(out[2]).toBeNull();
  });
});
