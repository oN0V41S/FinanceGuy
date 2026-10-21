/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CategoryFormDialog } from '../CategoryFormDialog';
import type { Category } from '../../validations';

const outrosInvestimentos: Category = {
  id: 'i7',
  name: 'Outros investimentos',
  type: 'both',
  color: '#64748B',
  icon: 'tag',
  isDefault: true,
  scope: 'investment',
};

describe('CategoryFormDialog', () => {
  it('esconde o seletor de tipo no escopo investment', () => {
    render(
      <CategoryFormDialog open onOpenChange={jest.fn()} onSubmit={jest.fn()} scope="investment" />
    );

    expect(screen.queryByText('Tipo')).not.toBeInTheDocument();
  });

  it('envia type "both" e scope "investment" no escopo investment', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(
      <CategoryFormDialog open onOpenChange={jest.fn()} onSubmit={onSubmit} scope="investment" />
    );

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Cripto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar categoria' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Cripto', type: 'both', scope: 'investment' })
      )
    );
  });

  it('mostra o seletor de tipo no escopo transaction (padrão)', () => {
    render(<CategoryFormDialog open onOpenChange={jest.fn()} onSubmit={jest.fn()} />);

    expect(screen.getByText('Tipo')).toBeInTheDocument();
  });

  it('trava o nome do fallback "Outros investimentos" no escopo investment', () => {
    render(
      <CategoryFormDialog
        open
        onOpenChange={jest.fn()}
        category={outrosInvestimentos}
        onSubmit={jest.fn()}
        scope="investment"
      />
    );

    expect(screen.getByLabelText('Nome')).toBeDisabled();
    expect(screen.getByText(/Outros investimentos/)).toBeInTheDocument();
  });
});
