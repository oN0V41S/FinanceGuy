import { describe, expect, it, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { Card } from './Card.js';
import { GateBanner } from './GateBanner.js';
import { ErrorView } from './ErrorView.js';
import { Board } from './Board.js';
import { WorktreePicker } from './WorktreePicker.js';
import { App } from './App.js';
import { Footer, SHORTCUTS } from './Footer.js';
import type { Board as BoardModel, BoardCard, Gate, WorktreeRef } from '../model/types.js';

const ESC = '\u001B';
const UP = `${ESC}[A`;
const DOWN = `${ESC}[B`;
const RIGHT = `${ESC}[C`;
const LEFT = `${ESC}[D`;

/** Dá tempo para o Ink registrar o stdin e processar as teclas. */
function aguardar(ms = 30): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cartao(index: number, agent: string, status: BoardCard['status'], extra: Partial<BoardCard> = {}): BoardCard {
  return { index, agent, status, model: null, sessionShort: null, commitShort: null, stale: false, ...extra };
}

function criarBoard(): BoardModel {
  return {
    code: 'FING-30',
    slug: 'fg-tui',
    state: 'step_2_running',
    updatedAt: '2026-11-01T10:00:00.000Z',
    phases: [
      { id: 'notion', label: 'Card Notion', status: 'done' },
      { id: 'impl', label: 'Implementação', status: 'current' },
      { id: 'push', label: 'Push', status: 'pending' },
    ],
    columns: [
      { id: 'pending', title: 'Pendente', cards: [cartao(4, 'docs-architect', 'pending')] },
      {
        id: 'running',
        title: 'Rodando',
        cards: [
          cartao(2, 'frontend', 'running', { model: 'modelo-a', sessionShort: 'ses_01' }),
          cartao(3, 'quality-assurance-analyst', 'running'),
        ],
      },
      { id: 'done', title: 'Concluída', cards: [cartao(1, 'backend-engineer', 'done', { commitShort: 'abc1234' })] },
      { id: 'failed', title: 'Falhou', cards: [] },
    ],
    findings: [{ severity: 'alto', file: 'src/a.ts', line: 10, description: 'Falta validação' }],
    gate: null,
  };
}

describe('Card', () => {
  const card: BoardCard = {
    index: 2,
    agent: 'quality-assurance-analyst',
    status: 'running',
    model: 'modelo-xyz',
    sessionShort: 'ses_ab12',
    commitShort: 'abcdef1',
    stale: false,
  };

  it('mostra agente, modelo e commit curto', () => {
    const { lastFrame } = render(<Card card={card} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('quality-assurance-analyst');
    expect(frame).toContain('modelo-xyz');
    expect(frame).toContain('abcdef1');
  });

  it('dado card sem modelo e sem commit, então ainda mostra o agente sem lançar', () => {
    const { lastFrame } = render(<Card card={{ ...card, model: null, commitShort: null }} />);
    expect(lastFrame() ?? '').toContain('quality-assurance-analyst');
  });

  it('dado card parado (stale), então mostra o selo de sem atualização', () => {
    const { lastFrame } = render(<Card card={{ ...card, stale: true }} />);
    expect(lastFrame() ?? '').toContain('sem atualização');
  });
});

describe('GateBanner', () => {
  it('dado portão de push, então mostra o título e o comando de push', () => {
    const gate: Gate = {
      kind: 'push',
      title: 'Portão 2: dar push em FING-30?',
      message: 'Revise os commits antes de publicar.',
      command: 'git push -u origin FING-30',
    };
    const { lastFrame } = render(<GateBanner gate={gate} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Portão 2: dar push em FING-30?');
    expect(frame).toContain('git push -u origin FING-30');
  });

  it('dado portão de falha sem comando, então mostra a mensagem', () => {
    const gate: Gate = {
      kind: 'failed',
      title: 'Pipeline falhou',
      message: 'Falhou em step_2_running: testes falharam',
    };
    const { lastFrame } = render(<GateBanner gate={gate} />);
    expect(lastFrame() ?? '').toContain('testes falharam');
  });
});

describe('ErrorView', () => {
  it('mostra a mensagem recebida', () => {
    const { lastFrame } = render(<ErrorView message="Esta worktree não tem estado de pipeline (`.fg-pipeline.json`)." />);
    expect(lastFrame() ?? '').toContain('Esta worktree não tem estado de pipeline');
  });
});

describe('Board', () => {
  it('renderiza as 4 colunas com os cards corretos', () => {
    const { lastFrame } = render(<Board board={criarBoard()} width={120} />);
    const frame = lastFrame() ?? '';
    for (const titulo of ['Pendente (1)', 'Rodando (2)', 'Concluída (1)', 'Falhou (0)']) {
      expect(frame).toContain(titulo);
    }
    for (const agente of ['docs-architect', 'frontend', 'backend-engineer']) {
      expect(frame).toContain(agente);
    }
    expect(frame).toContain('abc1234');
  });

  it('mostra "—" nas colunas vazias', () => {
    const { lastFrame } = render(<Board board={criarBoard()} width={120} />);
    expect(lastFrame() ?? '').toContain('—');
  });

  it('empilha as colunas quando o terminal tem menos de 80 colunas', () => {
    const { lastFrame } = render(<Board board={criarBoard()} width={60} />);
    const linhas = (lastFrame() ?? '').split('\n');
    const linhaTitulo = (titulo: string): number => linhas.findIndex((l) => l.includes(titulo));
    expect(linhaTitulo('Pendente')).toBeGreaterThanOrEqual(0);
    expect(linhaTitulo('Rodando')).toBeGreaterThan(linhaTitulo('Pendente'));
    expect(linhaTitulo('Concluída')).toBeGreaterThan(linhaTitulo('Rodando'));
  });

  it('lado a lado em terminal largo: títulos na mesma linha', () => {
    const { lastFrame } = render(<Board board={criarBoard()} width={120} />);
    const linhas = (lastFrame() ?? '').split('\n');
    expect(linhas.some((l) => l.includes('Pendente') && l.includes('Rodando') && l.includes('Falhou'))).toBe(true);
  });
});

describe('WorktreePicker', () => {
  const refs: WorktreeRef[] = [
    { path: '/repos/FinanceGuy-FING-30', branch: 'FING-30', code: 'FING-30', state: 'step_2_running' },
    { path: '/repos/FinanceGuy-FING-31', branch: 'FING-31', code: 'FING-31', state: 'committed' },
  ];

  it('lista FING-N · pasta · estado por worktree, com o caminho', () => {
    const { lastFrame } = render(<WorktreePicker refs={refs} onSelect={() => undefined} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('FING-30 · FinanceGuy-FING-30 · step_2_running');
    expect(frame).toContain('FING-31 · FinanceGuy-FING-31 · committed');
    expect(frame).toContain('/repos/FinanceGuy-FING-31');
  });

  it('Enter seleciona a primeira; ↓ + Enter seleciona a segunda', async () => {
    const onSelect = vi.fn();
    const { stdin } = render(<WorktreePicker refs={refs} onSelect={onSelect} />);
    await aguardar();
    stdin.write('\r');
    await aguardar();
    expect(onSelect).toHaveBeenLastCalledWith(refs[0]);
    stdin.write(DOWN);
    await aguardar();
    stdin.write('\r');
    await aguardar();
    expect(onSelect).toHaveBeenLastCalledWith(refs[1]);
  });
});

describe('App', () => {
  it('mostra cabeçalho, fases, atividade e achados; sem portão não mostra banner', () => {
    const { lastFrame } = render(
      <App board={criarBoard()} activity={['linha de atividade']} now={new Date('2026-11-01T10:00:05.000Z')} width={120} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('FING-30');
    expect(frame).toContain('atualizado há 5 s');
    expect(frame).toContain('Implementação');
    expect(frame).toContain('linha de atividade');
    expect(frame).toContain('Falta validação');
    expect(frame).not.toContain('Portão');
  });

  it('sem atividade mostra o aviso e com portão mostra o banner', () => {
    const board: BoardModel = {
      ...criarBoard(),
      findings: [],
      gate: { kind: 'push', title: 'Portão 2: dar push em FING-30?', message: 'm', command: 'git push -u origin FING-30' },
    };
    const { lastFrame } = render(<App board={board} activity={[]} width={120} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Sem atividade registrada ainda.');
    expect(frame).toContain('git push -u origin FING-30');
  });

  it('com unstable mostra o aviso de leitura instável', () => {
    const { lastFrame } = render(<App board={criarBoard()} activity={[]} unstable width={120} />);
    expect(lastFrame() ?? '').toContain('leitura instável, mantendo último estado');
  });
});

describe('Teclado (App)', () => {
  function montar(): ReturnType<typeof render> {
    return render(<App board={criarBoard()} activity={[]} width={120} />);
  }

  it('Enter abre o DetailPanel do card selecionado e Esc fecha', async () => {
    const { stdin, lastFrame } = montar();
    await aguardar();
    expect(lastFrame() ?? '').not.toContain('Sessão:');
    stdin.write('\r');
    await aguardar();
    // A seleção inicial é o 1º card da coluna "Rodando" (frontend).
    expect(lastFrame() ?? '').toContain('Sessão: ses_01');
    stdin.write(ESC);
    await aguardar(80);
    expect(lastFrame() ?? '').not.toContain('Sessão:');
  });

  it('↓ move para o próximo card e ↑ volta', async () => {
    const { stdin, lastFrame } = montar();
    await aguardar();
    stdin.write(DOWN);
    await aguardar();
    stdin.write('\r');
    await aguardar();
    expect(lastFrame() ?? '').toContain('Etapa 3 · quality-assurance-analyst');
    stdin.write(UP);
    await aguardar();
    expect(lastFrame() ?? '').toContain('Etapa 2 · frontend');
  });

  it('← e → movem a coluna (card da coluna vizinha)', async () => {
    const { stdin, lastFrame } = montar();
    await aguardar();
    stdin.write(RIGHT);
    await aguardar();
    stdin.write('\r');
    await aguardar();
    expect(lastFrame() ?? '').toContain('Etapa 1 · backend-engineer');
    stdin.write(LEFT);
    await aguardar();
    stdin.write(LEFT);
    await aguardar();
    expect(lastFrame() ?? '').toContain('Etapa 4 · docs-architect');
  });

  it('Enter em coluna vazia não abre detalhe', async () => {
    const { stdin, lastFrame } = montar();
    await aguardar();
    stdin.write(RIGHT);
    await aguardar();
    stdin.write(RIGHT);
    await aguardar();
    stdin.write('\r');
    await aguardar();
    expect(lastFrame() ?? '').not.toContain('Sessão:');
  });

  it('q chama onQuit e encerra a aplicação', async () => {
    const onQuit = vi.fn();
    const { stdin } = render(<App board={criarBoard()} activity={[]} width={120} onQuit={onQuit} />);
    await aguardar();
    stdin.write('q');
    await aguardar();
    expect(onQuit).toHaveBeenCalledTimes(1);
  });

  it('r pede nova leitura (onReload)', async () => {
    const onReload = vi.fn();
    const { stdin } = render(<App board={criarBoard()} activity={[]} width={120} onReload={onReload} />);
    await aguardar();
    stdin.write('r');
    await aguardar();
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});

describe('Visual (V2.3)', () => {
  const longa = 'Descrição extremamente longa de atividade que precisa quebrar entre palavras sem cortar nenhuma palavra no meio';
  const palavras = longa.split(' ');

  for (const largura of [60, 120]) {
    it(`em ${largura} colunas: rodapé completo, cabeçalho code · slug · state e sem palavra cortada`, () => {
      const board: BoardModel = { ...criarBoard(), findings: [{ severity: 'alto', file: null, line: null, description: longa }] };
      const { lastFrame } = render(<App board={board} activity={[`- ${longa}`]} width={largura} />);
      const frame = lastFrame() ?? '';
      expect(frame).toContain('FING-30 · fg-tui · step_2_running');
      for (const atalho of SHORTCUTS) expect(frame).toContain(atalho);
      for (const linha of frame.split('\n')) expect(linha.length).toBeLessThanOrEqual(largura);
      const tokens = new Set(frame.split(/\s+/));
      for (const palavra of palavras) expect(tokens.has(palavra)).toBe(true);
    });
  }

  it('Footer lista os atalhos fixos', () => {
    const { lastFrame } = render(<Footer />);
    const frame = lastFrame() ?? '';
    for (const atalho of ['←/→ coluna', '↑/↓ card', 'Enter detalhe', 'Esc voltar', 'r recarregar', 'q sair']) {
      expect(frame).toContain(atalho);
    }
  });

  it('rodapé aparece mesmo sem modo interativo', () => {
    const { lastFrame } = render(<App board={criarBoard()} activity={[]} width={120} interactive={false} />);
    expect(lastFrame() ?? '').toContain('q sair');
  });
});
