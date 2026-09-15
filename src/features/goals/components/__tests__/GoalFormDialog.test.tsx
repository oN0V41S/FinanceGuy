import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GoalFormDialog } from '../GoalFormDialog';
import type { Goal } from '@/features/goals/validations';

describe('GoalFormDialog', () => {
  it('renders create title and empty fields when no goal is provided', () => {
    render(<GoalFormDialog open onOpenChange={jest.fn()} onSubmit={jest.fn()} />);
    expect(screen.getByText('Nova meta')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('');
  });

  it('renders edit title and pre-fills fields when goal is provided', () => {
    const goal: Goal = {
      id: '1',
      name: 'Viagem',
      targetValue: 5000,
      currentValue: 1000,
      deadlineLabel: 'Julho 2026',
    };
    render(<GoalFormDialog open onOpenChange={jest.fn()} goal={goal} onSubmit={jest.fn()} />);
    expect(screen.getByText('Editar meta')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Viagem');
    expect(screen.getByLabelText('Valor alvo')).toHaveValue(5000);
    expect(screen.getByLabelText('Valor atual')).toHaveValue(1000);
  });

  it('shows a validation error when submitting an empty name', async () => {
    render(<GoalFormDialog open onOpenChange={jest.fn()} onSubmit={jest.fn()} />);
    fireEvent.change(screen.getByLabelText('Valor alvo'), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar meta/i }));

    expect(await screen.findByText('Nome é obrigatório')).toBeInTheDocument();
  });

  it('calls onSubmit with parsed data and closes on success', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onOpenChange = jest.fn();
    render(<GoalFormDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Reserva' } });
    fireEvent.change(screen.getByLabelText('Valor alvo'), { target: { value: '3000' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar meta/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Reserva', targetValue: 3000, currentValue: 0 })
      )
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('shows submit error message when onSubmit rejects', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('Erro no servidor'));
    render(<GoalFormDialog open onOpenChange={jest.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Reserva' } });
    fireEvent.change(screen.getByLabelText('Valor alvo'), { target: { value: '3000' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar meta/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro no servidor');
  });

  it('calls onOpenChange(false) when cancel is clicked', () => {
    const onOpenChange = jest.fn();
    render(<GoalFormDialog open onOpenChange={onOpenChange} onSubmit={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
