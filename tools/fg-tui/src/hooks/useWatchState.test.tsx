import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { useWatchState } from './useWatchState.js';
import type { FsLike } from '../model/types.js';

const DIR = '/repo/FinanceGuy-FING-30';
const ESTADO = `${DIR}/.fg-pipeline.json`;
const PROGRESSO = `${DIR}/.fg-pipeline.progress.md`;

function norm(p: string): string {
  return p.replace(/\\/g, '/');
}

/** FS em memória mutável: o teste altera `arquivos` para simular o pipeline gravando. */
function criarFs(arquivos: Map<string, string>): FsLike {
  return {
    exists: (p) => arquivos.has(norm(p)),
    readFile: (p) => {
      const conteudo = arquivos.get(norm(p));
      if (conteudo === undefined) throw new Error('ENOENT');
      return conteudo;
    },
  };
}

function estadoJson(slug: string): string {
  return JSON.stringify({
    code: 'FING-30',
    slug,
    notionPageUrl: 'u',
    specPath: 's',
    worktree: 'w',
    baseSha: 'b',
    state: 'step_1_running',
    steps: [],
    review: { cycles: 0, findings: [] },
    updatedAt: '2026-11-01T10:00:00.000Z',
  });
}

interface SondaProps {
  fs: FsLike;
  onRender: () => void;
}

function Sonda({ fs, onRender }: SondaProps): ReactElement {
  const { result, activity, unstable } = useWatchState(DIR, fs, { intervalMs: 1000, debounceMs: 100 });
  onRender();
  const slug = result.ok ? result.state.slug : `erro:${result.kind}`;
  return <Text>{`slug=${slug} atividade=${activity.length} instavel=${unstable}`}</Text>;
}

describe('useWatchState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('dado estado válido, quando monta, então expõe o estado lido e unstable false', () => {
    const arquivos = new Map([[ESTADO, estadoJson('inicial')]]);
    const { lastFrame, unmount } = render(<Sonda fs={criarFs(arquivos)} onRender={() => undefined} />);
    expect(lastFrame()).toContain('slug=inicial');
    expect(lastFrame()).toContain('instavel=false');
    unmount();
  });

  it('dado progress.md, quando monta, então activity traz as linhas', () => {
    const arquivos = new Map([
      [ESTADO, estadoJson('a')],
      [PROGRESSO, 'um\ndois\n'],
    ]);
    const { lastFrame, unmount } = render(<Sonda fs={criarFs(arquivos)} onRender={() => undefined} />);
    expect(lastFrame()).toContain('atividade=2');
    unmount();
  });

  it('dado que o conteúdo muda, quando o polling dispara, então relê e atualiza o estado', async () => {
    const arquivos = new Map([[ESTADO, estadoJson('antes')]]);
    const { lastFrame, unmount } = render(<Sonda fs={criarFs(arquivos)} onRender={() => undefined} />);
    arquivos.set(ESTADO, estadoJson('depois'));
    await vi.advanceTimersByTimeAsync(1100);
    expect(lastFrame()).toContain('slug=depois');
    unmount();
  });

  it('dado conteúdo idêntico, quando o polling dispara, então não re-renderiza', async () => {
    const arquivos = new Map([[ESTADO, estadoJson('estavel')]]);
    const onRender = vi.fn();
    const { unmount } = render(<Sonda fs={criarFs(arquivos)} onRender={onRender} />);
    const aposMontagem = onRender.mock.calls.length;
    expect(aposMontagem).toBeGreaterThan(0);
    await vi.advanceTimersByTimeAsync(3500);
    expect(onRender.mock.calls.length).toBe(aposMontagem);
    unmount();
  });

  it('dado JSON inválido depois de um estado válido, então mantém o último estado e marca unstable', async () => {
    const arquivos = new Map([[ESTADO, estadoJson('valido')]]);
    const { lastFrame, unmount } = render(<Sonda fs={criarFs(arquivos)} onRender={() => undefined} />);
    arquivos.set(ESTADO, '{"code": "FING-30", "slug":');
    await vi.advanceTimersByTimeAsync(1100);
    expect(lastFrame()).toContain('slug=valido');
    expect(lastFrame()).toContain('instavel=true');
    unmount();
  });

  it('dado que o JSON volta a ser válido, então unstable volta a false', async () => {
    const arquivos = new Map([[ESTADO, estadoJson('valido')]]);
    const { lastFrame, unmount } = render(<Sonda fs={criarFs(arquivos)} onRender={() => undefined} />);
    arquivos.set(ESTADO, '{"truncado":');
    await vi.advanceTimersByTimeAsync(1100);
    arquivos.set(ESTADO, estadoJson('recuperado'));
    await vi.advanceTimersByTimeAsync(1100);
    expect(lastFrame()).toContain('slug=recuperado');
    expect(lastFrame()).toContain('instavel=false');
    unmount();
  });

  it('dado estado inválido desde a primeira leitura, então expõe o erro (sem estado anterior)', () => {
    const arquivos = new Map([[ESTADO, '{"truncado":']]);
    const { lastFrame, unmount } = render(<Sonda fs={criarFs(arquivos)} onRender={() => undefined} />);
    expect(lastFrame()).toContain('erro:invalid-json');
    unmount();
  });

  it('dado unmount, então o hook não deixa timer pendente além do baseline do Ink', () => {
    // Baseline: timers que o próprio Ink deixa após montar/desmontar um componente sem o hook.
    const base = render(<Text>baseline</Text>);
    base.unmount();
    const timersBaseline = vi.getTimerCount();

    const arquivos = new Map([[ESTADO, estadoJson('x')]]);
    const { lastFrame, unmount } = render(<Sonda fs={criarFs(arquivos)} onRender={() => undefined} />);
    expect(lastFrame()).toContain('slug=x');
    unmount();
    expect(vi.getTimerCount()).toBe(timersBaseline);
  });

  it.todo('fecha o fs.watch no unmount (requer injetar o watcher; coberto na etapa 3b)');
});
