/** @jest-environment node */
import { parseArgs } from '../core/args';
import { buildSpawnPlan } from '../core/exec-port';
import { CliError } from '../core/errors';
import { assertWritable, normalizeRepoPath } from '../core/guards';
import { createMemoryFs } from '../core/fs-port';
import { renderResult } from '../core/output';
import { globToRegExp, walkFiles } from '../core/walk';
import { emptyResult } from '../core/errors';
import { runCli } from '../run';
import { makeCtx } from '../core/testing';

describe('parseArgs', () => {
  it('separa posicionais de flags booleanas e de valor', () => {
    const args = parseArgs(['feature', 'wallet', '--write', '--area', 'backend', '-t', 'nome']);
    expect(args.positionals).toEqual(['feature', 'wallet']);
    expect(args.flags).toEqual({ write: true, area: 'backend', t: 'nome' });
  });

  it('aceita --flag=valor e -- para encerrar flags', () => {
    const args = parseArgs(['--glob=src/**', '--', '--literal']);
    expect(args.flags.glob).toBe('src/**');
    expect(args.positionals).toEqual(['--literal']);
  });

  it('falha quando flag de valor não recebe valor', () => {
    expect(() => parseArgs(['--area'])).toThrow(CliError);
  });

  it('mensagem de uso em pt-BR quando a flag não tem valor ou o próximo token é outra flag', () => {
    expect(() => parseArgs(["--area"])).toThrow(/precisa de um valor.*--area <valor>/);
    expect(() => parseArgs(['--area', '--write'])).toThrow(/A flag --area precisa de um valor/);
    expect(() => parseArgs(['-t'])).toThrow(/A flag -t precisa de um valor/);
  });

  it('valor começando com um hífen simples continua válido', () => {
    expect(parseArgs(['--area', '-1']).flags.area).toBe('-1');
  });
});

describe('guards', () => {
  it.each(['src/a.ts', 'docs/specs/x.md', '.claude/skills/fg-cli/SKILL.md', 'src\\features\\a.ts'])(
    'permite escrita em %s',
    (path) => {
      expect(() => assertWritable(path)).not.toThrow();
    },
  );

  it.each([
    '.env',
    'src/.env.local',
    'node_modules/x/index.js',
    'src/.next/cache',
    'prisma/migrations/001/migration.sql',
    'package.json',
    '../fora.ts',
    '/etc/passwd',
    'C:/Windows/x.txt',
  ])('bloqueia escrita em %s', (path) => {
    expect(() => assertWritable(path)).toThrow(expect.objectContaining({ status: 'blocked' }));
  });

  it('normaliza separadores do Windows', () => {
    expect(normalizeRepoPath('.\\src\\a\\..\\b.ts')).toBe('src/b.ts');
  });
});

describe('memory fs + walk', () => {
  it('lista recursivamente ignorando node_modules e .next', () => {
    const fs = createMemoryFs({
      'src/a.ts': '',
      'src/deep/b.tsx': '',
      'src/node_modules/x.ts': '',
      'src/.next/y.ts': '',
    });
    expect(walkFiles(fs, ['src'])).toEqual(['src/a.ts', 'src/deep/b.tsx']);
  });

  it('globToRegExp suporta * e **', () => {
    expect(globToRegExp('src/features/goals/**').test('src/features/goals/a/b.ts')).toBe(true);
    expect(globToRegExp('*.test.tsx').test('src/x/A.test.tsx')).toBe(true);
    expect(globToRegExp('src/*.ts').test('src/a/b.ts')).toBe(false);
  });
});

describe('renderResult', () => {
  it('gera JSON válido com status, nextSteps e errors', () => {
    const json = renderResult(emptyResult('x', { nextSteps: ['a'], errors: ['b'] }), true);
    expect(JSON.parse(json)).toMatchObject({ status: 'ok', nextSteps: ['a'], errors: ['b'] });
  });

  it('gera texto legível', () => {
    expect(renderResult(emptyResult('x', { message: 'ok', created: ['a.ts'] }), false)).toContain('a.ts');
  });
});

describe('runCli', () => {
  it('--help lista todos os grupos', async () => {
    const { ctx } = makeCtx();
    const { output, exitCode } = await runCli(['--help'], ctx);
    expect(exitCode).toBe(0);
    for (const group of ['dev', 'test', 'db', 'pr', 'audit', 'spec', 'route', 'scaffold', 'find', 'grep', 'mv', 'replace']) {
      expect(output).toContain(group);
    }
  });

  it('<grupo> --help mostra o uso do grupo', async () => {
    const { ctx } = makeCtx();
    const { output } = await runCli(['scaffold', '--help'], ctx);
    expect(output).toContain('fg scaffold feature');
  });

  it('grupo desconhecido retorna exit 2', async () => {
    const { ctx } = makeCtx();
    expect((await runCli(['nada'], ctx)).exitCode).toBe(2);
  });

  it('bloqueios retornam exit 3 e --json mantém JSON válido', async () => {
    const { ctx } = makeCtx();
    const { output, exitCode } = await runCli(['db', 'push', '--json'], ctx);
    expect(exitCode).toBe(3);
    expect(JSON.parse(output).status).toBe('blocked');
  });
});

describe('buildSpawnPlan (sem DEP0190)', () => {
  it('no Windows usa uma única string com shell e nenhum array de args', () => {
    const plan = buildSpawnPlan('pnpm', ['--filter', 'a b', 'x'], 'win32');
    expect(plan).toEqual({ file: 'pnpm --filter "a b" x', args: [], shell: true });
  });

  it('fora do Windows não usa shell e repassa args intactos', () => {
    expect(buildSpawnPlan('pnpm', ['a b'], 'linux')).toEqual({ file: 'pnpm', args: ['a b'], shell: false });
  });

  it('rejeita argumento com caracteres perigosos', () => {
    expect(() => buildSpawnPlan('pnpm', ['a"b'], 'win32')).toThrow(CliError);
  });
});
