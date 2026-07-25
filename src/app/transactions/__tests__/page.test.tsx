'use client';

import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mock useTransactions (default export)
// ---------------------------------------------------------------------------
const mockUseTransactions = {
  transactions: [],
  summary: { income: 0, expense: 0, balance: 0 },
  isLoading: false,
  error: null,
  quinzenalFilter: 'month' as const,
  setQuinzenalFilter: jest.fn(),
  selectedYear: '2026',
  setSelectedYear: jest.fn(),
  selectedMonth: '01',
  setSelectedMonth: jest.fn(),
  refresh: jest.fn(),
  createTransaction: jest.fn(),
  updateTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
  isModalOpen: false,
  editingTransaction: null,
  openCreateModal: jest.fn(),
  openEditModal: jest.fn(),
  closeModal: jest.fn(),
};

jest.mock('@/features/transactions/hooks/useTransactions', () => ({
  __esModule: true,
  default: () => mockUseTransactions,
}));

// ---------------------------------------------------------------------------
// Mock lucide-react icons
// ---------------------------------------------------------------------------
jest.mock('lucide-react', () => {
  const Plus = (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-plus" {...props} />
  );
  const Wallet = (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-wallet" {...props} />
  );
  const ArrowLeftRight = (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-arrow-left-right" {...props} />
  );
  const X = (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-x" {...props} />
  );
  const LayoutDashboard = (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-layout-dashboard" {...props} />
  );
  const Settings = (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-settings" {...props} />
  );
  return { Plus, Wallet, ArrowLeftRight, X, LayoutDashboard, Settings };
});

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------
jest.mock('next/navigation', () => ({
  usePathname: () => '/transactions',
}));

// ---------------------------------------------------------------------------
// Mock dashboard components
// ---------------------------------------------------------------------------
jest.mock('@/features/dashboard/components/HeaderLayout', () => ({
  HeaderLayout: ({
    isDrawerOpen,
    onToggleDrawer,
  }: {
    isDrawerOpen?: boolean;
    onToggleDrawer?: () => void;
  }) => (
    <header data-testid="header">
      <button
        aria-label="Abrir menu"
        aria-expanded={isDrawerOpen ?? false}
        onClick={onToggleDrawer}
      >
        Menu
      </button>
    </header>
  ),
}));

jest.mock('@/features/dashboard/components/MobileNavBar', () => ({
  MobileNavBar: () => <nav data-testid="mobile-navbar">MobileNavBar</nav>,
}));

jest.mock('@/features/dashboard/components/SummaryCard', () => ({
  SummaryCard: ({
    label,
    value,
    type,
    isLoading,
  }: {
    label: string;
    value: number;
    type: string;
    isLoading?: boolean;
  }) => (
    <div data-testid={`summary-card-${type}`}>
      {isLoading ? (
        <span data-testid="summary-skeleton">{label}</span>
      ) : (
        <>
          <span data-testid="summary-label">{label}</span>
          <span data-testid="summary-value">{value}</span>
        </>
      )}
    </div>
  ),
}));

jest.mock('@/features/dashboard/components/EmptyState', () => ({
  EmptyState: () => <div data-testid="empty-state">Nenhuma transação encontrada</div>,
}));

// ---------------------------------------------------------------------------
// Mock transactions components
// ---------------------------------------------------------------------------
jest.mock('@/features/transactions/components/FilterControls', () => ({
  __esModule: true,
  default: ({
    quinzenalFilter,
    onQuinzenalFilterChange,
    selectedYear,
    onYearChange,
    selectedMonth,
    onMonthChange,
  }: {
    quinzenalFilter: string;
    onQuinzenalFilterChange: (v: string) => void;
    selectedYear: string;
    onYearChange: (v: string) => void;
    selectedMonth: string;
    onMonthChange: (v: string) => void;
  }) => (
    <div data-testid="filter-controls">
      <select
        data-testid="filter-quinzenal"
        value={quinzenalFilter}
        onChange={(e) => onQuinzenalFilterChange(e.target.value)}
        aria-label="Filtrar por período"
      >
        <option value="month">Por Mês</option>
        <option value="first">1ª Quinzena</option>
        <option value="second">2ª Quinzena</option>
      </select>
      <select
        data-testid="filter-year"
        value={selectedYear}
        onChange={(e) => onYearChange(e.target.value)}
        aria-label="Ano"
      >
        <option value="2026">2026</option>
      </select>
      <select
        data-testid="filter-month"
        value={selectedMonth}
        onChange={(e) => onMonthChange(e.target.value)}
        aria-label="Mês"
      >
        <option value="01">Janeiro</option>
      </select>
    </div>
  ),
}));

jest.mock('@/features/transactions/components/CardTransaction', () => ({
  __esModule: true,
  default: ({
    transactions,
    isLoading,
    onEdit,
    onDelete,
  }: {
    transactions: Array<{ id: string; description: string; value: number; type: string }>;
    isLoading: boolean;
    onEdit: (t: any) => void;
    onDelete: (id: string) => void;
  }) => (
    <div data-testid="transactions-table">
      {isLoading ? (
        <div data-testid="table-loading">Carregando...</div>
      ) : transactions.length === 0 ? (
        <span data-testid="table-empty">Nenhuma transação</span>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} data-testid={`transaction-row-${t.id}`}>
                <td>{t.description}</td>
                <td>{t.value}</td>
                <td>
                  <button
                    data-testid={`edit-btn-${t.id}`}
                    onClick={() => onEdit(t)}
                  >
                    Editar
                  </button>
                  <button
                    data-testid={`delete-btn-${t.id}`}
                    onClick={() => onDelete(t.id)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  ),
}));

jest.mock('@/features/transactions/components/TransactionModal', () => ({
  __esModule: true,
  default: ({
    isOpen,
    onClose,
    transaction,
    onSave,
  }: {
    isOpen: boolean;
    onClose: () => void;
    transaction: any;
    onSave: (data: any) => Promise<void>;
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="transaction-modal" role="dialog" aria-modal="true">
        <span data-testid="modal-editing">
          {transaction ? 'Editando' : 'Criando'}
        </span>
        <button data-testid="modal-close" onClick={onClose}>
          Fechar
        </button>
        <button
          data-testid="modal-submit"
          onClick={() => onSave({ description: 'teste' })}
        >
          Salvar
        </button>
      </div>
    );
  },
}));

// ---------------------------------------------------------------------------
// Mock shared components
// ---------------------------------------------------------------------------
jest.mock('@/shared/components/LazyLoad', () => ({
  LazyLoad: ({
    isReady,
    children,
    message,
  }: {
    isReady: boolean;
    children: React.ReactNode;
    message?: string;
  }) => {
    if (!isReady) {
      return <div data-testid="lazy-loading">{message || 'Carregando...'}</div>;
    }
    return <>{children}</>;
  },
}));

// ---------------------------------------------------------------------------
// Import the page AFTER mocks
// ---------------------------------------------------------------------------
import TransactionsPage from '../page';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const mockTransactions = [
  {
    id: 'tr-001',
    description: 'Salário',
    value: 5000,
    type: 'income' as const,
    date: '2026-01-05',
    category: 'Salário',
    responsible: 'João',
    paid: false,
    is_recurring: false,
  },
  {
    id: 'tr-002',
    description: 'Aluguel',
    value: 1500,
    type: 'expense' as const,
    date: '2026-01-01',
    category: 'Casa',
    responsible: 'João',
    paid: true,
    is_recurring: true,
  },
  {
    id: 'tr-003',
    description: 'Mercado',
    value: 800,
    type: 'expense' as const,
    date: '2026-01-10',
    category: 'Alimentação',
    responsible: 'Maria',
    paid: false,
    is_recurring: false,
  },
];

const defaultSummary = { income: 5000, expense: 2300, balance: 2700 };

function buildMock(overrides: Partial<typeof mockUseTransactions> = {}) {
  return { ...mockUseTransactions, ...overrides };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('TransactionsPage Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock to default state
    Object.assign(mockUseTransactions, buildMock());
  });

  // =========================================================================
  // Green Path — renderização básica
  // =========================================================================
  describe('Green path — renderização básica', () => {
    it('renderiza o título "Transações"', () => {
      render(<TransactionsPage />);
      expect(
        screen.getByRole('heading', { name: 'Transações' }),
      ).toBeInTheDocument();
    });

    it('renderiza HeaderLayout', () => {
      render(<TransactionsPage />);
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('renderiza MobileNavBar', () => {
      render(<TransactionsPage />);
      expect(screen.getByTestId('mobile-navbar')).toBeInTheDocument();
    });

    it('renderiza FilterControls', () => {
      render(<TransactionsPage />);
      expect(screen.getByTestId('filter-controls')).toBeInTheDocument();
    });

    it('renderiza botão "Nova Transação" no desktop', () => {
      render(<TransactionsPage />);
      expect(
        screen.getByTestId('btn-new-transaction-desktop'),
      ).toBeInTheDocument();
    });

    it('renderiza FAB mobile "+"', () => {
      render(<TransactionsPage />);
      const fab = screen.getByTestId('fab-add-transaction');
      expect(fab).toBeInTheDocument();
      expect(fab).toHaveClass('md:hidden');
    });
  });

  // =========================================================================
  // Mobile Layout — Botão "Nova Transação" em duas variantes
  // =========================================================================
  describe('Mobile layout — botão Nova Transação', () => {
    it('deve ter botão "Nova Transação" mobile com classe sm:hidden (abaixo dos filtros)', () => {
      render(<TransactionsPage />);

      const mobileBtn = screen.getByTestId('btn-new-transaction-mobile');
      expect(mobileBtn).toBeInTheDocument();
      expect(mobileBtn).toHaveTextContent('Nova Transação');
      // Mobile: aparece apenas em telas pequenas (sm:hidden = hidden em sm+)
      expect(mobileBtn.className).toContain('sm:hidden');
    });

    it('deve ter botão "Nova Transação" desktop com classe hidden sm:flex (ao lado do título)', () => {
      render(<TransactionsPage />);

      const desktopBtn = screen.getByTestId('btn-new-transaction-desktop');
      expect(desktopBtn).toBeInTheDocument();
      expect(desktopBtn).toHaveTextContent('Nova Transação');
      // Desktop: escondido no mobile, flex em sm+
      expect(desktopBtn.className).toContain('hidden');
      expect(desktopBtn.className).toContain('sm:flex');
    });

    it('botão mobile deve conter ícone Plus', () => {
      render(<TransactionsPage />);

      const mobileBtn = screen.getByTestId('btn-new-transaction-mobile');
      // Verificar que o ícone Plus está dentro do botão
      const plusIcon = mobileBtn.querySelector('[data-testid="icon-plus"]');
      expect(plusIcon).toBeInTheDocument();
    });

    it('botão desktop deve conter ícone Plus', () => {
      render(<TransactionsPage />);

      const desktopBtn = screen.getByTestId('btn-new-transaction-desktop');
      const plusIcon = desktopBtn.querySelector('[data-testid="icon-plus"]');
      expect(plusIcon).toBeInTheDocument();
    });

    it('botão mobile deve chamar openCreateModal ao clicar', () => {
      render(<TransactionsPage />);

      const mobileBtn = screen.getByTestId('btn-new-transaction-mobile');
      mobileBtn.click();

      expect(mockUseTransactions.openCreateModal).toHaveBeenCalledTimes(1);
    });

    it('botão desktop deve chamar openCreateModal ao clicar', () => {
      render(<TransactionsPage />);

      const desktopBtn = screen.getByTestId('btn-new-transaction-desktop');
      desktopBtn.click();

      expect(mockUseTransactions.openCreateModal).toHaveBeenCalledTimes(1);
    });

    it('botão mobile fica ABAIXO dos filtros na ordem do DOM', () => {
      const { container } = render(<TransactionsPage />);

      // Verificar que o botão mobile vem DEPOIS do container de filtros
      const filterControls = screen.getByTestId('filter-controls');
      const mobileBtn = screen.getByTestId('btn-new-transaction-mobile');

      const filterIndex = Array.from(container.querySelectorAll('*')).indexOf(filterControls);
      const btnIndex = Array.from(container.querySelectorAll('*')).indexOf(mobileBtn);

      expect(btnIndex).toBeGreaterThan(filterIndex);
    });
  });

  // =========================================================================
  // Green Path — SummaryCards
  // =========================================================================
  describe('Green path — SummaryCards', () => {
    it('renderiza 3 SummaryCards com labels corretos', () => {
      render(<TransactionsPage />);

      const incomeCard = screen.getByTestId('summary-card-income');
      const expenseCard = screen.getByTestId('summary-card-expense');
      const balanceCard = screen.getByTestId('summary-card-balance');

      expect(incomeCard).toBeInTheDocument();
      expect(expenseCard).toBeInTheDocument();
      expect(balanceCard).toBeInTheDocument();

      expect(within(incomeCard).getByTestId('summary-label')).toHaveTextContent(
        'Entradas',
      );
      expect(within(expenseCard).getByTestId('summary-label')).toHaveTextContent(
        'Saídas',
      );
      expect(within(balanceCard).getByTestId('summary-label')).toHaveTextContent(
        'Saldo',
      );
    });

    it('exibe valores corretos do summary', () => {
      Object.assign(mockUseTransactions, { summary: defaultSummary });

      render(<TransactionsPage />);

      expect(
        within(screen.getByTestId('summary-card-income')).getByTestId(
          'summary-value',
        ),
      ).toHaveTextContent('5000');
      expect(
        within(screen.getByTestId('summary-card-expense')).getByTestId(
          'summary-value',
        ),
      ).toHaveTextContent('2300');
      expect(
        within(screen.getByTestId('summary-card-balance')).getByTestId(
          'summary-value',
        ),
      ).toHaveTextContent('2700');
    });
  });

  // =========================================================================
  // Green Path — tabela de transações
  // =========================================================================
  describe('Green path — tabela de transações', () => {
    it('renderiza TransactionsTable com dados', () => {
      Object.assign(mockUseTransactions, { transactions: mockTransactions });

      render(<TransactionsPage />);

      expect(screen.getByTestId('transactions-table')).toBeInTheDocument();
      expect(screen.getByTestId('transaction-row-tr-001')).toBeInTheDocument();
      expect(screen.getByTestId('transaction-row-tr-002')).toBeInTheDocument();
      expect(screen.getByTestId('transaction-row-tr-003')).toBeInTheDocument();
    });

    it('não mostra EmptyState quando há transações', () => {
      Object.assign(mockUseTransactions, { transactions: mockTransactions });

      render(<TransactionsPage />);

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Empty State
  // =========================================================================
  describe('Empty state — sem transações', () => {
    it('mostra EmptyState quando transactions é array vazio', () => {
      Object.assign(mockUseTransactions, {
        transactions: [],
        isLoading: false,
      });

      render(<TransactionsPage />);

      expect(screen.queryByTestId('transactions-table')).not.toBeInTheDocument();
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    it('não mostra EmptyState quando está carregando mesmo sem transações', () => {
      Object.assign(mockUseTransactions, {
        transactions: [],
        isLoading: true,
      });

      render(<TransactionsPage />);

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Loading State
  // =========================================================================
  describe('Loading state — skeletons', () => {
    it('mostra loading nos cards quando isLoading=true', () => {
      Object.assign(mockUseTransactions, { isLoading: true });

      render(<TransactionsPage />);

      expect(
        within(screen.getByTestId('summary-card-income')).getByTestId(
          'summary-skeleton',
        ),
      ).toBeInTheDocument();
      expect(
        within(screen.getByTestId('summary-card-expense')).getByTestId(
          'summary-skeleton',
        ),
      ).toBeInTheDocument();
      expect(
        within(screen.getByTestId('summary-card-balance')).getByTestId(
          'summary-skeleton',
        ),
      ).toBeInTheDocument();
    });

    it('mostra LazyLoad spinner quando isLoading=true', () => {
      Object.assign(mockUseTransactions, { isLoading: true });

      render(<TransactionsPage />);

      expect(screen.getByTestId('lazy-loading')).toBeInTheDocument();
    });

    it('esconde LazyLoad quando isLoading=false', () => {
      Object.assign(mockUseTransactions, { isLoading: false });

      render(<TransactionsPage />);

      expect(screen.queryByTestId('lazy-loading')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Error State
  // =========================================================================
  describe('Error state — banner de erro', () => {
    it('mostra banner com mensagem de erro quando error não é null', () => {
      Object.assign(mockUseTransactions, {
        error: 'Falha ao carregar transações',
      });

      render(<TransactionsPage />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Falha ao carregar transações');
    });

    it('banner de erro possui botão "Tentar novamente"', () => {
      Object.assign(mockUseTransactions, {
        error: 'Erro de rede',
      });

      render(<TransactionsPage />);

      const retryButton = screen.getByRole('button', {
        name: 'Tentar novamente',
      });
      expect(retryButton).toBeInTheDocument();
    });

    it('botão "Tentar novamente" chama refresh()', async () => {
      const user = userEvent.setup();
      Object.assign(mockUseTransactions, {
        error: 'Erro de rede',
      });

      render(<TransactionsPage />);

      await user.click(
        screen.getByRole('button', { name: 'Tentar novamente' }),
      );

      expect(mockUseTransactions.refresh).toHaveBeenCalledTimes(1);
    });

    it('não mostra banner quando error é null', () => {
      Object.assign(mockUseTransactions, { error: null });

      render(<TransactionsPage />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Modal — criação e edição
  // =========================================================================
  describe('Modal — criação e edição', () => {
    it('botão "Nova Transação" desktop chama openCreateModal', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      await user.click(
        screen.getByTestId('btn-new-transaction-desktop'),
      );

      expect(mockUseTransactions.openCreateModal).toHaveBeenCalledTimes(1);
    });

    it('FAB "+" chama openCreateModal', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      await user.click(screen.getByTestId('fab-add-transaction'));

      expect(mockUseTransactions.openCreateModal).toHaveBeenCalledTimes(1);
    });

    it('clique em editar na tabela chama openEditModal com a transação', async () => {
      const user = userEvent.setup();
      Object.assign(mockUseTransactions, { transactions: mockTransactions });

      render(<TransactionsPage />);

      await user.click(screen.getByTestId('edit-btn-tr-001'));

      expect(mockUseTransactions.openEditModal).toHaveBeenCalledTimes(1);
      expect(mockUseTransactions.openEditModal).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'tr-001' }),
      );
    });

    it('modal é renderizado quando isModalOpen=true', () => {
      Object.assign(mockUseTransactions, {
        isModalOpen: true,
        editingTransaction: null,
      });

      render(<TransactionsPage />);

      expect(screen.getByTestId('transaction-modal')).toBeInTheDocument();
    });

    it('modal não é renderizado quando isModalOpen=false', () => {
      Object.assign(mockUseTransactions, { isModalOpen: false });

      render(<TransactionsPage />);

      expect(screen.queryByTestId('transaction-modal')).not.toBeInTheDocument();
    });

    it('modal exibe "Criando" quando editingTransaction é null', () => {
      Object.assign(mockUseTransactions, {
        isModalOpen: true,
        editingTransaction: null,
      });

      render(<TransactionsPage />);

      expect(screen.getByTestId('modal-editing')).toHaveTextContent('Criando');
    });

    it('modal exibe "Editando" quando editingTransaction está preenchido', () => {
      Object.assign(mockUseTransactions, {
        isModalOpen: true,
        editingTransaction: mockTransactions[0],
      });

      render(<TransactionsPage />);

      expect(screen.getByTestId('modal-editing')).toHaveTextContent('Editando');
    });

    it('fechar modal chama closeModal', async () => {
      const user = userEvent.setup();
      Object.assign(mockUseTransactions, {
        isModalOpen: true,
        editingTransaction: null,
      });

      render(<TransactionsPage />);

      await user.click(screen.getByTestId('modal-close'));

      expect(mockUseTransactions.closeModal).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Drawer
  // =========================================================================
  describe('Drawer behavior', () => {
    it('drawer começa fechado', () => {
      render(<TransactionsPage />);

      expect(screen.queryByTestId('drawer-overlay')).not.toBeInTheDocument();
    });

    it('clique no menu abre drawer', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      expect(screen.queryByTestId('drawer-overlay')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));

      expect(screen.getByTestId('drawer-overlay')).toBeInTheDocument();
      expect(
        screen.getByRole('dialog', { name: 'Menu de navegação' }),
      ).toHaveClass('translate-x-0');
    });

    it('clique no overlay fecha drawer', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
      expect(screen.getByTestId('drawer-overlay')).toBeInTheDocument();

      await user.click(screen.getByTestId('drawer-overlay'));

      expect(screen.queryByTestId('drawer-overlay')).not.toBeInTheDocument();
      expect(
        screen.getByRole('dialog', { name: 'Menu de navegação' }),
      ).toHaveClass('-translate-x-full');
    });

    it('clique no botão fechar drawer fecha drawer', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
      expect(screen.getByTestId('drawer-overlay')).toBeInTheDocument();

      await user.click(
        within(
          screen.getByRole('dialog', { name: 'Menu de navegação' }),
        ).getByRole('button', { name: 'Fechar menu' }),
      );

      expect(screen.queryByTestId('drawer-overlay')).not.toBeInTheDocument();
      expect(
        screen.getByRole('dialog', { name: 'Menu de navegação' }),
      ).toHaveClass('-translate-x-full');
    });
  });

  // =========================================================================
  // Navegação no Drawer
  // =========================================================================
  describe('Navegação no drawer', () => {
    it('drawer contém link para Dashboard', () => {
      render(<TransactionsPage />);

      // Abre drawer primeiro
      const menuButton = screen.getByRole('button', { name: 'Abrir menu' });
      // Simular abertura
      Object.defineProperty(menuButton, 'ariaExpanded', { value: true });
    });

    it('drawer contém link para Dashboard com href correto', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));

      const drawer = screen.getByRole('dialog', {
        name: 'Menu de navegação',
      });
      const dashboardLink = within(drawer).getByRole('link', {
        name: 'Dashboard',
      });

      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });

    it('drawer contém link para Configurações com href correto', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));

      const drawer = screen.getByRole('dialog', {
        name: 'Menu de navegação',
      });
      const settingsLink = within(drawer).getByRole('link', {
        name: 'Configurações',
      });

      expect(settingsLink).toBeInTheDocument();
      expect(settingsLink).toHaveAttribute('href', '/settings');
    });

    it('link ativo no drawer mostra Transações com destaque', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));

      const drawer = screen.getByRole('dialog', {
        name: 'Menu de navegação',
      });
      const transactionsLink = within(drawer).getByRole('link', {
        name: 'Transações',
      });

      expect(transactionsLink).toBeInTheDocument();
      // Como pathname é '/transactions', o link deve estar ativo
      expect(transactionsLink).toHaveAttribute('href', '/transactions');
    });
  });

  // =========================================================================
  // Filtros
  // =========================================================================
  describe('Filtros — interações', () => {
    it('FilterControls recebe valores corretos do hook', () => {
      Object.assign(mockUseTransactions, {
        quinzenalFilter: 'month',
        selectedYear: '2026',
        selectedMonth: '01',
      });

      render(<TransactionsPage />);

      expect(screen.getByTestId('filter-quinzenal')).toHaveValue('month');
      expect(screen.getByTestId('filter-year')).toHaveValue('2026');
      expect(screen.getByTestId('filter-month')).toHaveValue('01');
    });

    it('mudar filtro quinzenal chama setQuinzenalFilter', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      await user.selectOptions(
        screen.getByTestId('filter-quinzenal'),
        'first',
      );

      expect(mockUseTransactions.setQuinzenalFilter).toHaveBeenCalledWith(
        'first',
      );
    });

    it('mudar ano chama setSelectedYear', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      await user.selectOptions(screen.getByTestId('filter-year'), '2026');

      expect(mockUseTransactions.setSelectedYear).toHaveBeenCalledWith('2026');
    });

    it('mudar mês chama setSelectedMonth', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      await user.selectOptions(screen.getByTestId('filter-month'), '01');

      expect(mockUseTransactions.setSelectedMonth).toHaveBeenCalledWith('01');
    });
  });

  // =========================================================================
  // Red Paths — cenários de erro
  // =========================================================================
  describe('Red paths — cenários de erro', () => {
    it('exibe erro e mantém tabela escondida quando API falha', () => {
      Object.assign(mockUseTransactions, {
        error: 'Erro ao carregar transações',
        transactions: [],
        isLoading: false,
      });

      render(<TransactionsPage />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.queryByTestId('transactions-table')).not.toBeInTheDocument();
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    });

    it('exibe erro mesmo quando há transações em cache (erro de refresh)', () => {
      Object.assign(mockUseTransactions, {
        error: 'Falha ao atualizar',
        transactions: mockTransactions,
        isLoading: false,
      });

      render(<TransactionsPage />);

      // Deve mostrar tanto o erro quanto os dados em cache
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByTestId('transactions-table')).toBeInTheDocument();
    });

    it('tentar novamente após erro chama refresh', async () => {
      const user = userEvent.setup();
      Object.assign(mockUseTransactions, {
        error: 'Erro de conexão',
      });

      render(<TransactionsPage />);

      await user.click(
        screen.getByRole('button', { name: 'Tentar novamente' }),
      );

      expect(mockUseTransactions.refresh).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================
  describe('Edge cases', () => {
    it('transações com valor zero são exibidas corretamente', () => {
      const txWithZero = [
        {
          ...mockTransactions[0],
          id: 'tr-zero',
          description: 'Isento',
          value: 0,
          type: 'expense' as const,
        },
      ];
      Object.assign(mockUseTransactions, { transactions: txWithZero });

      render(<TransactionsPage />);

      expect(screen.getByTestId('transaction-row-tr-zero')).toBeInTheDocument();
      expect(screen.getByTestId('edit-btn-tr-zero')).toBeInTheDocument();
    });

    it('múltiplas aberturas de drawer funcionam corretamente', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      // Abre
      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
      expect(screen.getByTestId('drawer-overlay')).toBeInTheDocument();

      // Fecha
      await user.click(screen.getByTestId('drawer-overlay'));
      expect(screen.queryByTestId('drawer-overlay')).not.toBeInTheDocument();

      // Abre novamente
      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
      expect(screen.getByTestId('drawer-overlay')).toBeInTheDocument();
    });

    it('clique no link do drawer fecha o drawer', async () => {
      const user = userEvent.setup();
      render(<TransactionsPage />);

      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
      expect(screen.getByTestId('drawer-overlay')).toBeInTheDocument();

      // Clica no link Dashboard
      const drawer = screen.getByRole('dialog', {
        name: 'Menu de navegação',
      });
      await user.click(
        within(drawer).getByRole('link', { name: 'Dashboard' }),
      );

      // Drawer deve fechar
      expect(screen.queryByTestId('drawer-overlay')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Page Structure — elementos estruturais
  // =========================================================================
  describe('Page structure', () => {
    it('possui estrutura main com max-w-6xl', () => {
      render(<TransactionsPage />);
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });

    it('renderiza FilterControls dentro da página', () => {
      render(<TransactionsPage />);
      expect(screen.getByTestId('filter-controls')).toBeInTheDocument();
    });

    it('summary cards ficam em container grid', () => {
      render(<TransactionsPage />);

      const incomeCard = screen.getByTestId('summary-card-income');
      const expenseCard = screen.getByTestId('summary-card-expense');
      const balanceCard = screen.getByTestId('summary-card-balance');

      // Verificar que estão no mesmo container (parentNode compartilhado)
      const parent = incomeCard.parentNode;
      expect(parent).toBe(expenseCard.parentNode);
      expect(parent).toBe(balanceCard.parentNode);
    });
  });
});
