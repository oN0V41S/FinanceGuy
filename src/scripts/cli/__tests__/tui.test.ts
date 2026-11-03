/** @jest-environment node */
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
    expect(exec.calls[0].args).toEqual([...BASE, '--demo', '--once', '--dir', 'docs/x', 'FING-30']);
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
    expect(exitCode).not.toBe(0);
    expect(output).toContain('pnpm install');
    expect(exec.calls).toHaveLength(0);

    const half = makeCtx({ 'tools/fg-tui/package.json': '{}' });
    const r = await runCli(['tui'], half.ctx);
    expect(r.output).toContain('pnpm install');
    expect(half.exec.calls).toHaveLength(0);
  });

  it('help lista tui', async () => {
    const { ctx } = makeCtx();
    const { output } = await runCli(['--help'], ctx);
    expect(output).toContain('tui');
  });
});
