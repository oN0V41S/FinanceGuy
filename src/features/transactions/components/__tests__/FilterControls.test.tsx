/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks — UI components do shadcn-ui
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

// ---------------------------------------------------------------------------
// Mocks — Icons
// ---------------------------------------------------------------------------

jest.mock('lucide-react', () => ({
  Filter: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-filter" {...props} />
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
  quinzenalFilter: 'month' as const,
  onQuinzenalFilterChange: jest.fn(),
  selectedYear: '2026',
  onYearChange: jest.fn(),
  selectedMonth: '01',
  onMonthChange: jest.fn(),
  paidFilter: 'all' as const,
  onPaidFilterChange: jest.fn(),
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
// Tests — Layout Responsivo Mobile (Bug 1: FilterControls mobile layout)
// ===========================================================================

describe('FilterControls — Mobile Layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetYearOptions.mockReturnValue([2025, 2026, 2027]);
  });

  // -----------------------------------------------------------------------
  // Teste 1: Container interno usa grid grid-cols-2 no mobile
  // -----------------------------------------------------------------------
  it('deve ter classe grid grid-cols-2 no container interno para layout mobile', () => {
    const { container } = renderComponent();

    // O container interno é o primeiro filho do wrapper bg-muted/50 p-4
    // Atualmente: div.flex.flex-wrap.items-center.gap-4
    // Desejado:   div.grid.grid-cols-2.md:flex
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toBeInTheDocument();

    const innerContainer = outerDiv.firstChild as HTMLElement;
    expect(innerContainer).toBeInTheDocument();

    // Mobile: grid + grid-cols-2
    expect(innerContainer.className).toContain('grid');
    expect(innerContainer.className).toContain('grid-cols-2');
  });

  // -----------------------------------------------------------------------
  // Teste 2: Container interno também tem md:flex para desktop
  // -----------------------------------------------------------------------
  it('deve ter classe md:flex no container interno para layout desktop', () => {
    const { container } = renderComponent();

    const outerDiv = container.firstChild as HTMLElement;
    const innerContainer = outerDiv.firstChild as HTMLElement;

    // Desktop: md:flex
    expect(innerContainer.className).toContain('md:flex');
  });

  // -----------------------------------------------------------------------
  // Teste 3: Ícone Filter fica oculto no mobile (hidden md:flex)
  // -----------------------------------------------------------------------
  it('deve esconder o ícone Filter no mobile com classe hidden md:flex', () => {
    renderComponent();

    const filterIcon = screen.getByTestId('icon-filter');
    expect(filterIcon).toBeInTheDocument();

    // O wrapper do ícone tem hidden (escondido no mobile) e md:flex (visível em desktop)
    const wrapper = filterIcon.parentElement;
    expect(wrapper?.className).toContain('hidden');
    expect(wrapper?.className).toContain('md:flex');
  });

  // -----------------------------------------------------------------------
  // Teste 4: Cada wrapper de select aceita classe w-full no mobile
  // -----------------------------------------------------------------------
  it('deve aplicar w-full ao wrapper do select Quinzenal no mobile', () => {
    renderComponent();

    const quinzenalWrapper = screen.getByTestId('select-quinzenal');
    expect(quinzenalWrapper).toBeInTheDocument();
    expect(quinzenalWrapper.className).toContain('w-full');
  });

  it('deve aplicar w-full ao wrapper do select Paid/Unpaid no mobile', () => {
    renderComponent();

    const paidWrapper = screen.getByTestId('select-paid');
    expect(paidWrapper).toBeInTheDocument();
    expect(paidWrapper.className).toContain('w-full');
  });

  it('deve aplicar w-full ao wrapper do select Year no mobile', () => {
    renderComponent();

    const yearWrapper = screen.getByTestId('select-year');
    expect(yearWrapper).toBeInTheDocument();
    expect(yearWrapper.className).toContain('w-full');
  });

  it('deve aplicar w-full ao wrapper do select Month no mobile', () => {
    renderComponent();

    const monthWrapper = screen.getByTestId('select-month');
    expect(monthWrapper).toBeInTheDocument();
    expect(monthWrapper.className).toContain('w-full');
  });

  // -----------------------------------------------------------------------
  // Teste 5: Grid 2 colunas no mobile — ordem dos selects
  // -----------------------------------------------------------------------
  it('deve renderizar os 4 selects na ordem: Quinzenal, Paid, Year, Month', () => {
    renderComponent();

    // No grid de 2 colunas, os selects devem estar na ordem:
    // Linha 1: Quinzenal (col 1) + Paid (col 2)
    // Linha 2: Year (col 1) + Month (col 2)
    const quinzenalSelect = screen.getByTestId('select-quinzenal');
    const paidSelect = screen.getByTestId('select-paid');
    const yearSelect = screen.getByTestId('select-year');
    const monthSelect = screen.getByTestId('select-month');

    expect(quinzenalSelect).toBeInTheDocument();
    expect(paidSelect).toBeInTheDocument();
    expect(yearSelect).toBeInTheDocument();
    expect(monthSelect).toBeInTheDocument();

    // Verificar a ordem no DOM usando compareDocumentPosition
    // Quinzenal deve vir antes de Paid
    expect(
      quinzenalSelect.compareDocumentPosition(paidSelect) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // Paid deve vir antes de Year
    expect(
      paidSelect.compareDocumentPosition(yearSelect) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // Year deve vir antes de Month
    expect(
      yearSelect.compareDocumentPosition(monthSelect) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
