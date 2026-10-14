import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ActionCardList } from '../ActionCardList';
import { makeCard } from '@/features/ai/__fixtures__/actionCards';

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children, ...p }: any) => <button type="button" {...p}>{children}</button>,
  SelectValue: ({ children, placeholder }: any) => <span>{children ?? placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}));

function setup(cards = [makeCard({ id: 'a1' }), makeCard({ id: 'a2', position: 1 }), makeCard({ id: 'a3', position: 2 })], props: Partial<React.ComponentProps<typeof ActionCardList>> = {}) {
  const handlers = {
    onConfirm: jest.fn(),
    onConfirmAll: jest.fn(),
    onUpdate: jest.fn().mockResolvedValue(true),
    onCancel: jest.fn(),
    onSelect: jest.fn(),
  };
  render(<ActionCardList cards={cards} canConfirmAll {...handlers} {...props} />);
  return handlers;
}

describe('ActionCardList', () => {
  it('renderiza um card por ação', () => {
    setup();
    expect(screen.getAllByTestId('action-card')).toHaveLength(3);
  });

  it('mostra "Confirmar todas (N)" quando todas são válidas e envia os ids em ordem', () => {
    const { onConfirmAll } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar todas (3)' }));
    expect(onConfirmAll).toHaveBeenCalledWith(['a1', 'a2', 'a3']);
  });

  it('não mostra "Confirmar todas" quando há uma ação incompleta', () => {
    setup([makeCard({ id: 'a1' }), makeCard({ id: 'a2', status: 'needs_input' })]);
    expect(screen.queryByRole('button', { name: /Confirmar todas/ })).not.toBeInTheDocument();
  });

  it('não mostra "Confirmar todas" quando o servidor diz que não pode', () => {
    setup(undefined, { canConfirmAll: false });
    expect(screen.queryByRole('button', { name: /Confirmar todas/ })).not.toBeInTheDocument();
  });

  it('não mostra "Confirmar todas" para um único card', () => {
    setup([makeCard({ id: 'a1' })]);
    expect(screen.queryByRole('button', { name: /Confirmar todas/ })).not.toBeInTheDocument();
  });

  it('conta só as prontas quando outras já foram resolvidas', () => {
    setup([
      makeCard({ id: 'a1', status: 'confirmed' }),
      makeCard({ id: 'a2' }),
      makeCard({ id: 'a3' }),
    ]);
    expect(screen.getByRole('button', { name: 'Confirmar todas (2)' })).toBeInTheDocument();
  });

  it('desabilita "Confirmar todas" enquanto algum card está ocupado', () => {
    setup(undefined, { busyIds: new Set(['a2']) });
    expect(screen.getByRole('button', { name: 'Confirmar todas (3)' })).toBeDisabled();
  });

  it('encaminha ações de um card específico e erros por id', () => {
    const { onConfirm } = setup(undefined, { errors: { a2: 'Sem conexão.' } });
    const cards = screen.getAllByTestId('action-card');
    expect(within(cards[1]).getByRole('alert')).toHaveTextContent('Sem conexão.');
    fireEvent.click(within(cards[1]).getByRole('button', { name: 'Confirmar' }));
    expect(onConfirm).toHaveBeenCalledWith('a2');
  });

  it('mostra erro do lote inline', () => {
    setup(undefined, { batchError: 'Não consegui confirmar agora.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui confirmar agora.');
  });
});
