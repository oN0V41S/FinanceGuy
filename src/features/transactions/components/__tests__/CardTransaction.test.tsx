/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Transaction } from '@/types/finance';

// ---------------------------------------------------------------------------
// Mocks — UI components do shadcn-ui
// ---------------------------------------------------------------------------

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
    <div data-testid="card-root" className={className} {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
    <div data-testid="card-content" className={className} {...props}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
    <div data-testid="card-header" className={className} {...props}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { children: React.ReactNode }) => (
    <h3 data-testid="card-title" className={className} {...props}>
      {children}
    </h3>
  ),
  CardFooter: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
    <div data-testid="card-footer" className={className} {...props}>
      {children}
    </div>
  ),
  CardDescription: ({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement> & { children: React.ReactNode }) => (
    <p data-testid="card-description" className={className} {...props}>
      {children}
    </p>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { children: React.ReactNode }) => (
    <span data-testid="badge" className={className} {...props}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, 'aria-label': ariaLabel, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
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
}));

// ---------------------------------------------------------------------------
// Mocks — Utilitários
// ---------------------------------------------------------------------------

const mockFormatCurrency = jest.fn();
const mockFormatDate = jest.fn();

jest.mock('@/shared/utils', () => ({
  formatCurrency: (...args: unknown[]) => mockFormatCurrency(...args),
  formatDate: (...args: unknown[]) => mockFormatDate(...args),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(' '),
}));

// ---------------------------------------------------------------------------
// CATEGORY_COLORS — mesma definição do TransactionsTable
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

  // -----------------------------------------------------------------------
  // Teste 1: Renderiza loading state com skeletons
  // -----------------------------------------------------------------------
  it('deve renderizar 3 skeleton cards quando isLoading é true', () => {
    const { container } = renderComponent({ isLoading: true, transactions: [] });

    // Verificar que não há cards de transação
    expect(screen.queryByTestId('transaction-card')).not.toBeInTheDocument();

    // Verificar que não há empty state
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();

    // Verificar que existem skeletons (cada skeleton card tem vários skeletons)
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

  // -----------------------------------------------------------------------
  // Teste 2: Renderiza empty state quando array vazio
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // Teste 3: Renderiza lista de transações corretamente
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // Teste 4: Exibe descrição e responsável em cada card
  // -----------------------------------------------------------------------
  it('deve exibir a descrição e o responsável da transação', () => {
    const transaction = createMockTransaction({
      description: 'Supermercado Extra',
      responsible: 'Maria',
    });

    renderComponent({ transactions: [transaction] });

    expect(screen.getByText('Supermercado Extra')).toBeInTheDocument();
    expect(screen.getByText('Maria')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Teste 5: Exibe data formatada
  // -----------------------------------------------------------------------
  it('deve exibir a data formatada via formatDate', () => {
    mockFormatDate.mockReturnValue('15/01/2026');

    const transaction = createMockTransaction({ date: '2026-01-15' });
    renderComponent({ transactions: [transaction] });

    expect(screen.getByText('15/01/2026')).toBeInTheDocument();
    expect(mockFormatDate).toHaveBeenCalledWith('2026-01-15');
  });

  // -----------------------------------------------------------------------
  // Teste 6: Exibe categoria como badge com cor
  // -----------------------------------------------------------------------
  it('deve exibir a categoria como Badge com as classes de cor corretas', () => {
    const transaction = createMockTransaction({ category: 'Transporte' });
    renderComponent({ transactions: [transaction] });

    const badge = screen.getByTestId('badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Transporte');
    expect(badge.className).toContain('bg-blue-100');
    expect(badge.className).toContain('text-blue-800');
  });

  it('deve usar a cor "Outros" para categorias desconhecidas', () => {
    // Usar uma categoria que não existe no CATEGORY_COLORS via type cast
    const transaction = createMockTransaction({ category: 'Assinatura' as any });
    renderComponent({ transactions: [transaction] });

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('Assinatura');
    expect(badge.className).toContain('bg-gray-100');
    expect(badge.className).toContain('text-gray-800');
  });

  // -----------------------------------------------------------------------
  // Teste 7: Exibe status Pago com ícone Check e badge verde
  // -----------------------------------------------------------------------
  it('deve exibir badge "Pago" com ícone Check quando paid é true', () => {
    const transaction = createMockTransaction({ paid: true });
    renderComponent({ transactions: [transaction] });

    const statusIndicator = screen.getByTestId('status-indicator');
    expect(statusIndicator).toHaveTextContent('Pago');
    expect(screen.getByTestId('icon-check')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Teste 8: Exibe status Pendente com ícone X e badge amarelo
  // -----------------------------------------------------------------------
  it('deve exibir badge "Pendente" com ícone X quando paid é false', () => {
    const transaction = createMockTransaction({ paid: false });
    renderComponent({ transactions: [transaction] });

    const statusIndicator = screen.getByTestId('status-indicator');
    expect(statusIndicator).toHaveTextContent('Pendente');
    expect(screen.getByTestId('icon-x')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Teste 9: Exibe valor com cor verde para income
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // Teste 10: Exibe valor com cor vermelha para expense
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // Teste 11: Botão de editar chama onEdit com a transação correta
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // Teste 12: Botão de excluir chama onDelete com o id correto
  // -----------------------------------------------------------------------
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
// Tests — Layout
// ===========================================================================

describe('CardTransaction — Layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Teste 13: Cada botão de ação está em sua própria coluna
  // -----------------------------------------------------------------------
  it('deve renderizar botão Editar e Excluir em elementos separados', () => {
    const transaction = createMockTransaction();
    renderComponent({ transactions: [transaction] });

    const editButton = screen.getByRole('button', { name: /editar transação/i });
    const deleteButton = screen.getByRole('button', { name: /excluir transação/i });

    expect(editButton).toBeInTheDocument();
    expect(deleteButton).toBeInTheDocument();

    // Cada botão deve estar em seu próprio wrapper (não no mesmo container)
    const editContainer = editButton.parentElement;
    const deleteContainer = deleteButton.parentElement;

    // Devem ser containers diferentes (cada um em sua coluna)
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

  // -----------------------------------------------------------------------
  // Teste 14: Grid responsivo (1/2/3 colunas)
  // -----------------------------------------------------------------------
  it('deve usar grid layout responsivo com classes Tailwind', () => {
    const transactions = [
      createMockTransaction({ id: '1' }),
      createMockTransaction({ id: '2' }),
    ];
    const { container } = renderComponent({ transactions });

    // O container do grid deve ter as classes de grid responsivo
    const gridContainer = container.querySelector('[data-testid="transactions-grid"]');
    expect(gridContainer).toBeInTheDocument();

    // Verificar classes responsivas: 1 col mobile, 2 col md, 3 col lg
    expect(gridContainer?.className).toContain('grid');
  });

  // -----------------------------------------------------------------------
  // Teste 15: CardFooter usa grid grid-cols-2 no mobile
  // -----------------------------------------------------------------------
  it('deve ter classe grid grid-cols-2 no CardFooter para layout mobile', () => {
    const transaction = createMockTransaction();
    renderComponent({ transactions: [transaction] });

    const footer = screen.getByTestId('card-footer');
    expect(footer).toBeInTheDocument();

    // Mobile: grid + grid-cols-2
    expect(footer.className).toContain('grid');
    expect(footer.className).toContain('grid-cols-2');
  });

  // -----------------------------------------------------------------------
  // Teste 16: CardFooter usa md:flex md:justify-end no desktop
  // -----------------------------------------------------------------------
  it('deve ter classe md:flex md:justify-end no CardFooter para layout desktop', () => {
    const transaction = createMockTransaction();
    renderComponent({ transactions: [transaction] });

    const footer = screen.getByTestId('card-footer');
    expect(footer).toBeInTheDocument();

    // Desktop: md:flex + md:justify-end
    expect(footer.className).toContain('md:flex');
    expect(footer.className).toContain('md:justify-end');
  });

  // -----------------------------------------------------------------------
  // Teste 17: CardFooter também tem md:gap-2 no desktop
  // -----------------------------------------------------------------------
  it('deve ter classe md:gap-2 no CardFooter para espaçamento desktop', () => {
    const transaction = createMockTransaction();
    renderComponent({ transactions: [transaction] });

    const footer = screen.getByTestId('card-footer');
    expect(footer).toBeInTheDocument();
    expect(footer.className).toContain('md:gap-2');
  });

  // -----------------------------------------------------------------------
  // Teste 18: Cada botão de ação está dentro de wrapper com flex justify-center
  // -----------------------------------------------------------------------
  it('deve envolver cada botão de ação em div com classe flex justify-center', () => {
    const transaction = createMockTransaction();
    renderComponent({ transactions: [transaction] });

    const footer = screen.getByTestId('card-footer');
    const children = Array.from(footer.children);

    // Devem haver 2 wrappers (um para Editar, um para Excluir)
    expect(children).toHaveLength(2);

    // Cada wrapper deve ter flex justify-center
    children.forEach((child) => {
      expect(child.className).toContain('flex');
      expect(child.className).toContain('justify-center');
    });
  });

  // -----------------------------------------------------------------------
  // Teste 19: Botão Editar está dentro do primeiro wrapper
  // -----------------------------------------------------------------------
  it('deve ter o botão Editar dentro do primeiro wrapper com flex justify-center', () => {
    const transaction = createMockTransaction();
    renderComponent({ transactions: [transaction] });

    const footer = screen.getByTestId('card-footer');
    const firstWrapper = footer.children[0];

    const editButton = firstWrapper.querySelector('button[aria-label="Editar transação"]');
    expect(editButton).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Teste 20: Botão Excluir está dentro do segundo wrapper
  // -----------------------------------------------------------------------
  it('deve ter o botão Excluir dentro do segundo wrapper com flex justify-center', () => {
    const transaction = createMockTransaction();
    renderComponent({ transactions: [transaction] });

    const footer = screen.getByTestId('card-footer');
    const secondWrapper = footer.children[1];

    const deleteButton = secondWrapper.querySelector('button[aria-label="Excluir transação"]');
    expect(deleteButton).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Teste 21: Botões têm tamanho size-8 no mobile
  // -----------------------------------------------------------------------
  it('deve aplicar classe size-8 aos botões de ação para layout mobile', () => {
    const transaction = createMockTransaction();
    renderComponent({ transactions: [transaction] });

    const editButton = screen.getByRole('button', { name: /editar transação/i });
    const deleteButton = screen.getByRole('button', { name: /excluir transação/i });

    // Mobile: botões com size-8
    expect(editButton.className).toContain('size-8');
    expect(deleteButton.className).toContain('size-8');
  });

  // -----------------------------------------------------------------------
  // Teste 22: Botões têm classe md:size-9 para desktop
  // -----------------------------------------------------------------------
  it('deve aplicar classe md:size-9 aos botões de ação para layout desktop', () => {
    const transaction = createMockTransaction();
    renderComponent({ transactions: [transaction] });

    const editButton = screen.getByRole('button', { name: /editar transação/i });
    const deleteButton = screen.getByRole('button', { name: /excluir transação/i });

    // Desktop: botões com md:size-9
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
    mockFormatDate
      .mockReturnValueOnce('15/01/2026')
      .mockReturnValueOnce('20/01/2026');

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

    // Verificar descrições
    expect(screen.getByText('Salário Mensal')).toBeInTheDocument();
    expect(screen.getByText('Almoço')).toBeInTheDocument();

    // Verificar responsáveis
    expect(screen.getByText('João')).toBeInTheDocument();
    expect(screen.getByText('Maria')).toBeInTheDocument();

    // Verificar que há badges de categoria (1 por transação)
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
    expect(mockFormatCurrency).toHaveBeenCalledTimes(2);
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
