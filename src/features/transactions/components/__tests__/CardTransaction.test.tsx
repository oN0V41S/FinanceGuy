/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Transaction } from '@/types/finance';

// ---------------------------------------------------------------------------
// Mocks — UI components
// ---------------------------------------------------------------------------

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, 'aria-label': ariaLabel, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={className}
      data-testid={`action-button-${ariaLabel?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="skeleton" className={className} {...props} />
  ),
}));

// ---------------------------------------------------------------------------
// Mocks — Icons
// ---------------------------------------------------------------------------

jest.mock('lucide-react', () => ({
  Edit2: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-edit" {...props} />
  ),
  Trash2: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-trash" {...props} />
  ),
  Check: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-check" {...props} />
  ),
  X: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-x" {...props} />
  ),
  RefreshCw: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-refresh" {...props} />
  ),
  TrendingUp: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-trending-up" {...props} />
  ),
  TrendingDown: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-trending-down" {...props} />
  ),
}));

// ---------------------------------------------------------------------------
// Mocks — Utilitários
// ---------------------------------------------------------------------------

const mockFormatCurrency = jest.fn();

jest.mock('@/shared/utils', () => ({
  formatCurrency: (...args: unknown[]) => mockFormatCurrency(...args),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(' '),
}));

// ---------------------------------------------------------------------------
// CATEGORY_COLORS — mesma definição do CardTransaction
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  Alimentação: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  Transporte: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Casa: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Saúde: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Educação: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Lazer: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  Salário: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  Investimentos: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  Outros: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockOnEdit = jest.fn();
const mockOnDelete = jest.fn();

function createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn-001',
    type: 'expense',
    description: 'Aluguel',
    value: 1500,
    date: '2026-01-15',
    category: 'Casa',
    responsible: 'João',
    paid: true,
    is_recurring: false,
    created_at: new Date('2026-01-15'),
    updated_at: new Date('2026-01-15'),
    ...overrides,
  };
}

const defaultProps = {
  transactions: [] as Transaction[],
  isLoading: false,
  onEdit: mockOnEdit,
  onDelete: mockOnDelete,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderComponent(overrides: Partial<typeof defaultProps> = {}) {
  return render(
    <CardTransaction
      {...defaultProps}
      {...overrides}
    />,
  );
}

// Importar o componente APÓS os mocks (hoisting do Jest resolve)
import CardTransaction from '../CardTransaction';

// ===========================================================================
// Tests — Estados
// ===========================================================================

describe('CardTransaction — Loading State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve renderizar 3+ skeleton elements quando isLoading é true', () => {
    const { container } = renderComponent({ isLoading: true, transactions: [] });

    expect(screen.queryByTestId('transaction-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();

    const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it('deve priorizar loading state sobre empty state', () => {
    renderComponent({ isLoading: true, transactions: [] });

    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('transaction-card')).not.toBeInTheDocument();
  });
});

describe('CardTransaction — Empty State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve exibir mensagem de empty state quando não há transações', () => {
    renderComponent({ transactions: [], isLoading: false });

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma transação encontrada para o período selecionado.')).toBeInTheDocument();
  });

  it('não deve exibir skeletons quando não está carregando', () => {
    const { container } = renderComponent({ transactions: [], isLoading: false });

    expect(container.querySelectorAll('[data-testid="skeleton"]').length).toBe(0);
  });
});

// ===========================================================================
// Tests — Renderização Normal
// ===========================================================================

describe('CardTransaction — Renderização', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve renderizar um card para cada transação', () => {
    const transactions = [
      createMockTransaction({ id: '1', description: 'Aluguel' }),
      createMockTransaction({ id: '2', description: 'Supermercado' }),
      createMockTransaction({ id: '3', description: 'Salário', type: 'income' }),
    ];

    renderComponent({ transactions });

    const cards = screen.getAllByTestId('transaction-card');
    expect(cards).toHaveLength(3);
  });

  it('deve exibir a descrição e o responsável da transação', () => {
    const transaction = createMockTransaction({
      description: 'Supermercado Extra',
      responsible: 'Maria',
    });

    renderComponent({ transactions: [transaction] });

    expect(screen.getByText('Supermercado Extra')).toBeInTheDocument();
    expect(screen.getByText('Maria')).toBeInTheDocument();
  });

  it('deve exibir data agrupada no cabeçalho do grupo', () => {
    const transaction = createMockTransaction({ date: '2026-01-15' });
    renderComponent({ transactions: [transaction] });

    const dateHeader = screen.getByTestId('date-header');
    expect(dateHeader).toBeInTheDocument();
    // O cabeçalho deve mostrar o dia e o mês em português maiúsculo
    expect(dateHeader.textContent).toMatch(/15 DE/i);
  });

  it('deve exibir a categoria como badge com as classes de cor corretas', () => {
    const transaction = createMockTransaction({ category: 'Transporte' });
    renderComponent({ transactions: [transaction] });

    const badge = screen.getByTestId('badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Transporte');
    expect(badge.className).toContain('bg-blue-100');
    expect(badge.className).toContain('text-blue-800');
  });

  it('deve usar a cor "Outros" para categorias desconhecidas', () => {
    const transaction = createMockTransaction({ category: 'Assinatura' as any });
    renderComponent({ transactions: [transaction] });

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('Assinatura');
    expect(badge.className).toContain('bg-gray-100');
    expect(badge.className).toContain('text-gray-800');
  });

  it('deve exibir badge "Pago" com ícone Check quando paid é true', () => {
    const transaction = createMockTransaction({ paid: true });
    renderComponent({ transactions: [transaction] });

    const statusIndicator = screen.getByTestId('status-indicator');
    expect(statusIndicator).toHaveTextContent('Pago');
    expect(screen.getByTestId('icon-check')).toBeInTheDocument();
  });

  it('deve exibir badge "Pendente" com ícone X quando paid é false', () => {
    const transaction = createMockTransaction({ paid: false });
    renderComponent({ transactions: [transaction] });

    const statusIndicator = screen.getByTestId('status-indicator');
    expect(statusIndicator).toHaveTextContent('Pendente');
    expect(screen.getByTestId('icon-x')).toBeInTheDocument();
  });

  it('deve exibir valor com classe text-finance-income quando type é income', () => {
    mockFormatCurrency.mockReturnValue('R$ 5.000,00');

    const transaction = createMockTransaction({
      type: 'income',
      value: 5000,
      description: 'Salário',
    });
    renderComponent({ transactions: [transaction] });

    const priceElement = screen.getByTestId('transaction-value');
    expect(priceElement).toHaveTextContent('R$ 5.000,00');
    expect(priceElement.className).toContain('text-finance-income');
    expect(mockFormatCurrency).toHaveBeenCalledWith(5000);
  });

  it('deve exibir valor com classe text-finance-expense quando type é expense', () => {
    mockFormatCurrency.mockReturnValue('R$ 1.500,00');

    const transaction = createMockTransaction({
      type: 'expense',
      value: 1500,
      description: 'Aluguel',
    });
    renderComponent({ transactions: [transaction] });

    const priceElement = screen.getByTestId('transaction-value');
    expect(priceElement).toHaveTextContent('R$ 1.500,00');
    expect(priceElement.className).toContain('text-finance-expense');
    expect(mockFormatCurrency).toHaveBeenCalledWith(1500);
  });

  it('deve chamar onEdit com a transação correta ao clicar em Editar', () => {
    const transaction = createMockTransaction({
      id: 'txn-editar-001',
      description: 'Aluguel',
    });
    renderComponent({ transactions: [transaction] });

    const editButton = screen.getByRole('button', { name: /editar transação/i });
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
    expect(mockOnEdit).toHaveBeenCalledWith(transaction);
  });

  it('deve chamar onDelete com o id correto ao clicar em Excluir', () => {
    const transaction = createMockTransaction({
      id: 'txn-excluir-001',
      description: 'Aluguel',
    });
    renderComponent({ transactions: [transaction] });

    const deleteButton = screen.getByRole('button', { name: /excluir transação/i });
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
    expect(mockOnDelete).toHaveBeenCalledWith('txn-excluir-001');
  });

  it('deve chamar onEdit para cada transação individualmente', () => {
    const transactions = [
      createMockTransaction({ id: 'id-1', description: 'Compras' }),
      createMockTransaction({ id: 'id-2', description: 'Freelance' }),
    ];
    renderComponent({ transactions });

    const editButtons = screen.getAllByRole('button', { name: /editar transação/i });
    expect(editButtons).toHaveLength(2);

    fireEvent.click(editButtons[1]);
    expect(mockOnEdit).toHaveBeenCalledWith(transactions[1]);
  });

  it('deve chamar onDelete para cada transação individualmente', () => {
    const transactions = [
      createMockTransaction({ id: 'id-a', description: 'Compras' }),
      createMockTransaction({ id: 'id-b', description: 'Freelance' }),
    ];
    renderComponent({ transactions });

    const deleteButtons = screen.getAllByRole('button', { name: /excluir transação/i });
    expect(deleteButtons).toHaveLength(2);

    fireEvent.click(deleteButtons[0]);
    expect(mockOnDelete).toHaveBeenCalledWith('id-a');
  });
});

// ===========================================================================
// Tests — Layout (lista agrupada por data)
// ===========================================================================

describe('CardTransaction — Layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve renderizar botão Editar e Excluir em elementos separados', () => {
    const transaction = createMockTransaction();
    renderComponent({ transactions: [transaction] });

    const editButton = screen.getByRole('button', { name: /editar transação/i });
    const deleteButton = screen.getByRole('button', { name: /excluir transação/i });

    expect(editButton).toBeInTheDocument();
    expect(deleteButton).toBeInTheDocument();

    const editContainer = editButton.parentElement;
    const deleteContainer = deleteButton.parentElement;
    expect(editContainer).not.toBe(deleteContainer);
  });

  it('deve renderizar ícone Edit2 no botão Editar', () => {
    const transaction = createMockTransaction();
    renderComponent({ transactions: [transaction] });

    const editButton = screen.getByRole('button', { name: /editar transação/i });
    const editIcon = editButton.querySelector('[data-testid="icon-edit"]');
    expect(editIcon).toBeInTheDocument();
  });

  it('deve renderizar ícone Trash2 no botão Excluir', () => {
    const transaction = createMockTransaction();
    renderComponent({ transactions: [transaction] });

    const deleteButton = screen.getByRole('button', { name: /excluir transação/i });
    const trashIcon = deleteButton.querySelector('[data-testid="icon-trash"]');
    expect(trashIcon).toBeInTheDocument();
  });

  it('deve usar transactions-list como container principal da lista', () => {
    const transactions = [
      createMockTransaction({ id: '1' }),
      createMockTransaction({ id: '2' }),
    ];
    const { container } = renderComponent({ transactions });

    const listContainer = container.querySelector('[data-testid="transactions-list"]');
    expect(listContainer).toBeInTheDocument();
  });

  it('deve agrupar transações por data em date-group', () => {
    const transactions = [
      createMockTransaction({ id: '1', date: '2026-01-15' }),
      createMockTransaction({ id: '2', date: '2026-01-15' }),
      createMockTransaction({ id: '3', date: '2026-01-10' }),
    ];
    renderComponent({ transactions });

    const groups = screen.getAllByTestId('date-group');
    expect(groups).toHaveLength(2);
  });

  it('deve exibir cabeçalho de data com formato DD DE MÊS', () => {
    const transaction = createMockTransaction({ date: '2026-09-02' });
    renderComponent({ transactions: [transaction] });

    const dateHeader = screen.getByTestId('date-header');
    expect(dateHeader.textContent).toContain('02 DE');
    expect(dateHeader.textContent?.toUpperCase()).toContain('SETEMBRO');
  });

  it('deve exibir total diário no cabeçalho do grupo', () => {
    const transactions = [
      createMockTransaction({ id: '1', date: '2026-01-15', type: 'income', value: 1000 }),
      createMockTransaction({ id: '2', date: '2026-01-15', type: 'expense', value: 300 }),
    ];
    renderComponent({ transactions });

    const dailyTotal = screen.getByTestId('daily-total');
    expect(dailyTotal).toBeInTheDocument();
  });

  it('deve aplicar classe size-8 aos botões de ação para layout mobile', () => {
    const transaction = createMockTransaction();
    renderComponent({ transactions: [transaction] });

    const editButton = screen.getByRole('button', { name: /editar transação/i });
    const deleteButton = screen.getByRole('button', { name: /excluir transação/i });

    expect(editButton.className).toContain('size-8');
    expect(deleteButton.className).toContain('size-8');
  });

  it('deve aplicar classe md:size-9 aos botões de ação para layout desktop', () => {
    const transaction = createMockTransaction();
    renderComponent({ transactions: [transaction] });

    const editButton = screen.getByRole('button', { name: /editar transação/i });
    const deleteButton = screen.getByRole('button', { name: /excluir transação/i });

    expect(editButton.className).toContain('md:size-9');
    expect(deleteButton.className).toContain('md:size-9');
  });
});

// ===========================================================================
// Tests — Múltiplas Transações
// ===========================================================================

describe('CardTransaction — Múltiplas Transações', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve renderizar múltiplas transações com dados mistos', () => {
    mockFormatCurrency.mockReturnValueOnce('R$ 2.000,00');
    mockFormatCurrency.mockReturnValueOnce('R$ 45,90');

    const transactions = [
      createMockTransaction({
        id: '1',
        description: 'Salário Mensal',
        value: 2000,
        type: 'income',
        category: 'Salário',
        responsible: 'João',
        paid: true,
      }),
      createMockTransaction({
        id: '2',
        description: 'Almoço',
        value: 45.9,
        type: 'expense',
        category: 'Alimentação',
        responsible: 'Maria',
        paid: false,
      }),
    ];

    renderComponent({ transactions });

    const cards = screen.getAllByTestId('transaction-card');
    expect(cards).toHaveLength(2);

    expect(screen.getByText('Salário Mensal')).toBeInTheDocument();
    expect(screen.getByText('Almoço')).toBeInTheDocument();
    expect(screen.getByText('João')).toBeInTheDocument();
    expect(screen.getByText('Maria')).toBeInTheDocument();

    const badges = screen.getAllByTestId('badge');
    expect(badges).toHaveLength(2);
  });

  it('deve formatar currency para cada transação', () => {
    mockFormatCurrency
      .mockReturnValueOnce('R$ 2.000,00')
      .mockReturnValueOnce('R$ 45,90');

    const transactions = [
      createMockTransaction({ id: '1', value: 2000, type: 'income' }),
      createMockTransaction({ id: '2', value: 45.9, type: 'expense' }),
    ];

    renderComponent({ transactions });

    const values = screen.getAllByTestId('transaction-value');
    expect(values).toHaveLength(2);
  });

  it('deve ter 4 action buttons (2 editar + 2 excluir) para 2 transações', () => {
    const transactions = [
      createMockTransaction({ id: '1', description: 'A' }),
      createMockTransaction({ id: '2', description: 'B' }),
    ];

    renderComponent({ transactions });

    const editButtons = screen.getAllByRole('button', { name: /editar transação/i });
    const deleteButtons = screen.getAllByRole('button', { name: /excluir transação/i });

    expect(editButtons).toHaveLength(2);
    expect(deleteButtons).toHaveLength(2);
  });
});

// ===========================================================================
// Tests — Título (Issue #13)
// ===========================================================================

describe('CardTransaction — Título (Issue #13)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve renderizar o título (tx.title) como texto principal quando presente', () => {
    const transaction = createMockTransaction({
      title: 'Aluguel do Apartamento',
      description: 'Mensalidade de janeiro',
    });
    renderComponent({ transactions: [transaction] });

    // O título aparece como parte do texto principal do card
    expect(screen.getByText(/Aluguel do Apartamento/)).toBeInTheDocument();
  });

  it('deve renderizar descrição junto com o título quando ambos presentes', () => {
    const transaction = createMockTransaction({
      title: 'Aluguel',
      description: 'Contrato mensal do apê',
    });
    renderComponent({ transactions: [transaction] });

    // Tanto título quanto descrição aparecem no parágrafo
    const card = screen.getByTestId('transaction-card');
    expect(card.textContent).toContain('Aluguel');
    expect(card.textContent).toContain('Contrato mensal do apê');
  });

  it('não deve renderizar descrição quando tx.description é undefined', () => {
    const transaction = createMockTransaction({
      title: 'Aluguel',
      description: undefined,
    });
    renderComponent({ transactions: [transaction] });

    expect(screen.queryByText('Contrato mensal do apê')).not.toBeInTheDocument();
    expect(screen.getByText('Aluguel')).toBeInTheDocument();
  });

  it('deve aplicar truncamento visual ao parágrafo do título', () => {
    const longTitle = 'Aluguel do apartamento 302 - contrato mensal de locação';
    const transaction = createMockTransaction({ title: longTitle });
    renderComponent({ transactions: [transaction] });

    const card = screen.getByTestId('transaction-card');
    const titleParagraph = card.querySelector('p');
    const hasTruncateClass = /truncate|line-clamp/.test(titleParagraph?.className || '');
    const hasFullTitleAttr = titleParagraph?.getAttribute('title')?.includes(longTitle.substring(0, 20));
    expect(hasTruncateClass || hasFullTitleAttr).toBe(true);
  });

  it('deve chamar onEdit com a transação (incluindo title) ao clicar em Editar', () => {
    const transaction = createMockTransaction({
      title: 'Aluguel',
      description: 'Mensal',
    });
    renderComponent({ transactions: [transaction] });

    fireEvent.click(screen.getByRole('button', { name: /editar transação/i }));

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
    expect(mockOnEdit).toHaveBeenCalledWith(transaction);
  });

  it('deve chamar onDelete com o id correto quando o card possui título', () => {
    const transaction = createMockTransaction({
      id: 'txn-title-001',
      title: 'Aluguel',
      description: 'Mensal',
    });
    renderComponent({ transactions: [transaction] });

    fireEvent.click(screen.getByRole('button', { name: /excluir transação/i }));

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
    expect(mockOnDelete).toHaveBeenCalledWith('txn-title-001');
  });

  it('deve renderizar o card normalmente quando title está ausente (fallback para description)', () => {
    const transaction = createMockTransaction({
      description: 'Mercado do mês',
    });
    renderComponent({ transactions: [transaction] });

    expect(screen.getByTestId('transaction-card')).toBeInTheDocument();
    expect(screen.getByText('Mercado do mês')).toBeInTheDocument();
  });

  it('deve renderizar o card sem quebrar quando title e description estão ausentes', () => {
    const transaction = createMockTransaction({
      title: undefined,
      description: undefined,
    });
    renderComponent({ transactions: [transaction] });

    expect(screen.getByTestId('transaction-card')).toBeInTheDocument();
  });
});

// ===========================================================================
// Tests — Badge "Recorrente" (Issue #12)
// ===========================================================================

describe('CardTransaction — Badge Recorrente (Issue #12)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve exibir badge "Recorrente" com ícone RefreshCw quando is_recurring é true', () => {
    const transaction = createMockTransaction({ is_recurring: true });
    renderComponent({ transactions: [transaction] });

    expect(screen.getByText('Recorrente')).toBeInTheDocument();
    expect(screen.getByTestId('icon-refresh')).toBeInTheDocument();
  });

  it('deve exibir badge "Recorrente" quando total_installments é maior que 1', () => {
    const transaction = createMockTransaction({
      total_installments: 3,
      installment_number: 2,
    });
    renderComponent({ transactions: [transaction] });

    expect(screen.getByText('Recorrente')).toBeInTheDocument();
    expect(screen.getByTestId('icon-refresh')).toBeInTheDocument();
  });

  it('deve exibir badge "Recorrente" quando parent_transaction_id está preenchido', () => {
    const transaction = createMockTransaction({
      parent_transaction_id: 'parent-001',
    });
    renderComponent({ transactions: [transaction] });

    expect(screen.getByText('Recorrente')).toBeInTheDocument();
    expect(screen.getByTestId('icon-refresh')).toBeInTheDocument();
  });

  it('não deve exibir badge "Recorrente" para transação normal', () => {
    const transaction = createMockTransaction();
    renderComponent({ transactions: [transaction] });

    expect(screen.queryByText('Recorrente')).not.toBeInTheDocument();
    expect(screen.queryByTestId('icon-refresh')).not.toBeInTheDocument();
  });

  it('deve exibir badge "Recorrente" apenas para transações recorrentes em lista mista', () => {
    const normal = createMockTransaction({ id: 'n1', description: 'Normal' });
    const recurring = createMockTransaction({
      id: 'r1',
      description: 'Parcela recorrente',
      is_recurring: true,
    });
    renderComponent({ transactions: [normal, recurring] });

    expect(screen.getAllByText('Recorrente')).toHaveLength(1);

    // Apenas 2 category badges (Recorrente não usa data-testid="badge")
    expect(screen.getAllByTestId('badge')).toHaveLength(2);
  });

  it('deve exibir badge "Recorrente" com classes amber', () => {
    const transaction = createMockTransaction({ is_recurring: true });
    renderComponent({ transactions: [transaction] });

    const card = screen.getByTestId('transaction-card');
    const recurrentSpan = Array.from(card.querySelectorAll('span')).find(
      (s) => s.textContent?.includes('Recorrente'),
    );
    expect(recurrentSpan).toBeInTheDocument();
    expect(recurrentSpan?.className).toContain('bg-amber-100');
    expect(recurrentSpan?.className).toContain('text-amber-800');
  });
});
