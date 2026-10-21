/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoriesList } from '../CategoriesList';
import type { Category } from '../../validations';

const CATEGORIES: Category[] = [
  { id: 'c1', name: 'Mercado', type: 'expense', color: '#111111', icon: 'tag', isDefault: false, transactionCount: 1 },
  { id: 'c2', name: 'Outros', type: 'both', color: '#222222', icon: 'tag', isDefault: true, transactionCount: 3 },
];

const INVESTMENT_CATEGORIES: Category[] = [
  { id: 'i1', name: 'Cripto', type: 'both', color: '#111111', icon: 'tag', isDefault: false, scope: 'investment', investmentCount: 3 },
  { id: 'i2', name: 'Outros investimentos', type: 'both', color: '#222222', icon: 'tag', isDefault: true, scope: 'investment', investmentCount: 0 },
];

describe('CategoriesList', () => {
  it('mostra nome, tipo, contagem e selo "Padrão"', () => {
    render(<CategoriesList categories={CATEGORIES} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText('Mercado')).toBeInTheDocument();
    expect(screen.getByText(/Despesa · 1 transação$/)).toBeInTheDocument();
    expect(screen.getByText(/Receita e despesa · 3 transações/)).toBeInTheDocument();
    expect(screen.getAllByText('Padrão')).toHaveLength(1);
  });

  it('padrões podem ser editados, mas não excluídos', () => {
    render(<CategoriesList categories={CATEGORIES} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByLabelText('Editar categoria Outros')).toBeInTheDocument();
    expect(screen.queryByLabelText('Excluir categoria Outros')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Excluir categoria Mercado')).toBeInTheDocument();
  });

  it('dispara onEdit e onDelete com a categoria clicada', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    render(<CategoriesList categories={CATEGORIES} onEdit={onEdit} onDelete={onDelete} />);

    fireEvent.click(screen.getByLabelText('Editar categoria Mercado'));
    fireEvent.click(screen.getByLabelText('Excluir categoria Mercado'));

    expect(onEdit).toHaveBeenCalledWith(CATEGORIES[0]);
    expect(onDelete).toHaveBeenCalledWith(CATEGORIES[0]);
  });

  it('escopo investment mostra a contagem de ativos e esconde o tipo', () => {
    render(
      <CategoriesList categories={INVESTMENT_CATEGORIES} scope="investment" onEdit={jest.fn()} onDelete={jest.fn()} />
    );

    expect(screen.getByText(/3 ativos/)).toBeInTheDocument();
    expect(screen.queryByText(/Receita e despesa/)).not.toBeInTheDocument();
  });
});
