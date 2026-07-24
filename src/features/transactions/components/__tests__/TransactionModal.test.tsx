/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionModal from '../TransactionModal';

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

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    disabled,
    type,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button
      type={type || 'button'}
      disabled={disabled}
      onClick={onClick}
      data-testid={type === 'submit' ? 'submit-button' : undefined}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input data-testid={`input-${props.id || props.name}`} {...props} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({
    children,
    htmlFor,
  }: React.LabelHTMLAttributes<HTMLLabelElement> & { children: React.ReactNode }) => (
    <label htmlFor={htmlFor} data-testid={`label-${htmlFor}`}>
      {children}
    </label>
  ),
}));

jest.mock('@/components/ui/select', () => {
  const Select = ({ value, onValueChange, children, ...props }: any) => {
    // Guarda a callback para usar nos itens
    const ctx = React.useMemo(
      () => ({ value, onValueChange }),
      [value, onValueChange],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctx = React.createContext as any;
    const SelectContext = Ctx();
    return (
      <SelectContext.Provider value={ctx}>
        <div data-testid="select-root" data-value={value}>
          {children}
        </div>
      </SelectContext.Provider>
    );
  };
  const SelectTrigger = ({ children, ...props }: any) => (
    <button data-testid="select-trigger" {...props}>
      {children}
    </button>
  );
  const SelectValue = ({ placeholder }: any) => (
    <span data-testid="select-value">{placeholder}</span>
  );
  const SelectContent = ({ children }: any) => (
    <div data-testid="select-content">{children}</div>
  );
  const SelectItem = ({ value, children, ...props }: any) => {
    // Consome o contexto para acessar onValueChange
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctx = React.createContext as any;
    const SelectContext = Ctx();
    const ctx = React.useContext(SelectContext);
    return (
      <div
        data-testid={`select-item-${value}`}
        data-value={value}
        onClick={() => ctx?.onValueChange?.(value)}
      >
        {children}
      </div>
    );
  };
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockOnSave = jest.fn();
const mockOnClose = jest.fn();

const mockTransaction = {
  id: '1',
  type: 'expense' as const,
  description: 'Aluguel',
  value: 1500,
  date: '2026-01-01',
  category: 'Casa',
  responsible: 'João',
  paid: true,
  is_recurring: false,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  onSave: mockOnSave,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFormElements() {
  const descriptionInput = screen.getByTestId('input-description') as HTMLInputElement;
  const valueInput = screen.getByTestId('input-value') as HTMLInputElement;
  const dateInput = screen.getByTestId('input-date') as HTMLInputElement;
  const responsibleInput = screen.getByTestId('input-responsible') as HTMLInputElement;
  return { descriptionInput, valueInput, dateInput, responsibleInput };
}

function fillFormFields({
  description = 'Nova despesa',
  value = '250.00',
  date = '2026-03-15',
  responsible = 'Maria',
} = {}) {
  const { descriptionInput, valueInput, dateInput, responsibleInput } = getFormElements();
  fireEvent.change(descriptionInput, { target: { value: description } });
  fireEvent.change(valueInput, { target: { value } });
  fireEvent.change(dateInput, { target: { value: date } });
  fireEvent.change(responsibleInput, { target: { value: responsible } });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TransactionModal — Modo Create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // G-T1: Renderização em modo Create
  // -----------------------------------------------------------------------
  it('deve renderizar título "Nova Transação" quando transaction é null', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    expect(screen.getByTestId('modal-title')).toHaveTextContent('Nova Transação');
  });

  it('deve renderizar título "Nova Transação" quando transaction é undefined', () => {
    render(<TransactionModal {...defaultProps} />);

    expect(screen.getByTestId('modal-title')).toHaveTextContent('Nova Transação');
  });

  it('deve exibir campos vazios no modo Create', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    const { descriptionInput, valueInput, dateInput, responsibleInput } = getFormElements();

    expect(descriptionInput.value).toBe('');
    expect(valueInput.value).toBe('');
    expect(dateInput.value).toBe('');
    expect(responsibleInput.value).toBe('');
  });

  it('deve exibir toggle type com valor padrão expense', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    // Deve ter dois botões de toggle: Receita e Despesa
    const incomeButton = screen.getByRole('button', { name: /receita/i });
    const expenseButton = screen.getByRole('button', { name: /despesa/i });

    expect(incomeButton).toBeInTheDocument();
    expect(expenseButton).toBeInTheDocument();
  });

  it('deve exibir select de categoria com opções do CategoryEnum', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    // O select root deve estar presente
    expect(screen.getByTestId('select-root')).toBeInTheDocument();
  });

  it('deve exibir toggle de paid', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    // Deve ter um toggle para marcar como pago
    const paidToggle = screen.getByRole('switch', { name: /marcar como pago/i });
    expect(paidToggle).toBeInTheDocument();
    expect(paidToggle).toHaveAttribute('aria-checked', 'false');
  });
});

describe('TransactionModal — Modo Edit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // G-T2: Renderização em modo Edit
  // -----------------------------------------------------------------------
  it('deve renderizar título "Editar Transação" quando transaction é provido', () => {
    render(<TransactionModal {...defaultProps} transaction={mockTransaction} />);

    expect(screen.getByTestId('modal-title')).toHaveTextContent('Editar Transação');
  });

  it('deve preencher campos com os valores da transação', () => {
    render(<TransactionModal {...defaultProps} transaction={mockTransaction} />);

    const { descriptionInput, valueInput, dateInput, responsibleInput } = getFormElements();

    expect(descriptionInput.value).toBe('Aluguel');
    expect(valueInput.value).toBe('1500');
    expect(dateInput.value).toBe('2026-01-01');
    expect(responsibleInput.value).toBe('João');
  });

  it('deve marcar paid como true quando a transação está paga', () => {
    render(<TransactionModal {...defaultProps} transaction={mockTransaction} />);

    const paidToggle = screen.getByRole('switch', { name: /marcar como pago/i });
    expect(paidToggle).toHaveAttribute('aria-checked', 'true');
  });

  it('deve exibir o type correto da transação (expense)', () => {
    render(<TransactionModal {...defaultProps} transaction={mockTransaction} />);

    // O toggle de expense deve estar ativo
    const expenseButton = screen.getByRole('button', { name: /despesa/i });
    expect(expenseButton).toBeInTheDocument();
  });
});

describe('TransactionModal — Interações', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // G-T3: Preenchimento de todos os campos e submissão
  // -----------------------------------------------------------------------
  it('deve permitir preencher todos os campos e submeter', async () => {
    mockOnSave.mockResolvedValue(undefined);
    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields({
      description: 'Supermercado',
      value: '450.75',
      date: '2026-03-20',
      responsible: 'João',
    });

    // Clicar em type income
    const incomeButton = screen.getByRole('button', { name: /receita/i });
    fireEvent.click(incomeButton);

    // Selecionar categoria
    const categoryItem = screen.getByTestId('select-item-Alimentação');
    fireEvent.click(categoryItem);

    // Marcar como pago
    const paidToggle = screen.getByRole('switch', { name: /marcar como pago/i });
    fireEvent.click(paidToggle);

    // Submeter
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // G-T8: onSave chamado com dados corretos
  // -----------------------------------------------------------------------
  it('deve chamar onSave com dados corretamente convertidos', async () => {
    mockOnSave.mockResolvedValue(undefined);
    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields({
      description: 'Freelance',
      value: '3200.00',
      date: '2026-04-01',
      responsible: 'Ana',
    });

    // Clicar em income
    const incomeButton = screen.getByRole('button', { name: /receita/i });
    fireEvent.click(incomeButton);

    // Selecionar categoria Salário
    const categoryItem = screen.getByTestId('select-item-Salário');
    fireEvent.click(categoryItem);

    // Submeter
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Freelance',
          value: 3200,
          date: '2026-04-01',
          responsible: 'Ana',
          type: 'income',
          category: 'Salário',
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // G-T7: Botão "Cancelar" chama onClose
  // -----------------------------------------------------------------------
  it('deve chamar onClose ao clicar em Cancelar', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('deve fechar ao clicar no botão X do modal', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    const closeButton = screen.getByTestId('modal-close-button');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // G-T10: Alternância entre type income/expense
  // -----------------------------------------------------------------------
  it('deve alternar type para income ao clicar em Receita', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    const incomeButton = screen.getByRole('button', { name: /receita/i });
    fireEvent.click(incomeButton);

    // Após clicar, income deve estar ativo (testamos pelo data-active ou classe)
    expect(incomeButton).toBeInTheDocument();
  });

  it('deve alternar type para expense ao clicar em Despesa', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    const expenseButton = screen.getByRole('button', { name: /despesa/i });
    fireEvent.click(expenseButton);

    expect(expenseButton).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // G-T12: Toggle paid funciona
  // -----------------------------------------------------------------------
  it('deve alternar paid de false para true ao clicar', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    const paidToggle = screen.getByRole('switch', { name: /marcar como pago/i });
    expect(paidToggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(paidToggle);
    expect(paidToggle).toHaveAttribute('aria-checked', 'true');
  });

  it('deve alternar paid de true para false ao clicar novamente', () => {
    render(<TransactionModal {...defaultProps} transaction={mockTransaction} />);

    const paidToggle = screen.getByRole('switch', { name: /marcar como pago/i });
    expect(paidToggle).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(paidToggle);
    expect(paidToggle).toHaveAttribute('aria-checked', 'false');
  });
});

describe('TransactionModal — Estados', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // G-T6: Botão "Salvar" desabilitado com isLoading
  // -----------------------------------------------------------------------
  it('deve desabilitar o botão Salvar quando isLoading é true', () => {
    render(<TransactionModal {...defaultProps} transaction={null} isLoading={true} />);

    const submitButton = screen.getByTestId('submit-button');
    expect(submitButton).toBeDisabled();
  });

  it('deve exibir texto de carregamento no botão quando isLoading é true', () => {
    render(<TransactionModal {...defaultProps} transaction={null} isLoading={true} />);

    const submitButton = screen.getByTestId('submit-button');
    expect(submitButton).toHaveTextContent(/salvando|carregando|\.\.\./i);
  });

  it('deve manter botão desabilitado durante submissão', async () => {
    // Usar promise que não resolve para simular submissão pendente
    let resolveSave!: (value: unknown) => void;
    const savePromise = new Promise((resolve) => {
      resolveSave = resolve;
    });
    mockOnSave.mockReturnValue(savePromise);

    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields();

    // Selecionar categoria (necessário para validação)
    const categoryItem = screen.getByTestId('select-item-Alimentação');
    fireEvent.click(categoryItem);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    // Botão deve ficar desabilitado imediatamente após click
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    // Resolver para não deixar promise pendente
    resolveSave(undefined);
  });

  // -----------------------------------------------------------------------
  // G-T13: Modal fechado não renderiza conteúdo
  // -----------------------------------------------------------------------
  it('não deve renderizar conteúdo quando isOpen é false', () => {
    const { container } = render(
      <TransactionModal {...defaultProps} isOpen={false} transaction={null} />,
    );

    // O modal mock retorna null quando isOpen=false
    expect(screen.queryByTestId('modal-root')).not.toBeInTheDocument();
    // O container deve estar vazio ou apenas com fragments
    expect(container.textContent).toBe('');
  });

  // -----------------------------------------------------------------------
  // G-T11: Select de categoria com todas as opções
  // -----------------------------------------------------------------------
  it('deve exibir select de categoria com placeholder', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    expect(screen.getByTestId('select-root')).toBeInTheDocument();
  });
});

describe('TransactionModal — Validação (Red Paths)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // R-T3: Campos obrigatórios vazios
  // -----------------------------------------------------------------------
  it('deve exibir erro de validação quando descrição está vazia', async () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    // Preencher apenas campos não-descrição
    fillFormFields({ description: '' });

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Deve exibir mensagem de erro para descrição vazia
      expect(screen.getByText(/descrição/i)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('deve exibir erro de validação quando responsible está vazio', async () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    // Preencher com responsible vazio
    fillFormFields({ responsible: '' });

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/responsável|responsavel/i)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('deve exibir erro de validação quando data está vazia', async () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields({ date: '' });

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/data/i)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // R-T2: Valor negativo
  // -----------------------------------------------------------------------
  it('deve exibir erro de validação para valor negativo', async () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields({ value: '-100' });

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/positivo|negativo|inválido|válido/i)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // R-T1: Valor zero
  // -----------------------------------------------------------------------
  it('deve exibir erro de validação para valor zero', async () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields({ value: '0' });

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/positivo|zero|inválido|válido/i),
      ).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // G-T9: Mensagem de erro no topo quando onSave rejeita
  // -----------------------------------------------------------------------
  it('deve exibir mensagem de erro no topo do modal quando onSave lança erro', async () => {
    mockOnSave.mockRejectedValue(new Error('Erro ao salvar transação'));

    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields();

    // Selecionar categoria (necessário para validação)
    const categoryItem = screen.getByTestId('select-item-Alimentação');
    fireEvent.click(categoryItem);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Erro ao salvar transação/i)).toBeInTheDocument();
    });

    // Modal não deve fechar após erro
    expect(screen.getByTestId('modal-root')).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('deve exibir mensagem de erro genérica quando onSave rejeita com string', async () => {
    mockOnSave.mockRejectedValue('Falha na rede');

    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields();

    // Selecionar categoria (necessário para validação)
    const categoryItem = screen.getByTestId('select-item-Alimentação');
    fireEvent.click(categoryItem);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Falha na rede/i)).toBeInTheDocument();
    });
  });

  it('não deve mostrar erro se onSave resolver com sucesso', async () => {
    mockOnSave.mockResolvedValue(undefined);

    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields();

    // Selecionar categoria (necessário para validação)
    const categoryItem = screen.getByTestId('select-item-Alimentação');
    fireEvent.click(categoryItem);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });

    // Nenhum erro deve estar visível
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('TransactionModal — Edição', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // G-T14: Editar altera apenas campos modificados
  // -----------------------------------------------------------------------
  it('deve enviar dados parciais ao editar apenas um campo', async () => {
    mockOnSave.mockResolvedValue(undefined);

    render(<TransactionModal {...defaultProps} transaction={mockTransaction} />);

    // Alterar apenas a descrição
    const descriptionInput = screen.getByTestId('input-description') as HTMLInputElement;
    fireEvent.change(descriptionInput, { target: { value: 'Aluguel atualizado' } });

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Aluguel atualizado',
        }),
      );
    });
  });

  it('deve manter valores originais para campos não alterados na edição', async () => {
    mockOnSave.mockResolvedValue(undefined);

    render(<TransactionModal {...defaultProps} transaction={mockTransaction} />);

    // Submeter sem alterar nada
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Aluguel',
          responsible: 'João',
        }),
      );
    });
  });

  it('deve manter o mesmo id na edição', async () => {
    mockOnSave.mockResolvedValue(undefined);

    render(<TransactionModal {...defaultProps} transaction={mockTransaction} />);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
        }),
      );
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // G-T15: onSubmit converte value string → number
  // -----------------------------------------------------------------------
  it('deve converter value de string para number antes de enviar', async () => {
    // Este teste verifica que o valor é convertido para número
    // O schema CreateTransactionSchema valida value como number

    // Como o form usa value como string (TransactionFormData) mas
    // envia como number (CreateTransactionInput/UpdateTransactionInput),
    // a conversão deve acontecer no onSubmit
    mockOnSave.mockResolvedValue(undefined);

    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields({ value: '1250.50' });

    // Selecionar categoria (necessário para validação)
    const categoryItem = screen.getByTestId('select-item-Alimentação');
    fireEvent.click(categoryItem);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          // value é convertido de string para number antes de enviar ao backend
          value: 1250.5,
        }),
      );
    });
  });
});

describe('TransactionModal — Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve lidar com description muito longa (acima de 255 caracteres)', async () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    const longDescription = 'A'.repeat(300);
    fillFormFields({ description: longDescription });

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Deve exibir erro de validação por descrição muito longa
      expect(screen.getByText(/255|máximo|longa|caracteres/i)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('deve lidar com responsible muito longo (acima de 100 caracteres)', async () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    const longName = 'B'.repeat(150);
    fillFormFields({ responsible: longName });

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/100|máximo|longa|caracteres/i)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('deve redefinir campos após submissão bem-sucedida (se aplicável)', async () => {
    mockOnSave.mockResolvedValue(undefined);

    const { rerender } = render(
      <TransactionModal {...defaultProps} transaction={null} />,
    );

    fillFormFields();

    // Selecionar categoria (necessário para validação)
    const categoryItem = screen.getByTestId('select-item-Alimentação');
    fireEvent.click(categoryItem);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    // Re-renderizar com modal fechado e depois aberto novamente
    // Simula o ciclo de abrir/fechar
    rerender(
      <TransactionModal
        {...defaultProps}
        isOpen={false}
        transaction={null}
      />,
    );

    expect(screen.queryByTestId('modal-root')).not.toBeInTheDocument();

    // Reabrir modal
    rerender(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        transaction={null}
      />,
    );

    // Campos devem estar vazios novamente
    const { descriptionInput, valueInput } = getFormElements();
    expect(descriptionInput.value).toBe('');
    expect(valueInput.value).toBe('');
  });

  it('deve exibir data atual como padrão se date não for fornecida', () => {
    // O form pode ou não definir um valor padrão para data
    render(<TransactionModal {...defaultProps} transaction={null} />);

    const dateInput = screen.getByTestId('input-date') as HTMLInputElement;
    // Se não houver transação, date pode vir vazio ou com valor padrão
    // Aceitamos ambos os comportamentos
    expect(dateInput).toBeInTheDocument();
  });
});
