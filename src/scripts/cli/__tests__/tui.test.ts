/** @jest-environment node */
import { resolve } from 'node:path';
import { runCli } from '../run';
import { makeCtx } from '../core/testing';

const PKG = { 'tools/fg-tui/package.json': '{}', 'tools/fg-tui/node_modules/ink/package.json': '{}' };
const BASE = ['--filter', '@financeguy/fg-tui', 'exec', 'tsx', 'src/main.tsx'];

describe('fg tui', () => {
  it('repassa flags e args ao pacote fg-tui', async () => {
    const { ctx, exec } = makeCtx(PKG);
    const { exitCode } = await runCli(['tui', '--demo', '--once', '--dir', 'docs/x', 'FING-30'], ctx);
    expect(exitCode).toBe(0);
    expect(exec.calls).toHaveLength(1);
    expect(exec.calls[0].command).toBe('pnpm');
    expect(exec.calls[0].args).toEqual([...BASE, '--demo', '--once', '--dir', resolve('docs/x'), 'FING-30']);
  });

  it('normaliza --dir com barra final', async () => {
    const { ctx, exec } = makeCtx(PKG);
    await runCli(['tui', '--dir', 'docs/x/'], ctx);
    expect(exec.calls[0].args).toEqual([...BASE, '--dir', resolve('docs/x')]);
  });

  it('flag desconhecida ou mais de um posicional resulta em exit 2', async () => {
    const a = makeCtx(PKG);
    expect((await runCli(['tui', '--nada'], a.ctx)).exitCode).toBe(2);
    expect(a.exec.calls).toHaveLength(0);
    const b = makeCtx(PKG);
    expect((await runCli(['tui', 'FING-1', 'FING-2'], b.ctx)).exitCode).toBe(2);
    expect(b.exec.calls).toHaveLength(0);
  });

  it('sem args chama só o entrypoint', async () => {
    const { ctx, exec } = makeCtx(PKG);
    await runCli(['tui'], ctx);
    expect(exec.calls[0].args).toEqual(BASE);
  });

  it('propaga falha do processo filho', async () => {
    const { ctx } = makeCtx(PKG, [3]);
    const { exitCode, output } = await runCli(['tui', '--dump'], ctx);
    expect(exitCode).toBe(1);
    expect(output).toContain('exit 3');
  });

  it('orienta rodar pnpm install quando o pacote ou dependências faltam', async () => {
    const { ctx, exec } = makeCtx({});
    const { exitCode, output } = await runCli(['tui'], ctx);
    expect(exitCode).toBe(3);
    expect(output).toContain('pnpm install');
    expect(exec.calls).toHaveLength(0);

    const half = makeCtx({ 'tools/fg-tui/package.json': '{}' });
    const r = await runCli(['tui'], half.ctx);
    expect(r.exitCode).toBe(3);
    expect(r.output).toContain('pnpm install');
    expect(half.exec.calls).toHaveLength(0);
  });

  it('help lista tui', async () => {
    const { ctx } = makeCtx();
    const { output } = await runCli(['--help'], ctx);
    expect(output).toContain('tui');
  });
});

describe('fg tui saída limpa', () => {
  it('com sucesso não imprime o envelope depois da saída do pacote (JSON do --dump continua puro)', async () => {
    const { ctx } = makeCtx(PKG);
    const { output, exitCode } = await runCli(['tui', '--dump'], ctx);
    expect(exitCode).toBe(0);
    expect(output).toBe('');
  });
});
