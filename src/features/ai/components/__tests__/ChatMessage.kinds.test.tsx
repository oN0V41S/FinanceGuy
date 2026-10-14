import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatMessage } from '../ChatMessage';
import { makeCard, makeCardsMessage } from '@/features/ai/__fixtures__/actionCards';
import type { UseAssistantActionsResult } from '@/features/ai/hooks/useAssistantActions';

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children, ...p }: any) => <button type="button" {...p}>{children}</button>,
  SelectValue: ({ children, placeholder }: any) => <span>{children ?? placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}));

function makeActions(overrides: Partial<UseAssistantActionsResult> = {}): UseAssistantActionsResult {
  return {
    busyIds: new Set<string>(),
    errors: {},
    queueErrors: {},
    confirm: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(true),
    select: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
    cancelQueue: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('ChatMessage por kind', () => {
  it('kind ausente continua sendo texto', () => {
    render(<ChatMessage message={{ id: '1', role: 'assistant', content: 'Olá' }} />);
    expect(screen.getByTestId('chat-message-assistant')).toHaveTextContent('Olá');
  });

  it('kind "text" explícito também', () => {
    render(<ChatMessage message={{ id: '1', role: 'assistant', kind: 'text', content: 'Olá' }} />);
    expect(screen.getByTestId('chat-message-assistant')).toBeInTheDocument();
  });

  it('action_cards renderiza cards, próximos passos e delega confirmação', () => {
    const actions = makeActions();
    const message = makeCardsMessage(
      [makeCard({ id: 'a1' }), makeCard({ id: 'a2', position: 1 }), makeCard({ id: 'a3', position: 2 })],
      { done: 1, next: 'Mercado R$ 50,00', canConfirmAll: true },
    );
    render(<ChatMessage message={message} actions={actions} />);

    expect(screen.getAllByTestId('action-card')).toHaveLength(3);
    expect(screen.getByText(/✔ 1\/3 concluídas · Próximo: Mercado R\$ 50,00/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar todas (3)' }));
    expect(actions.confirm).toHaveBeenCalledWith(['a1', 'a2', 'a3']);

    fireEvent.click(screen.getAllByRole('button', { name: 'Confirmar' })[0]);
    expect(actions.confirm).toHaveBeenCalledWith(['a1']);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar restantes' }));
    expect(actions.cancelQueue).toHaveBeenCalledWith('q1');
  });

  it('action_cards mostra erros inline vindos do hook', () => {
    const actions = makeActions({ errors: { a1: 'Sem conexão.' }, queueErrors: { q1: 'Falha ao cancelar.' } });
    render(<ChatMessage message={makeCardsMessage([makeCard()], { next: 'x' })} actions={actions} />);
    const alerts = screen.getAllByRole('alert').map((a) => a.textContent);
    expect(alerts).toEqual(expect.arrayContaining(['Sem conexão.', 'Falha ao cancelar.']));
  });

  it('action_cards sem actions não quebra', () => {
    render(<ChatMessage message={makeCardsMessage([makeCard()])} />);
    expect(screen.getByTestId('action-card')).toBeInTheDocument();
  });

  it('compacted renderiza o divisor', () => {
    render(<ChatMessage message={{ id: 'c', role: 'assistant', kind: 'compacted', content: 'Resumo' }} />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });
});
