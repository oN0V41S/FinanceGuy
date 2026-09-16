import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDeleteDialog } from '../ConfirmDeleteDialog';

describe('ConfirmDeleteDialog', () => {
  it('does not render content when closed', () => {
    render(
      <ConfirmDeleteDialog
        open={false}
        onOpenChange={jest.fn()}
        title="Excluir item"
        description="Tem certeza?"
        onConfirm={jest.fn()}
      />
    );
    expect(screen.queryByText('Excluir item')).not.toBeInTheDocument();
  });

  it('renders title and description when open', () => {
    render(
      <ConfirmDeleteDialog
        open
        onOpenChange={jest.fn()}
        title="Excluir investimento"
        description="Essa ação não pode ser desfeita."
        onConfirm={jest.fn()}
      />
    );
    expect(screen.getByText('Excluir investimento')).toBeInTheDocument();
    expect(screen.getByText('Essa ação não pode ser desfeita.')).toBeInTheDocument();
  });

  it('calls onConfirm when the Excluir button is clicked', () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmDeleteDialog
        open
        onOpenChange={jest.fn()}
        title="Excluir"
        description="Confirma?"
        onConfirm={onConfirm}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows loading label and disables buttons while deleting', () => {
    render(
      <ConfirmDeleteDialog
        open
        onOpenChange={jest.fn()}
        title="Excluir"
        description="Confirma?"
        onConfirm={jest.fn()}
        isDeleting
      />
    );
    const confirmButton = screen.getByRole('button', { name: 'Excluindo...' });
    expect(confirmButton).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });
});
