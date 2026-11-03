import { describe, expect, it } from 'vitest';
import { render } from 'ink-testing-library';
import { Card } from './Card.js';
import { GateBanner } from './GateBanner.js';
import { ErrorView } from './ErrorView.js';
import type { BoardCard, Gate } from '../model/types.js';

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
  it.todo('renderiza as 4 colunas com os cards corretos (etapa 3b)');
  it.todo('empilha as colunas quando o terminal tem menos de 80 colunas (etapa 3b)');
  it.todo('mostra "—" nas colunas vazias (etapa 3b)');
});

describe('WorktreePicker', () => {
  it.todo('lista FING-N · slug · estado por worktree e chama onSelect com Enter (etapa 3b)');
});

describe('Teclado (App)', () => {
  it.todo('setas ←/→ movem a coluna e ↑/↓ movem o card (etapa 3b)');
  it.todo('Enter abre o DetailPanel e Esc fecha (etapa 3b)');
  it.todo('q encerra a aplicação (etapa 3b)');
});
