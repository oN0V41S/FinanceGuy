import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { InvestmentCard } from '../InvestmentCard';
import type { Investment } from '@/features/investments/validations';

const investment: Investment = {
  id: '1',
  name: 'Tesouro Selic',
  type: 'Renda Fixa',
  value: 1500.5,
  quantity: '10 cotas',
  term: '12 meses',
};

describe('InvestmentCard', () => {
  it('renders the investment name, type and formatted value', () => {
    render(<InvestmentCard investment={investment} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Tesouro Selic')).toBeInTheDocument();
    expect(screen.getByText('Renda Fixa')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*1\.500,50/)).toBeInTheDocument();
  });

  it('renders quantity and term when present', () => {
    render(<InvestmentCard investment={investment} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText(/10 cotas/)).toBeInTheDocument();
    expect(screen.getByText(/12 meses/)).toBeInTheDocument();
  });

  it('omits quantity and term when absent', () => {
    const minimal: Investment = { id: '2', name: 'Ações XP', type: 'Renda Variável', value: 200 };
    render(<InvestmentCard investment={minimal} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.queryByText(/Quantidade/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Prazo/)).not.toBeInTheDocument();
  });

  it('calls onEdit when the edit button is clicked', () => {
    const onEdit = jest.fn();
    render(<InvestmentCard investment={investment} onEdit={onEdit} onDelete={jest.fn()} />);
    fireEvent.click(screen.getByLabelText('Editar investimento'));
    expect(onEdit).toHaveBeenCalledWith(investment);
  });

  it('calls onDelete when the delete button is clicked', () => {
    const onDelete = jest.fn();
    render(<InvestmentCard investment={investment} onEdit={jest.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Excluir investimento'));
    expect(onDelete).toHaveBeenCalledWith(investment);
  });
});

describe('InvestmentCard market asset', () => {
  const asset = {
    id: 'inv-9',
    name: 'Petrobras',
    type: 'Renda Variável' as const,
    value: 350,
    ticker: 'PETR4',
    market: 'BR' as const,
    currency: 'BRL',
    unitPrice: 35,
    shares: 10,
    status: 'ACTIVE' as const,
  };

  it('shows quote-based profit and a redeem button', () => {
    const onRedeem = jest.fn();
    render(
      <InvestmentCard
        investment={asset}
        portfolio={{ ...asset, metrics: { cost: 350, currentValue: 400, profit: 50, profitPct: 14.29 } }}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onRedeem={onRedeem}
      />
    );

    expect(screen.getByTestId('investment-metrics')).toHaveTextContent('14.29%');
    screen.getByRole('button', { name: /Resgatar/ }).click();
    expect(onRedeem).toHaveBeenCalledWith(asset);
  });

  it('shows a calm message when the quote is unavailable', () => {
    render(<InvestmentCard investment={asset} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText('Cotação indisponível no momento.')).toBeInTheDocument();
  });

  it('hides redeem for already redeemed assets', () => {
    render(
      <InvestmentCard investment={{ ...asset, status: 'REDEEMED' }} onEdit={jest.fn()} onDelete={jest.fn()} onRedeem={jest.fn()} />
    );

    expect(screen.queryByRole('button', { name: /Resgatar/ })).not.toBeInTheDocument();
    expect(screen.getByText('Resgatado')).toBeInTheDocument();
  });
});
