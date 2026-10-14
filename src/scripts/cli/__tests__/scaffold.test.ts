/** @jest-environment node */
import { runCli } from '../run';
import { makeCtx } from '../core/testing';

const FEATURE_FILES = [
  'src/features/wallet-card/validations.ts',
  'src/features/wallet-card/__tests__/validations.test.ts',
  'src/features/wallet-card/IWalletCard.repository.ts',
  'src/features/wallet-card/postgresWalletCard.repository.ts',
  'src/features/wallet-card/__tests__/postgresWalletCard.repository.test.ts',
  'src/features/wallet-card/walletCard.service.ts',
  'src/features/wallet-card/__tests__/walletCard.service.test.ts',
  'src/features/wallet-card/api/route.ts',
  'src/features/wallet-card/api/[id]/route.ts',
  'src/features/wallet-card/api/__tests__/route.test.ts',
  'src/features/wallet-card/hooks/useWalletCard.ts',
  'src/features/wallet-card/hooks/__tests__/useWalletCard.test.ts',
];

describe('fg scaffold', () => {
  it('feature em dry-run lista a árvore e não grava', async () => {
    const { ctx, fs } = makeCtx();
    const { output, exitCode } = await runCli(['scaffold', 'feature', 'wallet-card', '--json'], ctx);
    const result = JSON.parse(output);
    expect(exitCode).toBe(0);
    expect(result.status).toBe('dry-run');
    expect(result.created).toEqual(FEATURE_FILES);
    expect(Object.keys(result.previews)).toHaveLength(FEATURE_FILES.length);
    expect(fs.files.size).toBe(0);
  });

  it('feature com --write cria os arquivos no padrão TDD', async () => {
    const { ctx, fs } = makeCtx();
    const { exitCode } = await runCli(['scaffold', 'feature', 'wallet-card', '--write'], ctx);
    expect(exitCode).toBe(0);
    expect([...fs.files.keys()].sort()).toEqual([...FEATURE_FILES].sort());
    expect(fs.files.get('src/features/wallet-card/walletCard.service.ts')).toContain('NotImplemented');
    expect(fs.files.get('src/features/wallet-card/__tests__/walletCard.service.test.ts')).toContain('it.todo');
    expect(fs.files.get('src/features/wallet-card/validations.ts')).toContain("from 'zod'");
  });

  it('não gera any nem imports relativos fora da feature', async () => {
    const { ctx, fs } = makeCtx();
    await runCli(['scaffold', 'feature', 'wallet-card', '--write'], ctx);
    for (const content of fs.files.values()) {
      expect(content).not.toMatch(/:\s*any\b/);
      expect(content).not.toContain('../../');
    }
  });

  it('reexecutar falha sem --force e não altera nada', async () => {
    const { ctx, fs } = makeCtx();
    await runCli(['scaffold', 'feature', 'wallet-card', '--write'], ctx);
    fs.files.set('src/features/wallet-card/validations.ts', 'EDITADO');
    const { exitCode } = await runCli(['scaffold', 'feature', 'wallet-card', '--write'], ctx);
    expect(exitCode).toBe(3);
    expect(fs.files.get('src/features/wallet-card/validations.ts')).toBe('EDITADO');
  });

  it('--force sobrescreve', async () => {
    const { ctx, fs } = makeCtx({ 'src/features/wallet-card/validations.ts': 'EDITADO' });
    const { exitCode } = await runCli(['scaffold', 'feature', 'wallet-card', '--write', '--force'], ctx);
    expect(exitCode).toBe(0);
    expect(fs.files.get('src/features/wallet-card/validations.ts')).toContain('z.object');
  });

  it('nome inválido retorna exit 2 com exemplo', async () => {
    const { ctx } = makeCtx();
    const { output, exitCode } = await runCli(['scaffold', 'feature', 'WalletCard'], ctx);
    expect(exitCode).toBe(2);
    expect(output).toContain('kebab-case');
  });

  it('component gera componente e teste RTL', async () => {
    const { ctx, fs } = makeCtx();
    await runCli(['scaffold', 'component', 'goals', 'GoalBadge', '--write'], ctx);
    expect(fs.files.get('src/features/goals/components/GoalBadge.tsx')).toContain('export function GoalBadge');
    expect(fs.files.get('src/features/goals/components/__tests__/GoalBadge.test.tsx')).toContain('@testing-library/react');
  });

  it('hook, api-route, service, repository e page geram suas peças', async () => {
    const { ctx, fs } = makeCtx();
    await runCli(['scaffold', 'hook', 'goals', 'useGoalStats', '--write'], ctx);
    await runCli(['scaffold', 'api-route', 'goals', '--write'], ctx);
    await runCli(['scaffold', 'service', 'goals', '--write'], ctx);
    await runCli(['scaffold', 'repository', 'goals', '--write'], ctx);
    await runCli(['scaffold', 'page', 'wallet', '--write'], ctx);
    for (const path of [
      'src/features/goals/hooks/useGoalStats.ts',
      'src/features/goals/api/route.ts',
      'src/features/goals/goals.service.ts'.replace('goals.service', 'goals.service'),
      'src/features/goals/IGoals.repository.ts',
      'src/app/wallet/page.tsx',
      'src/app/wallet/__tests__/page.test.tsx',
    ]) {
      expect(fs.files.has(path)).toBe(true);
    }
  });

  it('test gera it.todo ao lado de arquivo existente', async () => {
    const { ctx, fs } = makeCtx({ 'src/lib/money.ts': 'export const x = 1;' });
    await runCli(['scaffold', 'test', 'src/lib/money.ts', '--write'], ctx);
    expect(fs.files.get('src/lib/__tests__/money.test.ts')).toContain('it.todo');
  });

  it('test falha se o alvo não existe', async () => {
    const { ctx } = makeCtx();
    expect((await runCli(['scaffold', 'test', 'src/lib/nada.ts'], ctx)).exitCode).toBe(2);
  });

  it('nunca edita src/core/container.ts: apenas imprime o snippet', async () => {
    const { ctx, fs } = makeCtx({ 'src/core/container.ts': 'ORIGINAL' });
    const { output } = await runCli(['scaffold', 'feature', 'wallet-card', '--write'], ctx);
    expect(fs.files.get('src/core/container.ts')).toBe('ORIGINAL');
    expect(output).toContain('container.ts');
  });
});
