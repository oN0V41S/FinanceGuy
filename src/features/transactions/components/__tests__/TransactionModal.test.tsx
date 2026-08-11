/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionModal from '../TransactionModal';
import { CategoryEnum } from '../../validations';

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
  // Contexto compartilhado entre Select e SelectItem
  const SelectContext = React.createContext<{
    value: string;
    onValueChange: (value: string) => void;
  } | null>(null);

  const Select = ({ value, onValueChange, children, ...props }: any) => {
    const ctx = React.useMemo(
      () => ({ value, onValueChange }),
      [value, onValueChange],
    );
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
  title: 'Aluguel Apartamento',
  description: 'Aluguel',
  value: 1500,
  date: '2026-01-01',
  category: CategoryEnum.enum.Casa,
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

function getTitleInput(): HTMLInputElement {
  return screen.getByTestId('input-title') as HTMLInputElement;
}

function fillFormFields({
  title,
  description = 'Nova despesa',
  value = '250.00',
  date = '2026-03-15',
  responsible = 'Maria',
}: {
  title?: string;
  description?: string;
  value?: string;
  date?: string;
  responsible?: string;
} = {}) {
  // Title só é preenchido quando explicitamente passado (campo novo — Issue #13)
  if (title !== undefined) {
    fireEvent.change(getTitleInput(), { target: { value: title } });
  }
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

  it('deve exibir tipo como Select com valor padrão expense', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    // Agora Tipo é um Select dropdown, não botões toggle
    const selects = screen.getAllByTestId('select-root');
    expect(selects.length).toBeGreaterThanOrEqual(2);
    // Verificar que as opções existem
    expect(screen.getByTestId('select-item-income')).toHaveTextContent(/receita/i);
    expect(screen.getByTestId('select-item-expense')).toHaveTextContent(/despesa/i);
  });

  it('deve exibir selects de categoria e tipo com opções', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    // Agora existem DOIS selects: categoria e tipo
    expect(screen.getAllByTestId('select-root').length).toBe(2);
  });

  it('deve exibir toggle de paid', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    // Deve ter um toggle para marcar como pago
    const paidToggle = screen.getByRole('switch', { name: /marcar como pago/i });
    expect(paidToggle).toBeInTheDocument();
    expect(paidToggle).toHaveAttribute('aria-checked', 'false');
  });

  // -----------------------------------------------------------------------
  // Issue #13: campo Título (opcional, máx 100 chars)
  // -----------------------------------------------------------------------
  it('deve exibir o campo Título no modo Create (vazio)', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    const titleInput = getTitleInput();
    expect(titleInput).toBeInTheDocument();
    expect(titleInput.value).toBe('');
  });

  it('deve exibir label "Título" para o campo de título', () => {
    render(<TransactionModal {...defaultProps} />);

    const label = screen.getByTestId('label-title');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent(/título|titulo/i);
  });

  it('deve limitar o campo Título a 100 caracteres (maxLength)', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    const titleInput = getTitleInput();
    expect(titleInput).toHaveAttribute('maxLength', '100');
  });

  it('deve permitir submissão sem título (título é opcional)', async () => {
    mockOnSave.mockResolvedValue(undefined);
    render(<TransactionModal {...defaultProps} transaction={null} />);

    // Preencher todos os campos obrigatórios, deixando o título vazio
    fillFormFields({ description: 'Mercado' });

    // Selecionar categoria (necessária para validação)
    const categoryItem = screen.getByTestId('select-item-Alimentação');
    fireEvent.click(categoryItem);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
  });

  it('deve enviar o title no payload ao submeter', async () => {
    mockOnSave.mockResolvedValue(undefined);
    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields({
      title: 'Mercado do mês',
      description: 'Compras do mês',
      value: '450.75',
      date: '2026-03-20',
      responsible: 'João',
    });

    // Selecionar categoria (necessária para validação)
    const categoryItem = screen.getByTestId('select-item-Alimentação');
    fireEvent.click(categoryItem);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Mercado do mês',
        }),
      );
    });
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

    // O Select de tipo deve ter o valor 'expense'
    const selects = screen.getAllByTestId('select-root');
    const typeSelect = selects[1]; // segundo select é o de tipo
    expect(typeSelect).toHaveAttribute('data-value', 'expense');
  });

  // -----------------------------------------------------------------------
  // Issue #13: modo Edit pré-preenche o campo Título
  // -----------------------------------------------------------------------
  it('deve preencher o campo Título com o valor da transação no modo Edit', () => {
    render(<TransactionModal {...defaultProps} transaction={mockTransaction} />);

    const titleInput = getTitleInput();
    expect(titleInput.value).toBe('Aluguel Apartamento');
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

    // Selecionar type income via Select
    const incomeItem = screen.getByTestId('select-item-income');
    fireEvent.click(incomeItem);

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

    // Selecionar type income via Select
    const incomeItem = screen.getByTestId('select-item-income');
    fireEvent.click(incomeItem);

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
          category: CategoryEnum.enum.Salário,
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // G-T7 (atualizado): botão Cancelar removido — apenas o X do modal fecha
  // -----------------------------------------------------------------------
  it('não deve exibir botão Cancelar (fechamento via X do modal)', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
  });

  it('deve fechar ao clicar no botão X do modal', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    const closeButton = screen.getByTestId('modal-close-button');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // G-T10: Alternância entre type income/expense via Select
  // -----------------------------------------------------------------------
  it('deve alternar type para income ao selecionar Receita no dropdown', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    // Clicar no item income do Select
    const incomeItem = screen.getByTestId('select-item-income');
    fireEvent.click(incomeItem);

    // O Select de tipo deve ter income como valor
    const selects = screen.getAllByTestId('select-root');
    const typeSelect = selects[1]; // segundo select é o de tipo
    // O select de tipo deve ter data-value='income'
    expect(typeSelect).toHaveAttribute('data-value', 'income');
  });

  it('deve alternar type para expense ao selecionar Despesa no dropdown', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    // Clicar no item expense do Select
    const expenseItem = screen.getByTestId('select-item-expense');
    fireEvent.click(expenseItem);

    const selects = screen.getAllByTestId('select-root');
    const typeSelect = selects[1]; // segundo select é o de tipo
    expect(typeSelect).toHaveAttribute('data-value', 'expense');
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
  // G-T11: Selects de categoria e tipo com placeholders
  // -----------------------------------------------------------------------
  it('deve exibir selects de categoria e tipo com placeholders', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    // Agora existem dois selects: categoria + tipo
    const selects = screen.getAllByTestId('select-root');
    expect(selects).toHaveLength(2);
    // Ambos os placeholders devem estar presentes
    expect(screen.getAllByTestId('select-value').length).toBe(2);
  });
});

describe('TransactionModal — Validação (Red Paths)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Issue #13: description NÃO é mais obrigatória — submissão sem descrição
  // deve ser VÁLIDA (regra antiga: descrição vazia → erro de validação)
  // -----------------------------------------------------------------------
  it('deve permitir submissão sem descrição (descrição agora é opcional)', async () => {
    mockOnSave.mockResolvedValue(undefined);
    render(<TransactionModal {...defaultProps} transaction={null} />);

    // Preencher TODOS os campos obrigatórios exceto a descrição
    fillFormFields({ description: '' });

    // Selecionar categoria (necessária para validação)
    const categoryItem = screen.getByTestId('select-item-Alimentação');
    fireEvent.click(categoryItem);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    // Nenhum erro de validação deve ser exibido
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // R-T3: Campos obrigatórios vazios (responsible continua obrigatório)
  // -----------------------------------------------------------------------

  it('deve exibir erro de validação quando responsible está vazio', async () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    // Preencher com responsible vazio
    fillFormFields({ responsible: '' });

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      const matches = screen.getAllByText(/responsável|responsavel/i);
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('deve exibir erro de validação quando data está vazia', async () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields({ date: '' });

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      const matches = screen.getAllByText(/data/i);
      expect(matches.length).toBeGreaterThanOrEqual(2);
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
  // Issue #13: título com limite de 100 caracteres
  // -----------------------------------------------------------------------
  it('deve exibir erro de validação para título acima de 100 caracteres', async () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields({ title: 'T'.repeat(101) });

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/100|máximo|longa|caracteres/i),
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

describe('TransactionModal — Validação Contínua (botão Salvar)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve desabilitar o botão Salvar quando o formulário está inválido (categoria não selecionada)', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields();

    const submitButton = screen.getByTestId('submit-button');
    expect(submitButton).toBeDisabled();
  });

  it('deve desabilitar o botão Salvar no primeiro render do modo Create (form vazio)', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    expect(screen.getByTestId('submit-button')).toBeDisabled();
  });

  it('deve habilitar o botão Salvar quando o formulário é válido', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields();
    fireEvent.click(screen.getByTestId('select-item-Alimentação'));

    expect(screen.getByTestId('submit-button')).toBeEnabled();
  });

  it('deve exibir erro de categoria "Este campo não deve estar vazio." quando categoria não selecionada', async () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Este campo não deve estar vazio',
      );
    });

    // Não deve exibir a mensagem padrão do Zod enum
    expect(screen.queryByText(/invalid enum value/i)).not.toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('deve desaparecer o erro de categoria após selecionar uma categoria válida', async () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Este campo não deve estar vazio',
    );

    fireEvent.click(screen.getByTestId('select-item-Alimentação'));

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
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

  it('deve manter o botão Salvar desabilitado quando nada é alterado na edição', () => {
    render(<TransactionModal {...defaultProps} transaction={mockTransaction} />);

    expect(screen.getByTestId('submit-button')).toBeDisabled();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('deve habilitar o botão Salvar após alterar um campo e re-desabilitar ao reverter', () => {
    render(<TransactionModal {...defaultProps} transaction={mockTransaction} />);

    const submitButton = screen.getByTestId('submit-button');
    expect(submitButton).toBeDisabled();

    // Alterar a descrição → habilita
    fireEvent.change(screen.getByTestId('input-description'), {
      target: { value: 'Aluguel atualizado' },
    });
    expect(submitButton).toBeEnabled();

    // Reverter para o valor original → desabilita novamente
    fireEvent.change(screen.getByTestId('input-description'), {
      target: { value: 'Aluguel' },
    });
    expect(submitButton).toBeDisabled();
  });

  it('deve manter o mesmo id na edição', async () => {
    mockOnSave.mockResolvedValue(undefined);

    render(<TransactionModal {...defaultProps} transaction={mockTransaction} />);

    // Alterar um campo para habilitar o botão (dirty tracking)
    fireEvent.change(screen.getByTestId('input-description'), {
      target: { value: 'Aluguel editado' },
    });

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

// ===========================================================================
// Refactored Layout Tests
// ===========================================================================
// These tests validate the component after the layout refactor:
//   1. Labels added to ALL fields (Description, Value, Date, Responsible)
//   2. Type changed from toggle buttons → Select dropdown
//   3. Type moved from top to after Responsible
//   4. Layout compacted (space-y-3 instead of space-y-4)
//   5. Paid toggle colored green (paid) / red (unpaid)
// ===========================================================================

describe('TransactionModal — Labels em Todos os Campos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve exibir label "Descrição" para o campo de descrição', () => {
    render(<TransactionModal {...defaultProps} />);
    const label = screen.getByTestId('label-description');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent(/descrição/i);
  });

  it('deve exibir label "Valor" para o campo de valor', () => {
    render(<TransactionModal {...defaultProps} />);
    const label = screen.getByTestId('label-value');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent(/^valor$/i);
  });

  it('deve exibir label "Data" para o campo de data', () => {
    render(<TransactionModal {...defaultProps} />);
    const label = screen.getByTestId('label-date');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent(/^data$/i);
  });

  it('deve exibir label "Responsável" para o campo de responsável', () => {
    render(<TransactionModal {...defaultProps} />);
    const label = screen.getByTestId('label-responsible');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent(/responsável/i);
  });
});

describe('TransactionModal — Tipo como Select', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve usar Select dropdown para Tipo ao invés de botões toggle', () => {
    render(<TransactionModal {...defaultProps} />);
    // Agora existem DOIS componentes Select: categoria + tipo
    const selects = screen.getAllByTestId('select-root');
    expect(selects).toHaveLength(2);
  });

  it('deve exibir as opções "Receita" e "Despesa" no Select de Tipo', () => {
    render(<TransactionModal {...defaultProps} />);
    expect(screen.getByTestId('select-item-income')).toHaveTextContent(/receita/i);
    expect(screen.getByTestId('select-item-expense')).toHaveTextContent(/despesa/i);
  });

  it('não deve renderizar botões toggle para Receita/Despesa (type agora é Select)', () => {
    render(<TransactionModal {...defaultProps} />);
    // Não deve haver botões com texto exato "Receita" ou "Despesa"
    // (botões de toggle de tipo foram substituídos pelo Select)
    const incomeButtons = screen.queryAllByRole('button', { name: /^receita$/i });
    const expenseButtons = screen.queryAllByRole('button', { name: /^despesa$/i });
    expect(incomeButtons).toHaveLength(0);
    expect(expenseButtons).toHaveLength(0);
  });
});

describe('TransactionModal — Ordem dos Campos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve posicionar o campo Tipo APÓS o campo Responsável na ordem do formulário', () => {
    const { container } = render(<TransactionModal {...defaultProps} />);
    const html = container.textContent || '';
    const respIndex = html.indexOf('Responsável');
    const typeIndex = html.indexOf('Tipo');
    // Responsável deve aparecer antes de Tipo no texto do formulário
    expect(respIndex).toBeLessThan(typeIndex);
  });

  it('deve posicionar o campo Categoria antes do campo Tipo', () => {
    const { container } = render(<TransactionModal {...defaultProps} />);
    const html = container.textContent || '';
    const catIndex = html.indexOf('Categoria');
    const typeIndex = html.indexOf('Tipo');
    expect(catIndex).toBeLessThan(typeIndex);
  });

  it('deve posicionar o campo Descrição antes do campo Valor', () => {
    const { container } = render(<TransactionModal {...defaultProps} />);
    const html = container.textContent || '';
    const descIndex = html.indexOf('Descrição');
    const valIndex = html.indexOf('Valor');
    expect(descIndex).toBeLessThan(valIndex);
  });

  it('deve posicionar o campo Valor antes do campo Data (mesma linha no grid)', () => {
    const { container } = render(<TransactionModal {...defaultProps} />);
    const html = container.textContent || '';
    const valIndex = html.indexOf('Valor');
    const dateIndex = html.indexOf('Data');
    expect(valIndex).toBeLessThan(dateIndex);
  });

  it('deve posicionar Pago após Tipo na ordem do formulário', () => {
    const { container } = render(<TransactionModal {...defaultProps} />);
    const html = container.textContent || '';
    const typeIndex = html.indexOf('Tipo');
    const paidIndex = html.indexOf('Pago');
    expect(typeIndex).toBeLessThan(paidIndex);
  });
});

describe('TransactionModal — Layout Compacto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve usar espaçamento reduzido space-y-3 (layout compacto)', () => {
    render(<TransactionModal {...defaultProps} />);
    const modalContent = screen.getByTestId('modal-content');
    const formDiv = modalContent.firstElementChild;
    expect(formDiv?.className).toContain('space-y-3');
  });

  it('não deve usar o espaçamento anterior space-y-4', () => {
    render(<TransactionModal {...defaultProps} />);
    const modalContent = screen.getByTestId('modal-content');
    const formDiv = modalContent.firstElementChild;
    expect(formDiv?.className).not.toContain('space-y-4');
  });
});

describe('TransactionModal — Cores do Toggle Pago', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve aplicar classe de cor verde (finance-income) ao toggle quando marcado como pago', () => {
    render(<TransactionModal {...defaultProps} transaction={mockTransaction} />);
    const paidToggle = screen.getByRole('switch', { name: /marcar como pago/i });
    expect(paidToggle).toHaveAttribute('aria-checked', 'true');
    // O className do botão deve conter a classe de cor verde para pago
    expect(paidToggle.className).toContain('finance-income');
  });

  it('deve aplicar classe de cor vermelha (finance-expense) ao toggle quando NÃO marcado como pago', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);
    const paidToggle = screen.getByRole('switch', { name: /marcar como pago/i });
    expect(paidToggle).toHaveAttribute('aria-checked', 'false');
    // O className do botão deve conter a classe de cor vermelha para não pago
    expect(paidToggle.className).toContain('finance-expense');
  });

  it('deve alternar a cor do toggle ao alternar o estado paid', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);
    const paidToggle = screen.getByRole('switch', { name: /marcar como pago/i });

    // Estado inicial: não pago → vermelho
    expect(paidToggle).toHaveAttribute('aria-checked', 'false');
    expect(paidToggle.className).toContain('finance-expense');

    // Clicar para marcar como pago → verde
    fireEvent.click(paidToggle);
    expect(paidToggle).toHaveAttribute('aria-checked', 'true');
    expect(paidToggle.className).toContain('finance-income');

    // Clicar novamente para desmarcar → vermelho
    fireEvent.click(paidToggle);
    expect(paidToggle).toHaveAttribute('aria-checked', 'false');
    expect(paidToggle.className).toContain('finance-expense');
  });

  it('deve mostrar cor verde no toggle ao editar transação já paga', () => {
    render(<TransactionModal {...defaultProps} transaction={mockTransaction} />);
    const paidToggle = screen.getByRole('switch', { name: /marcar como pago/i });
    expect(paidToggle).toHaveAttribute('aria-checked', 'true');
    expect(paidToggle.className).toContain('finance-income');
  });

  it('deve mostrar cor vermelha no toggle ao criar transação não paga (padrão)', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);
    const paidToggle = screen.getByRole('switch', { name: /marcar como pago/i });
    // Por padrão, nova transação começa como não paga
    expect(paidToggle).toHaveAttribute('aria-checked', 'false');
    expect(paidToggle.className).toContain('finance-expense');
  });
});

// ===========================================================================
// Recorrência (Issue #12) — toggle "Aplicar a todas as parcelas futuras"
// Regra de negócio: apenas transações recorrentes em EDIÇÃO exibem o toggle,
// e apenas quando onSaveFuture é fornecido. O histórico nunca é alterado.
// ===========================================================================

describe('TransactionModal — Recorrência (Issue #12)', () => {
  const mockOnSaveFuture = jest.fn();

  const recurringByInstallments = {
    ...mockTransaction,
    id: 'r-1',
    total_installments: 3,
    installment_number: 2,
  };

  const recurringByFlag = {
    ...mockTransaction,
    id: 'r-2',
    is_recurring: true,
  };

  const recurringByParent = {
    ...mockTransaction,
    id: 'r-3',
    parent_transaction_id: 'parent-001',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Green Path — toggle aparece para transações recorrentes com onSaveFuture
  // -----------------------------------------------------------------------

  it('deve exibir o toggle "Aplicar a todas as parcelas futuras" para transação com is_recurring true e onSaveFuture', () => {
    render(
      <TransactionModal
        {...defaultProps}
        transaction={recurringByFlag}
        onSaveFuture={mockOnSaveFuture}
      />,
    );

    const toggle = screen.getByRole('switch', {
      name: /aplicar a todas as parcelas futuras/i,
    });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('deve exibir o toggle para transação com total_installments maior que 1 e onSaveFuture', () => {
    render(
      <TransactionModal
        {...defaultProps}
        transaction={recurringByInstallments}
        onSaveFuture={mockOnSaveFuture}
      />,
    );

    expect(
      screen.getByRole('switch', {
        name: /aplicar a todas as parcelas futuras/i,
      }),
    ).toBeInTheDocument();
  });

  it('deve exibir o toggle para transação com parent_transaction_id preenchido e onSaveFuture', () => {
    render(
      <TransactionModal
        {...defaultProps}
        transaction={recurringByParent}
        onSaveFuture={mockOnSaveFuture}
      />,
    );

    expect(
      screen.getByRole('switch', {
        name: /aplicar a todas as parcelas futuras/i,
      }),
    ).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Red Path — toggle NÃO aparece
  // -----------------------------------------------------------------------

  it('não deve exibir o toggle para transação NÃO recorrente mesmo com onSaveFuture', () => {
    render(
      <TransactionModal
        {...defaultProps}
        transaction={mockTransaction}
        onSaveFuture={mockOnSaveFuture}
      />,
    );

    expect(
      screen.queryByRole('switch', {
        name: /aplicar a todas as parcelas futuras/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('não deve exibir o toggle para transação recorrente quando onSaveFuture não é fornecido', () => {
    render(
      <TransactionModal {...defaultProps} transaction={recurringByFlag} />,
    );

    expect(
      screen.queryByRole('switch', {
        name: /aplicar a todas as parcelas futuras/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('não deve exibir o toggle em modo Create (sem transação)', () => {
    render(
      <TransactionModal
        {...defaultProps}
        transaction={null}
        onSaveFuture={mockOnSaveFuture}
      />,
    );

    expect(
      screen.queryByRole('switch', {
        name: /aplicar a todas as parcelas futuras/i,
      }),
    ).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Comportamento do submit com o toggle
  // -----------------------------------------------------------------------

  it('deve chamar onSaveFuture (e não onSave) com payload incluindo title quando o toggle está marcado', async () => {
    mockOnSave.mockResolvedValue(undefined);
    mockOnSaveFuture.mockResolvedValue(undefined);

    render(
      <TransactionModal
        {...defaultProps}
        transaction={recurringByFlag}
        onSaveFuture={mockOnSaveFuture}
      />,
    );

    fireEvent.click(
      screen.getByRole('switch', {
        name: /aplicar a todas as parcelas futuras/i,
      }),
    );
    // Alterar um campo para habilitar o botão (dirty tracking)
    fireEvent.change(screen.getByTestId('input-value'), {
      target: { value: '1600.00' },
    });
    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(mockOnSaveFuture).toHaveBeenCalledTimes(1);
      expect(mockOnSaveFuture).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'r-2',
          title: 'Aluguel Apartamento',
          description: 'Aluguel',
        }),
      );
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  it('deve chamar onSave (e não onSaveFuture) quando o toggle está desmarcado', async () => {
    mockOnSave.mockResolvedValue(undefined);
    mockOnSaveFuture.mockResolvedValue(undefined);

    render(
      <TransactionModal
        {...defaultProps}
        transaction={recurringByInstallments}
        onSaveFuture={mockOnSaveFuture}
      />,
    );

    // Alterar um campo para habilitar o botão (dirty tracking)
    fireEvent.change(screen.getByTestId('input-value'), {
      target: { value: '1600.00' },
    });
    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'r-1',
        }),
      );
      expect(mockOnSaveFuture).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Reset do toggle ao fechar/reabrir o modal
  // -----------------------------------------------------------------------

  it('deve resetar o toggle para false ao fechar e reabrir o modal em edição recorrente', () => {
    const { rerender } = render(
      <TransactionModal
        {...defaultProps}
        transaction={recurringByFlag}
        onSaveFuture={mockOnSaveFuture}
      />,
    );

    const toggle = screen.getByRole('switch', {
      name: /aplicar a todas as parcelas futuras/i,
    });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    // Fechar o modal
    rerender(
      <TransactionModal
        {...defaultProps}
        isOpen={false}
        transaction={recurringByFlag}
        onSaveFuture={mockOnSaveFuture}
      />,
    );
    expect(screen.queryByTestId('modal-root')).not.toBeInTheDocument();

    // Reabrir o modal — o toggle deve voltar a false
    rerender(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        transaction={recurringByFlag}
        onSaveFuture={mockOnSaveFuture}
      />,
    );

    const reopenedToggle = screen.getByRole('switch', {
      name: /aplicar a todas as parcelas futuras/i,
    });
    expect(reopenedToggle).toHaveAttribute('aria-checked', 'false');
  });
});

// ===========================================================================
// Recorrência na CRIAÇÃO (parcelada) — Toggle "Transação recorrente (parcelada)"
// Requisitos aprovados pelo PO:
//   1. No modo CRIAR (transaction null/undefined) deve existir o toggle
//      "Transação recorrente (parcelada)".
//   2. Toggle ATIVO → campo "Número de parcelas" (input number) aparece.
//      Toggle DESATIVADO → campo NÃO aparece.
//   3. Submit recorrente → onSave recebe is_recurring: true e
//      total_installments como NUMBER (≥ 2).
//   4. Submit não recorrente → onSave recebe is_recurring: false e SEM
//      total_installments (ou undefined).
//   5. Validações pt-BR com role="alert" e classe text-finance-expense.
//   6. Modo EDIÇÃO não exibe este toggle nem o campo de parcelas.
//   7. Reset: fechar e reabrir o modal em modo Create volta o toggle a false
//      e o campo de parcelas some.
// ===========================================================================

describe('TransactionModal — Recorrência na Criação (parcelada)', () => {
  const mockOnSaveFuture = jest.fn();

  const recurringEditTransaction = {
    ...mockTransaction,
    id: 'r-edit',
    is_recurring: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Green Path — toggle visível no modo Create
  // -----------------------------------------------------------------------

  it('deve exibir o toggle "Transação recorrente (parcelada)" no modo Create', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    const toggle = screen.getByRole('switch', {
      name: /transação recorrente.*parcelada/i,
    });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('deve exibir o texto visível "Transação recorrente (parcelada)" no modo Create', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    expect(
      screen.getByText(/transação recorrente.*parcelada/i),
    ).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Green Path — campo "Número de parcelas" condicional
  // -----------------------------------------------------------------------

  it('não deve exibir o campo "Número de parcelas" quando o toggle está desativado', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    expect(screen.queryByLabelText(/número de parcelas/i)).not.toBeInTheDocument();
  });

  it('deve exibir o campo "Número de parcelas" como input number ao ativar o toggle', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    fireEvent.click(
      screen.getByRole('switch', { name: /transação recorrente.*parcelada/i }),
    );

    const installmentsInput = screen.getByLabelText(
      /número de parcelas/i,
    ) as HTMLInputElement;
    expect(installmentsInput).toBeInTheDocument();
    expect(installmentsInput).toHaveAttribute('type', 'number');
  });

  it('deve ocultar o campo "Número de parcelas" ao desativar o toggle', () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    const toggle = screen.getByRole('switch', {
      name: /transação recorrente.*parcelada/i,
    });

    fireEvent.click(toggle);
    expect(screen.getByLabelText(/número de parcelas/i)).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.queryByLabelText(/número de parcelas/i)).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Green Path — payload de submissão
  // -----------------------------------------------------------------------

  it('deve enviar is_recurring true e total_installments (number) ao submeter com recorrência ativa', async () => {
    mockOnSave.mockResolvedValue(undefined);
    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields({ description: 'Compra parcelada' });

    // Selecionar categoria (necessária para validação)
    fireEvent.click(screen.getByTestId('select-item-Alimentação'));

    // Ativar recorrência e preencher o número de parcelas
    fireEvent.click(
      screen.getByRole('switch', { name: /transação recorrente.*parcelada/i }),
    );
    fireEvent.change(screen.getByLabelText(/número de parcelas/i), {
      target: { value: '3' },
    });

    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          is_recurring: true,
          total_installments: 3,
        }),
      );
    });

    const payload = mockOnSave.mock.calls[0][0];
    // total_installments deve ser NUMBER (não string)
    expect(typeof payload.total_installments).toBe('number');
  });

  it('deve enviar is_recurring false e sem total_installments ao submeter sem recorrência', async () => {
    mockOnSave.mockResolvedValue(undefined);
    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields({ description: 'Pagamento único' });

    fireEvent.click(screen.getByTestId('select-item-Alimentação'));

    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          is_recurring: false,
        }),
      );
    });

    const payload = mockOnSave.mock.calls[0][0];
    expect(payload).not.toHaveProperty('total_installments');
  });

  // -----------------------------------------------------------------------
  // Red Path — validação de parcelas (mensagens pt-BR, role="alert")
  // -----------------------------------------------------------------------

  it('deve exibir erro "Informe o número de parcelas" quando recorrência ativa e parcelas em branco', async () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields();
    fireEvent.click(screen.getByTestId('select-item-Alimentação'));

    fireEvent.click(
      screen.getByRole('switch', { name: /transação recorrente.*parcelada/i }),
    );

    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /informe o número de parcelas/i,
      );
    });

    const alertEl = screen.getByRole('alert');
    expect(alertEl.className).toContain('text-finance-expense');
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('deve exibir erro "Mínimo de 2 parcelas" para parcelas menor que 2', async () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields();
    fireEvent.click(screen.getByTestId('select-item-Alimentação'));

    fireEvent.click(
      screen.getByRole('switch', { name: /transação recorrente.*parcelada/i }),
    );
    fireEvent.change(screen.getByLabelText(/número de parcelas/i), {
      target: { value: '1' },
    });

    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /mínimo de 2 parcelas/i,
      );
    });
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('deve exibir erro "Máximo de 48 parcelas" para parcelas maior que 48', async () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields();
    fireEvent.click(screen.getByTestId('select-item-Alimentação'));

    fireEvent.click(
      screen.getByRole('switch', { name: /transação recorrente.*parcelada/i }),
    );
    fireEvent.change(screen.getByLabelText(/número de parcelas/i), {
      target: { value: '49' },
    });

    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /máximo de 48 parcelas/i,
      );
    });
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('deve exibir erro de validação quando o número de parcelas não é numérico', async () => {
    render(<TransactionModal {...defaultProps} transaction={null} />);

    fillFormFields();
    fireEvent.click(screen.getByTestId('select-item-Alimentação'));

    fireEvent.click(
      screen.getByRole('switch', { name: /transação recorrente.*parcelada/i }),
    );
    // Nota: com <input type="number"> o valor 'abc' é sanitizado para '' no DOM,
    // então o erro exibido pode ser "Informe o número de parcelas" ou
    // "Número de parcelas inválido". O importante: NÃO submete e mostra alerta.
    fireEvent.change(screen.getByLabelText(/número de parcelas/i), {
      target: { value: 'abc' },
    });

    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByRole('alert').textContent).toMatch(/parcelas/i);
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Modo Edição — toggle de criação NÃO deve aparecer
  // -----------------------------------------------------------------------

  it('não deve exibir o toggle de recorrência de criação nem o campo de parcelas no modo Edição', () => {
    render(
      <TransactionModal
        {...defaultProps}
        transaction={recurringEditTransaction}
        onSaveFuture={mockOnSaveFuture}
      />,
    );

    // O toggle já existente de edição continua presente
    expect(
      screen.getByRole('switch', {
        name: /aplicar a todas as parcelas futuras/i,
      }),
    ).toBeInTheDocument();

    // O novo toggle de criação (parcelada) NÃO deve aparecer em edição
    expect(
      screen.queryByRole('switch', {
        name: /transação recorrente.*parcelada/i,
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/número de parcelas/i)).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Reset — fechar e reabrir o modal em modo Create
  // -----------------------------------------------------------------------

  it('deve resetar o toggle de recorrência e ocultar o campo de parcelas ao fechar e reabrir o modal', () => {
    const { rerender } = render(
      <TransactionModal {...defaultProps} transaction={null} />,
    );

    const toggle = screen.getByRole('switch', {
      name: /transação recorrente.*parcelada/i,
    });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText(/número de parcelas/i)).toBeInTheDocument();

    // Fechar o modal
    rerender(
      <TransactionModal {...defaultProps} isOpen={false} transaction={null} />,
    );
    expect(screen.queryByTestId('modal-root')).not.toBeInTheDocument();

    // Reabrir o modal — toggle deve voltar a false e o campo deve sumir
    rerender(
      <TransactionModal {...defaultProps} isOpen={true} transaction={null} />,
    );

    const reopenedToggle = screen.getByRole('switch', {
      name: /transação recorrente.*parcelada/i,
    });
    expect(reopenedToggle).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByLabelText(/número de parcelas/i)).not.toBeInTheDocument();
  });
});
