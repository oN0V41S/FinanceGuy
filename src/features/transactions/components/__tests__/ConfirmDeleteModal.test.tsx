/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ConfirmDeleteModal from '../ConfirmDeleteModal';

// ---------------------------------------------------------------------------
// Mocks — UI components do shadcn-ui
// ---------------------------------------------------------------------------

jest.mock('@/components/ui/modal', () => {
  return function MockModal({
    isOpen,
    onClose,
    title,
    children,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }) {
    if (!isOpen) return null;
    return (
      <div data-testid="modal-root">
        <button data-testid="modal-close-button" onClick={onClose} aria-label="Fechar">
          X
        </button>
        <h3 data-testid="modal-title">{title}</h3>
        <div data-testid="modal-content">{children}</div>
      </div>
    );
  };
});

jest.mock('@/components/ui/alert', () => ({
  Alert: ({
    variant,
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { variant?: string; children: React.ReactNode }) => (
    <div role="alert" data-testid="confirm-alert" data-variant={variant} {...props}>
      {children}
    </div>
  ),
  AlertDescription: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
    <div data-testid="alert-description" {...props}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    disabled,
    type,
    onClick,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button
      type={type || 'button'}
      disabled={disabled}
      onClick={onClick}
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockOnConfirm = jest.fn();
const mockOnClose = jest.fn();

const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  onConfirm: mockOnConfirm,
};

function renderModal(overrides: Partial<typeof defaultProps> & { isRecurring?: boolean } = {}) {
  return render(
    <ConfirmDeleteModal
      {...defaultProps}
      {...overrides}
    />,
  );
}

// ===========================================================================
// Tests — Transação Recorrente
// ===========================================================================

describe('ConfirmDeleteModal — Transação Recorrente', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve exibir o aviso sobre parcelas anteriores e as duas opções quando isRecurring é true', () => {
    renderModal({ isRecurring: true });

    expect(
      screen.getByText('As parcelas anteriores do histórico não serão alteradas.'),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Excluir apenas esta' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Excluir esta e as futuras' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cancelar' }),
    ).toBeInTheDocument();
  });

  it('não deve exibir o botão "Excluir" simples quando a transação é recorrente', () => {
    renderModal({ isRecurring: true });

    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
  });

  it('deve chamar onConfirm com "single" ao clicar em "Excluir apenas esta"', async () => {
    mockOnConfirm.mockResolvedValue(undefined);
    renderModal({ isRecurring: true });

    fireEvent.click(screen.getByRole('button', { name: 'Excluir apenas esta' }));

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).toHaveBeenCalledWith('single');
    });
  });

  it('deve chamar onConfirm com "future" ao clicar em "Excluir esta e as futuras"', async () => {
    mockOnConfirm.mockResolvedValue(undefined);
    renderModal({ isRecurring: true });

    fireEvent.click(screen.getByRole('button', { name: 'Excluir esta e as futuras' }));

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).toHaveBeenCalledWith('future');
    });
  });

  it('não deve chamar onConfirm ao clicar em Cancelar', () => {
    renderModal({ isRecurring: true });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(mockOnConfirm).not.toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// Tests — Transação Simples (isRecurring ausente/false)
// ===========================================================================

describe('ConfirmDeleteModal — Transação Simples', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve exibir apenas o botão "Excluir" quando isRecurring é false', () => {
    renderModal();

    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Excluir apenas esta' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Excluir esta e as futuras' }),
    ).not.toBeInTheDocument();
  });

  it('não deve exibir o aviso de parcelas anteriores quando isRecurring é false', () => {
    renderModal();

    expect(
      screen.queryByText('As parcelas anteriores do histórico não serão alteradas.'),
    ).not.toBeInTheDocument();
  });

  it('deve chamar onConfirm com "single" ao clicar em "Excluir"', async () => {
    mockOnConfirm.mockResolvedValue(undefined);
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).toHaveBeenCalledWith('single');
    });
  });
});

// ===========================================================================
// Tests — Estados (erro e loading)
// ===========================================================================

describe('ConfirmDeleteModal — Estados', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve exibir Alert de erro quando onConfirm rejeita', async () => {
    mockOnConfirm.mockRejectedValue(new Error('Erro ao excluir transação'));

    renderModal({ isRecurring: true });

    fireEvent.click(screen.getByRole('button', { name: 'Excluir esta e as futuras' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Erro ao excluir transação');
    expect(screen.getByTestId('confirm-alert')).toBeInTheDocument();
  });

  it('deve exibir Alert de erro genérico quando onConfirm rejeita com string', async () => {
    mockOnConfirm.mockRejectedValue('Falha na rede');

    renderModal({ isRecurring: true });

    fireEvent.click(screen.getByRole('button', { name: 'Excluir apenas esta' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Falha na rede');
  });

  it('deve exibir "Excluindo..." apenas no botão clicado durante onConfirm pendente', async () => {
    let resolveConfirm!: (value: unknown) => void;
    const confirmPromise = new Promise((resolve) => {
      resolveConfirm = resolve;
    });
    mockOnConfirm.mockReturnValue(confirmPromise);

    renderModal({ isRecurring: true });

    fireEvent.click(screen.getByRole('button', { name: 'Excluir esta e as futuras' }));

    await waitFor(() => {
      // Apenas o botão clicado exibe "Excluindo..."
      const loadingButtons = screen.getAllByRole('button', { name: 'Excluindo...' });
      expect(loadingButtons).toHaveLength(1);
      expect(loadingButtons[0]).toBeDisabled();
    });

    // O outro botão mantém o texto original, mas fica desabilitado
    const otherButton = screen.getByRole('button', { name: 'Excluir apenas esta' });
    expect(otherButton).toBeDisabled();
    expect(otherButton).not.toHaveTextContent('Excluindo...');

    const cancelButton = screen.getByRole('button', { name: 'Cancelar' });
    expect(cancelButton).toBeDisabled();

    // Resolver para finalizar o estado pendente
    await act(async () => {
      resolveConfirm(undefined);
    });
  });

  it('deve exibir "Excluindo..." no botão único quando transação simples está pendente', async () => {
    let resolveConfirm!: (value: unknown) => void;
    const confirmPromise = new Promise((resolve) => {
      resolveConfirm = resolve;
    });
    mockOnConfirm.mockReturnValue(confirmPromise);

    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      const loadingButton = screen.getByRole('button', { name: 'Excluindo...' });
      expect(loadingButton).toBeDisabled();
    });

    await act(async () => {
      resolveConfirm(undefined);
    });
  });

  it('não deve exibir erro quando onConfirm resolve com sucesso', async () => {
    mockOnConfirm.mockResolvedValue(undefined);

    renderModal({ isRecurring: true });

    fireEvent.click(screen.getByRole('button', { name: 'Excluir apenas esta' }));

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('single');
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
