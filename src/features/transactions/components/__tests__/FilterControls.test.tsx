/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks — UI components
// ---------------------------------------------------------------------------

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, ...props }: any) => (
    <div data-testid="select-root" data-value={value} {...props}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, className, ...props }: any) => (
    <button data-testid="select-trigger" className={className} {...props}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: any) => (
    <span data-testid="select-value">{placeholder}</span>
  ),
  SelectContent: ({ children }: any) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: any) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input className={className} {...props} />
  ),
}));

// ---------------------------------------------------------------------------
// Mocks — Icons
// ---------------------------------------------------------------------------

jest.mock('lucide-react', () => ({
  Search: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-search" {...props} />
  ),
}));

// ---------------------------------------------------------------------------
// Mocks — Utilitários
// ---------------------------------------------------------------------------

const mockGetYearOptions = jest.fn();

jest.mock('@/shared/utils', () => ({
  getYearOptions: () => mockGetYearOptions(),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(' '),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const defaultProps = {
  quinzenalFilter: 'month' as 'month' | 'first' | 'second',
  onQuinzenalFilterChange: jest.fn(),
  selectedYear: '2026',
  onYearChange: jest.fn(),
  selectedMonth: '01',
  onMonthChange: jest.fn(),
  paidFilter: 'all' as 'all' | 'paid' | 'unpaid',
  onPaidFilterChange: jest.fn(),
  typeFilter: 'all' as 'all' | 'income' | 'expense',
  onTypeFilterChange: jest.fn(),
  searchFilter: '',
  onSearchChange: jest.fn(),
  categoryFilter: '',
  onCategoryFilterChange: jest.fn(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderComponent(overrides: Partial<typeof defaultProps> = {}) {
  return render(
    <FilterControls
      {...defaultProps}
      {...overrides}
    />,
  );
}

// Importar o componente APÓS os mocks (hoisting do Jest resolve)
import FilterControls from '../FilterControls';

// ===========================================================================
// Tests — Estrutura principal (2 linhas)
// ===========================================================================

describe('FilterControls — Estrutura', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetYearOptions.mockReturnValue([2025, 2026, 2027]);
  });

  it('deve renderizar o componente sem erros', () => {
    renderComponent();
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('deve renderizar campo de busca com ícone Search', () => {
    renderComponent();

    const searchInput = screen.getByTestId('search-input');
    expect(searchInput).toBeInTheDocument();
    expect(screen.getByTestId('icon-search')).toBeInTheDocument();
  });

  it('deve renderizar type-tabs com 3 opções', () => {
    renderComponent();

    const typeTabs = screen.getByTestId('type-tabs');
    expect(typeTabs).toBeInTheDocument();

    expect(screen.getByTestId('type-tab-all')).toBeInTheDocument();
    expect(screen.getByTestId('type-tab-income')).toBeInTheDocument();
    expect(screen.getByTestId('type-tab-expense')).toBeInTheDocument();
  });

  it('deve renderizar type-tabs com labels corretos', () => {
    renderComponent();

    expect(screen.getByTestId('type-tab-all')).toHaveTextContent('Todos');
    expect(screen.getByTestId('type-tab-income')).toHaveTextContent('Entradas');
    expect(screen.getByTestId('type-tab-expense')).toHaveTextContent('Saídas');
  });

  it('deve renderizar quinzenal tabs com 3 opções', () => {
    renderComponent();

    const quinzenalWrapper = screen.getByTestId('select-quinzenal');
    expect(quinzenalWrapper).toBeInTheDocument();

    expect(screen.getByTestId('quinzenal-tab-month')).toBeInTheDocument();
    expect(screen.getByTestId('quinzenal-tab-first')).toBeInTheDocument();
    expect(screen.getByTestId('quinzenal-tab-second')).toBeInTheDocument();
  });

  it('deve renderizar quinzenal tabs com labels corretos', () => {
    renderComponent();

    expect(screen.getByTestId('quinzenal-tab-month')).toHaveTextContent('Todas');
    expect(screen.getByTestId('quinzenal-tab-first')).toHaveTextContent('1–15');
    expect(screen.getByTestId('quinzenal-tab-second')).toHaveTextContent('16–31');
  });

  it('deve renderizar selects de mês, ano, categoria e status', () => {
    renderComponent();

    expect(screen.getByTestId('select-month')).toBeInTheDocument();
    expect(screen.getByTestId('select-year')).toBeInTheDocument();
    expect(screen.getByTestId('select-category')).toBeInTheDocument();
    expect(screen.getByTestId('select-paid')).toBeInTheDocument();
  });
});

// ===========================================================================
// Tests — Ordem dos elementos
// ===========================================================================

describe('FilterControls — Ordem dos selects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetYearOptions.mockReturnValue([2025, 2026, 2027]);
  });

  it('deve renderizar os selects na ordem: mês, ano, categoria, status', () => {
    renderComponent();

    const monthSelect = screen.getByTestId('select-month');
    const yearSelect = screen.getByTestId('select-year');
    const categorySelect = screen.getByTestId('select-category');
    const paidSelect = screen.getByTestId('select-paid');

    expect(
      monthSelect.compareDocumentPosition(yearSelect) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(
      yearSelect.compareDocumentPosition(categorySelect) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(
      categorySelect.compareDocumentPosition(paidSelect) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('type-tabs deve vir antes de quinzenal tabs', () => {
    renderComponent();

    const typeTabs = screen.getByTestId('type-tabs');
    const quinzenalWrapper = screen.getByTestId('select-quinzenal');

    expect(
      typeTabs.compareDocumentPosition(quinzenalWrapper) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('select-month deve vir antes de type-tabs', () => {
    renderComponent();

    const monthSelect = screen.getByTestId('select-month');
    const typeTabs = screen.getByTestId('type-tabs');

    expect(
      monthSelect.compareDocumentPosition(typeTabs) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

// ===========================================================================
// Tests — Interações
// ===========================================================================

describe('FilterControls — Interações', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetYearOptions.mockReturnValue([2025, 2026, 2027]);
  });

  it('deve chamar onSearchChange ao digitar no campo de busca', () => {
    const onSearchChange = jest.fn();
    renderComponent({ onSearchChange });

    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'Aluguel' } });

    expect(onSearchChange).toHaveBeenCalledWith('Aluguel');
  });

  it('deve chamar onTypeFilterChange ao clicar em tab "Entradas"', () => {
    const onTypeFilterChange = jest.fn();
    renderComponent({ onTypeFilterChange });

    fireEvent.click(screen.getByTestId('type-tab-income'));

    expect(onTypeFilterChange).toHaveBeenCalledWith('income');
  });

  it('deve chamar onTypeFilterChange ao clicar em tab "Saídas"', () => {
    const onTypeFilterChange = jest.fn();
    renderComponent({ onTypeFilterChange });

    fireEvent.click(screen.getByTestId('type-tab-expense'));

    expect(onTypeFilterChange).toHaveBeenCalledWith('expense');
  });

  it('deve chamar onTypeFilterChange ao clicar em tab "Todos"', () => {
    const onTypeFilterChange = jest.fn();
    renderComponent({ onTypeFilterChange, typeFilter: 'income' });

    fireEvent.click(screen.getByTestId('type-tab-all'));

    expect(onTypeFilterChange).toHaveBeenCalledWith('all');
  });

  it('deve chamar onQuinzenalFilterChange ao clicar em tab "1–15"', () => {
    const onQuinzenalFilterChange = jest.fn();
    renderComponent({ onQuinzenalFilterChange });

    fireEvent.click(screen.getByTestId('quinzenal-tab-first'));

    expect(onQuinzenalFilterChange).toHaveBeenCalledWith('first');
  });

  it('deve chamar onQuinzenalFilterChange ao clicar em tab "16–31"', () => {
    const onQuinzenalFilterChange = jest.fn();
    renderComponent({ onQuinzenalFilterChange });

    fireEvent.click(screen.getByTestId('quinzenal-tab-second'));

    expect(onQuinzenalFilterChange).toHaveBeenCalledWith('second');
  });
});

// ===========================================================================
// Tests — Estado visual dos tabs
// ===========================================================================

describe('FilterControls — Estado visual', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetYearOptions.mockReturnValue([2025, 2026, 2027]);
  });

  it('tab "Todos" deve ter classe de ativo quando typeFilter é "all"', () => {
    renderComponent({ typeFilter: 'all' });

    const allTab = screen.getByTestId('type-tab-all');
    expect(allTab.className).toContain('bg-background');
  });

  it('tab "Entradas" deve ter classe de ativo quando typeFilter é "income"', () => {
    renderComponent({ typeFilter: 'income' });

    const incomeTab = screen.getByTestId('type-tab-income');
    expect(incomeTab.className).toContain('bg-background');
  });

  it('tab "Todas" quinzenal deve ter classe de ativo quando quinzenalFilter é "month"', () => {
    renderComponent({ quinzenalFilter: 'month' });

    const allTab = screen.getByTestId('quinzenal-tab-month');
    expect(allTab.className).toContain('bg-background');
  });

  it('search input deve exibir valor atual de searchFilter', () => {
    renderComponent({ searchFilter: 'Supermercado' });

    const searchInput = screen.getByTestId('search-input');
    expect(searchInput).toHaveValue('Supermercado');
  });
});
