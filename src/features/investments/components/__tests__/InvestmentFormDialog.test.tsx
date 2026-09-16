import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InvestmentFormDialog } from '../InvestmentFormDialog';
import type { Investment } from '@/features/investments/validations';

describe('InvestmentFormDialog', () => {
  it('renders create title and empty fields when no investment is provided', () => {
    render(<InvestmentFormDialog open onOpenChange={jest.fn()} onSubmit={jest.fn()} />);
    expect(screen.getByText('Novo investimento')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('');
  });

  it('renders edit title and pre-fills fields when investment is provided', () => {
    const investment: Investment = {
      id: '1',
      name: 'Tesouro Selic',
      type: 'Renda Fixa',
      value: 1000,
      quantity: '10',
      term: '12 meses',
    };
    render(
      <InvestmentFormDialog open onOpenChange={jest.fn()} investment={investment} onSubmit={jest.fn()} />
    );
    expect(screen.getByText('Editar investimento')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Tesouro Selic');
    expect(screen.getByLabelText('Valor')).toHaveValue(1000);
  });

  it('shows a validation error when submitting an empty name', async () => {
    render(<InvestmentFormDialog open onOpenChange={jest.fn()} onSubmit={jest.fn()} />);
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar investimento/i }));

    expect(await screen.findByText('Nome é obrigatório')).toBeInTheDocument();
  });

  it('calls onSubmit with parsed data and closes on success', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onOpenChange = jest.fn();
    render(<InvestmentFormDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'CDB Banco X' } });
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar investimento/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'CDB Banco X', value: 500, type: 'Renda Fixa' })
      )
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('shows submit error message when onSubmit rejects', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('Erro no servidor'));
    render(<InvestmentFormDialog open onOpenChange={jest.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'CDB' } });
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar investimento/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro no servidor');
  });

  it('calls onOpenChange(false) when cancel is clicked', () => {
    const onOpenChange = jest.fn();
    render(<InvestmentFormDialog open onOpenChange={onOpenChange} onSubmit={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not render dialog content when closed', () => {
    render(<InvestmentFormDialog open={false} onOpenChange={jest.fn()} onSubmit={jest.fn()} />);
    expect(screen.queryByText('Novo investimento')).not.toBeInTheDocument();
  });
});
