/** @jest-environment node */
import { runCli } from '../run';
import { makeCtx } from '../core/testing';

const AGENT = [
  '---',
  'name: frontend',
  'description: Cria componentes React.',
  'mode: all',
  'color: info',
  'claude-tools: Read, Grep',
  '---',
  '',
  '# Sub-Agent: frontend',
  '',
].join('\n');

const SKILL = ['---', 'name: demo', 'description: Skill de teste.', '---', '', '# Demo', ''].join('\n');

const base = {
  '.ai/skills-agents/agents/frontend.md': AGENT,
  '.ai/skills-agents/skills/demo/SKILL.md': SKILL,
  '.ai/skills-agents/skills/demo/refs/a.md': 'ref',
};

describe('fg sync', () => {
  it('dry-run não grava nada e lista o que seria gerado', async () => {
    const { ctx, fs } = makeCtx(base);
    const { exitCode, output } = await runCli(['sync', '--json'], ctx);
    expect(exitCode).toBe(0);
    expect(fs.exists('.claude/agents/frontend.md')).toBe(false);
    expect(JSON.parse(output).created).toEqual(
      expect.arrayContaining(['.claude/agents/frontend.md', '.opencode/agents/frontend.md']),
    );
  });

  it('--write gera frontmatter nativo de cada ferramenta', async () => {
    const { ctx, fs } = makeCtx(base);
    await runCli(['sync', '--write'], ctx);

    const claude = fs.files.get('.claude/agents/frontend.md') ?? '';
    expect(claude).toContain('name: frontend');
    expect(claude).toContain('tools: Read, Grep');
    expect(claude).not.toContain('mode:');
    expect(claude).not.toContain('color:');
    expect(claude).toContain('# Sub-Agent: frontend');
    expect(claude).toContain('GERADO');

    const opencode = fs.files.get('.opencode/agents/frontend.md') ?? '';
    expect(opencode).toContain('mode: all');
    expect(opencode).toContain('color: info');
    expect(opencode).not.toContain('tools:');
    expect(opencode).not.toContain('claude-');
  });

  it('usa mode: subagent por padrão no OpenCode', async () => {
    const { ctx, fs } = makeCtx({
      '.ai/skills-agents/agents/qa.md': '---\nname: qa\ndescription: Testes.\n---\n# QA\n',
    });
    await runCli(['sync', '--write'], ctx);
    expect(fs.files.get('.opencode/agents/qa.md')).toContain('mode: subagent');
  });

  it('copia skills (inclusive subpastas) para as duas ferramentas', async () => {
    const { ctx, fs } = makeCtx(base);
    await runCli(['sync', '--write'], ctx);
    for (const root of ['.claude/skills', '.opencode/skills']) {
      expect(fs.files.get(`${root}/demo/SKILL.md`)).toBe(SKILL);
      expect(fs.files.get(`${root}/demo/refs/a.md`)).toBe('ref');
    }
  });

  it('gera o índice INDEX.md com os agentes e skills', async () => {
    const { ctx, fs } = makeCtx(base);
    await runCli(['sync', '--write'], ctx);
    const index = fs.files.get('.ai/skills-agents/INDEX.md') ?? '';
    expect(index).toContain('frontend');
    expect(index).toContain('demo');
  });

  it('--check falha (exit 1) quando há divergência e passa quando em dia', async () => {
    const { ctx } = makeCtx(base);
    expect((await runCli(['sync', '--check'], ctx)).exitCode).toBe(1);
    await runCli(['sync', '--write'], ctx);
    expect((await runCli(['sync', '--check'], ctx)).exitCode).toBe(0);
  });

  it('--check detecta edição manual em arquivo gerado', async () => {
    const { ctx, fs } = makeCtx(base);
    await runCli(['sync', '--write'], ctx);
    fs.writeFile('.opencode/agents/frontend.md', 'editado à mão');
    expect((await runCli(['sync', '--check'], ctx)).exitCode).toBe(1);
  });

  it('remove agentes gerados órfãos (que saíram da fonte)', async () => {
    const { ctx, fs } = makeCtx(base);
    await runCli(['sync', '--write'], ctx);
    fs.remove('.ai/skills-agents/agents/frontend.md');
    await runCli(['sync', '--write'], ctx);
    expect(fs.exists('.claude/agents/frontend.md')).toBe(false);
    expect(fs.exists('.opencode/agents/frontend.md')).toBe(false);
  });

  it('não remove arquivo sem marca GERADO (autoria manual)', async () => {
    const { ctx, fs } = makeCtx({ ...base, '.claude/agents/manual.md': '---\nname: manual\n---\nmeu' });
    await runCli(['sync', '--write'], ctx);
    expect(fs.exists('.claude/agents/manual.md')).toBe(true);
  });

  it('ignora diferença de fim de linha (CRLF do Windows) no --check', async () => {
    const { ctx, fs } = makeCtx(base);
    await runCli(['sync', '--write'], ctx);
    fs.writeFile('.claude/skills/demo/SKILL.md', SKILL.replace(/\n/g, '\r\n'));
    expect((await runCli(['sync', '--check'], ctx)).exitCode).toBe(0);
  });

  it('rejeita chave de frontmatter desconhecida (evita erro de sintaxe silencioso)', async () => {
    const { ctx } = makeCtx({
      '.ai/skills-agents/agents/x.md': '---\nname: x\ndescription: d\ntools: Read\n---\nbody',
    });
    const { exitCode, output } = await runCli(['sync', '--write'], ctx);
    expect(exitCode).toBe(2);
    expect(output).toContain('tools');
  });

  it('exige name e description', async () => {
    const { ctx } = makeCtx({ '.ai/skills-agents/agents/x.md': '---\nname: x\n---\nbody' });
    expect((await runCli(['sync', '--write'], ctx)).exitCode).toBe(2);
  });

  it('é idempotente: segunda execução não modifica nada', async () => {
    const { ctx } = makeCtx(base);
    await runCli(['sync', '--write'], ctx);
    const { output } = await runCli(['sync', '--write', '--json'], ctx);
    const parsed = JSON.parse(output);
    expect(parsed.created).toEqual([]);
    expect(parsed.modified).toEqual([]);
  });
});
