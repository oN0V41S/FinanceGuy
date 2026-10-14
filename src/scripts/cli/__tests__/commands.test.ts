/** @jest-environment node */
import { runCli } from '../run';
import { makeCtx } from '../core/testing';

const AUDIT = [
  '| Palavras-chave | Doc | Sub-agente |',
  '|---|---|---|',
  '| componente, modal, ui | `docs/ui-guidelines.md` | frontend |',
  '| prisma, schema | `docs/architecture.md` | database-engineer |',
].join('\n');

describe('fg mv', () => {
  const base = {
    'src/features/goals/GoalCard.tsx': 'export const GoalCard = 1;',
    'src/app/page.tsx': "import { GoalCard } from '@/features/goals/GoalCard';",
    'src/features/goals/list.tsx': "import { GoalCard } from './GoalCard';",
  };

  it('dry-run não altera nada', async () => {
    const { ctx, fs } = makeCtx(base);
    const { exitCode } = await runCli(
      ['mv', 'src/features/goals/GoalCard.tsx', 'src/features/goals/components/GoalCard.tsx'],
      ctx,
    );
    expect(exitCode).toBe(0);
    expect(fs.exists('src/features/goals/GoalCard.tsx')).toBe(true);
  });

  it('--write move e reescreve imports alias e relativos', async () => {
    const { ctx, fs } = makeCtx(base);
    await runCli(
      ['mv', 'src/features/goals/GoalCard.tsx', 'src/features/goals/components/GoalCard.tsx', '--write'],
      ctx,
    );
    expect(fs.exists('src/features/goals/GoalCard.tsx')).toBe(false);
    expect(fs.files.get('src/app/page.tsx')).toContain("'@/features/goals/components/GoalCard'");
    expect(fs.files.get('src/features/goals/list.tsx')).toContain("'./components/GoalCard'");
  });

  it('bloqueia destino fora de src/docs/.claude/skills', async () => {
    const { ctx } = makeCtx(base);
    const { exitCode } = await runCli(['mv', 'src/features/goals/GoalCard.tsx', '.env', '--write'], ctx);
    expect(exitCode).toBe(3);
  });

  it('bloqueia destino existente sem --force', async () => {
    const { ctx } = makeCtx({ ...base, 'src/x.tsx': 'x' });
    const { exitCode } = await runCli(['mv', 'src/features/goals/GoalCard.tsx', 'src/x.tsx', '--write'], ctx);
    expect(exitCode).toBe(3);
  });

  it('cancela tudo se houver import dinâmico não literal no arquivo movido', async () => {
    const { ctx, fs } = makeCtx({ 'src/a.ts': 'const m = import(name);' });
    const { exitCode } = await runCli(['mv', 'src/a.ts', 'src/b.ts', '--write'], ctx);
    expect(exitCode).toBe(1);
    expect(fs.exists('src/a.ts')).toBe(true);
    expect(fs.exists('src/b.ts')).toBe(false);
  });
});

describe('fg replace', () => {
  it('dry-run lista sem gravar; --write grava', async () => {
    const { ctx, fs } = makeCtx({ 'src/a.ts': 'oldName oldName', 'src/b.ts': 'nada' });
    expect((await runCli(['replace', 'oldName', 'newName'], ctx)).exitCode).toBe(0);
    expect(fs.files.get('src/a.ts')).toBe('oldName oldName');
    await runCli(['replace', 'oldName', 'newName', '--write'], ctx);
    expect(fs.files.get('src/a.ts')).toBe('newName newName');
  });

  it('respeita --glob', async () => {
    const { ctx, fs } = makeCtx({ 'src/a/x.ts': 'foo', 'src/b/x.ts': 'foo' });
    await runCli(['replace', 'foo', 'bar', '--glob', 'src/a/**', '--write'], ctx);
    expect(fs.files.get('src/a/x.ts')).toBe('bar');
    expect(fs.files.get('src/b/x.ts')).toBe('foo');
  });

  it('bloqueia mais de 50 arquivos', async () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 51; i += 1) files[`src/f${i}.ts`] = 'foo';
    const { ctx } = makeCtx(files);
    expect((await runCli(['replace', 'foo', 'bar', '--write'], ctx)).exitCode).toBe(3);
  });

  it('regex inválida retorna exit 2', async () => {
    const { ctx } = makeCtx({ 'src/a.ts': 'x' });
    expect((await runCli(['replace', '(', 'x'], ctx)).exitCode).toBe(2);
  });
});

describe('fg find / grep', () => {
  const files = {
    'src/features/goals/GoalCard.tsx': 'const a = "meta";',
    'src/features/goals/__tests__/GoalCard.test.tsx': 'meta',
    'src/features/goals/goals.service.ts': 'meta',
  };

  it('find por substring e por glob/área', async () => {
    const { ctx } = makeCtx(files);
    expect(JSON.parse((await runCli(['find', 'goalcard', '--json'], ctx)).output).matches).toHaveLength(2);
    expect(JSON.parse((await runCli(['find', '*.test.tsx', '--area', 'tests', '--json'], ctx)).output).matches).toEqual([
      'src/features/goals/__tests__/GoalCard.test.tsx',
    ]);
  });

  it('find com área inválida retorna exit 2', async () => {
    const { ctx } = makeCtx(files);
    expect((await runCli(['find', 'x', '--area', 'nada'], ctx)).exitCode).toBe(2);
  });

  it('grep encontra linhas e rejeita regex inválida', async () => {
    const { ctx } = makeCtx(files);
    const ok = JSON.parse((await runCli(['grep', 'meta', '--json'], ctx)).output);
    expect(ok.matches.length).toBeGreaterThanOrEqual(3);
    expect((await runCli(['grep', '(', '--json'], ctx)).exitCode).toBe(2);
  });
});

describe('fg route', () => {
  it('resolve doc e agente pela routing table', async () => {
    const { ctx } = makeCtx({ '.opencode/AUDIT.md': AUDIT });
    const result = JSON.parse((await runCli(['route', 'componente', 'modal', '--json'], ctx)).output);
    expect(result.matches).toEqual(['doc=docs/ui-guidelines.md', 'agent=frontend']);
  });

  it('sem correspondência retorna exit 1', async () => {
    const { ctx } = makeCtx({ '.opencode/AUDIT.md': AUDIT });
    expect((await runCli(['route', 'zzz'], ctx)).exitCode).toBe(1);
  });

  it('sem palavras-chave retorna exit 2', async () => {
    const { ctx } = makeCtx({ '.opencode/AUDIT.md': AUDIT });
    expect((await runCli(['route'], ctx)).exitCode).toBe(2);
  });
});

describe('fg db / test / dev / pr', () => {
  it('db push sem --yes é bloqueado e não executa nada', async () => {
    const { ctx, exec } = makeCtx();
    expect((await runCli(['db', 'push'], ctx)).exitCode).toBe(3);
    expect(exec.calls).toHaveLength(0);
  });

  it('db push --yes executa prisma db push', async () => {
    const { ctx, exec } = makeCtx();
    expect((await runCli(['db', 'push', '--yes'], ctx)).exitCode).toBe(0);
    expect(exec.calls[0]).toEqual({ command: 'npx', args: ['prisma', 'db', 'push'] });
  });

  it('propaga falha de processo como exit 1', async () => {
    const { ctx } = makeCtx({}, [1]);
    expect((await runCli(['db', 'generate'], ctx)).exitCode).toBe(1);
  });

  it('test delega ao jest com os alvos', async () => {
    const { ctx, exec } = makeCtx();
    await runCli(['test', 'src/features/goals'], ctx);
    expect(exec.calls[0].command).toBe('npx');
    expect(exec.calls[0].args).toEqual(expect.arrayContaining(['jest', 'src/features/goals']));
  });
});

describe('fg spec new', () => {
  it('gera esqueleto da spec em docs/specs sem sobrescrever', async () => {
    const { ctx, fs } = makeCtx();
    expect((await runCli(['spec', 'new', 'minha-feature', '--write'], ctx)).exitCode).toBe(0);
    expect(fs.files.get('docs/specs/minha-feature.md')).toContain('## 6. Critérios de Aceitação');
    expect((await runCli(['spec', 'new', 'minha-feature', '--write'], ctx)).exitCode).toBe(3);
  });
});
