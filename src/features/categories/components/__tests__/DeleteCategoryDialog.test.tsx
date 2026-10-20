/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeleteCategoryDialog } from '../DeleteCategoryDialog';
import type { Category } from '../../validations';

const mercado: Category = {
  id: 'c1', name: 'Mercado', type: 'expense', color: '#111111', icon: 'tag', isDefault: false, transactionCount: 0,
};
const outros: Category = {
  id: 'c2', name: 'Outros', type: 'both', color: '#222222', icon: 'tag', isDefault: true, transactionCount: 0,
};

function setup(category: Category, onConfirm = jest.fn().mockResolvedValue(undefined)) {
  const onOpenChange = jest.fn();
  render(
    <DeleteCategoryDialog
      open
      onOpenChange={onOpenChange}
      category={category}
      otherCategories={[outros]}
      onConfirm={onConfirm}
    />
  );
  return { onConfirm, onOpenChange };
}

describe('DeleteCategoryDialog', () => {
  it('sem transações: confirma direto, sem pedir destino', async () => {
    const { onConfirm, onOpenChange } = setup(mercado);

    expect(screen.queryByText('Mover transações para')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(undefined));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('com transações: exige destino e sugere "Outros"', async () => {
    const { onConfirm } = setup({ ...mercado, transactionCount: 4 });

    expect(screen.getByText(/Há 4 transações/)).toBeInTheDocument();
    expect(screen.getByText('Mover transações para')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mover e excluir' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('c2'));
  });

  it('mostra mensagem calma e mantém o diálogo aberto se a exclusão falha', async () => {
    const onConfirm = jest.fn().mockRejectedValue(new Error('Não foi possível excluir a categoria.'));
    const { onOpenChange } = setup(mercado, onConfirm);

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível excluir a categoria.');
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
