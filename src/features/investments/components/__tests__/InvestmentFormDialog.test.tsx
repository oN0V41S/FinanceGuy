import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InvestmentFormDialog } from '../InvestmentFormDialog';
import type { Investment } from '@/features/investments/validations';

jest.mock('@/components/ui/select', () => {
  const React = jest.requireActual('react');
  const SelectContext = React.createContext<{ value: string; onValueChange: (value: string) => void } | null>(null);

  const Select = ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) => {
    const ctx = React.useMemo(
      () => ({ value: value ?? '', onValueChange: onValueChange ?? (() => {}) }),
      [value, onValueChange]
    );
    return (
      <SelectContext.Provider value={ctx}>
        <div data-testid="select-root" data-value={value ?? ''}>
          {children}
        </div>
      </SelectContext.Provider>
    );
  };
  const SelectTrigger = ({
    children,
    id,
    ...props
  }: React.HTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button type="button" id={id} data-testid={`select-trigger-${id ?? 'default'}`} {...props}>
      {children}
    </button>
  );
  const SelectValue = ({ children, placeholder }: { children?: React.ReactNode; placeholder?: string }) => (
    <span data-testid="select-value">{children ?? placeholder}</span>
  );
  const SelectContent = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  );
  const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => {
    const ctx = React.useContext(SelectContext);
    return (
      <div data-testid={`select-item-${value}`} onClick={() => ctx?.onValueChange(value)}>
        {children}
      </div>
    );
  };
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

const INVESTMENT_CATEGORIES = [
  { id: 'clx1a2b3c4d5', name: 'Renda Fixa', type: 'both', color: '#3B82F6', icon: 'wallet', isDefault: true, scope: 'investment', investmentCount: 0 },
  { id: 'clx1a2b3c4d6', name: 'Cripto', type: 'both', color: '#EAB308', icon: 'smartphone', isDefault: false, scope: 'investment', investmentCount: 2 },
];

function mockCategories(categories: unknown[], ok = true) {
  mockFetch.mockImplementation(async () =>
    jsonResponse({ data: categories }, ok)
  );
}

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

describe('InvestmentFormDialog â€” categoria', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('envia categoryId null por padrão (Sem categoria)', async () => {
    mockCategories(INVESTMENT_CATEGORIES);
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<InvestmentFormDialog open onOpenChange={jest.fn()} onSubmit={onSubmit} />);

    await waitFor(() =>
      expect(screen.getByTestId('select-trigger-investment-category')).toHaveTextContent('Sem categoria')
    );
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'CDB' } });
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar investimento/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ categoryId: null })));
  });

  it('envia o categoryId selecionado', async () => {
    mockCategories(INVESTMENT_CATEGORIES);
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<InvestmentFormDialog open onOpenChange={jest.fn()} onSubmit={onSubmit} />);

    await waitFor(() => expect(screen.getByTestId('select-item-clx1a2b3c4d6')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('select-item-clx1a2b3c4d6'));
    expect(screen.getByTestId('select-trigger-investment-category')).toHaveTextContent('Cripto');

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Bitcoin' } });
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar investimento/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 'clx1a2b3c4d6' })));
  });

  it('mantém o formulário utilizável quando as categorias falham', async () => {
    mockCategories([], false);
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<InvestmentFormDialog open onOpenChange={jest.fn()} onSubmit={onSubmit} />);

    expect(await screen.findByText(/Não foi possível carregar as categorias/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'CDB' } });
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '300' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar investimento/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ categoryId: null })));
  });

  it('pré-preenche a categoria ao editar', async () => {
    mockCategories(INVESTMENT_CATEGORIES);
    const investment: Investment = {
      id: '1',
      name: 'Tesouro',
      type: 'Renda Fixa',
      value: 1000,
      categoryId: 'clx1a2b3c4d6',
      category: { id: 'clx1a2b3c4d6', name: 'Cripto', color: '#EAB308' },
    };
    render(<InvestmentFormDialog open onOpenChange={jest.fn()} investment={investment} onSubmit={jest.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId('select-trigger-investment-category')).toHaveTextContent('Cripto')
    );
  });
});
