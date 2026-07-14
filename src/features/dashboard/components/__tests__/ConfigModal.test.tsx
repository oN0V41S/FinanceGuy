import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigModal } from '../ConfigModal';

const mockUpdateNicknameAction = jest.fn();

jest.mock('@/features/auth/actions/updateNicknameAction', () => ({
  updateNicknameAction: (...args: unknown[]) => mockUpdateNicknameAction(...args),
}));

describe('ConfigModal - Apelido', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza o campo de apelido e o botão salvar', () => {
    render(<ConfigModal isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByLabelText('Apelido')).toBeInTheDocument();
    expect(screen.getByLabelText('Salvar apelido')).toBeInTheDocument();
  });

  it('exibe Loader2 (spinner) durante o salvamento', async () => {
    mockUpdateNicknameAction.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 200))
    );

    render(<ConfigModal isOpen={true} onClose={jest.fn()} />);

    const input = screen.getByLabelText('Apelido');
    fireEvent.change(input, { target: { value: 'NovoApelido' } });

    const saveButton = screen.getByLabelText('Salvar apelido');

    // Check icon deve estar presente antes do clique
    expect(saveButton.querySelector('svg')).toBeInTheDocument();

    fireEvent.click(saveButton);

    // Após o clique, o Loader2 com animate-spin deve aparecer
    await waitFor(() => {
      const spinner = saveButton.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  it('exibe mensagem de sucesso após salvar', async () => {
    mockUpdateNicknameAction.mockResolvedValue({ success: true });

    render(<ConfigModal isOpen={true} onClose={jest.fn()} />);

    const input = screen.getByLabelText('Apelido');
    fireEvent.change(input, { target: { value: 'NovoApelido' } });

    const saveButton = screen.getByLabelText('Salvar apelido');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Apelido alterado com sucesso')).toBeInTheDocument();
    });

    // Mensagem de sucesso deve ter a cor text-finance-income
    const feedbackEl = screen.getByText('Apelido alterado com sucesso');
    expect(feedbackEl.className).toContain('text-finance-income');
  });

  it('exibe mensagem de erro quando a action falha', async () => {
    mockUpdateNicknameAction.mockResolvedValue({ success: false, error: 'Apelido inválido.' });

    render(<ConfigModal isOpen={true} onClose={jest.fn()} />);

    const input = screen.getByLabelText('Apelido');
    fireEvent.change(input, { target: { value: 'Ab' } });

    const saveButton = screen.getByLabelText('Salvar apelido');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Apelido inválido.')).toBeInTheDocument();
    });

    // Mensagem de erro deve ter a cor text-finance-expense
    const feedbackEl = screen.getByText('Apelido inválido.');
    expect(feedbackEl.className).toContain('text-finance-expense');
  });

  it('exibe mensagem de erro de conexão quando a action lança exceção', async () => {
    mockUpdateNicknameAction.mockRejectedValue(new Error('Network error'));

    render(<ConfigModal isOpen={true} onClose={jest.fn()} />);

    const input = screen.getByLabelText('Apelido');
    fireEvent.change(input, { target: { value: 'NovoApelido' } });

    const saveButton = screen.getByLabelText('Salvar apelido');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Erro de conexão')).toBeInTheDocument();
    });
  });

  it('desabilita o botão salvar quando nickname está vazio', () => {
    render(<ConfigModal isOpen={true} onClose={jest.fn()} />);
    const saveButton = screen.getByLabelText('Salvar apelido');
    expect(saveButton).toBeDisabled();
  });

  it('habilita o botão salvar quando nickname não está vazio', () => {
    render(<ConfigModal isOpen={true} onClose={jest.fn()} />);
    const input = screen.getByLabelText('Apelido');
    fireEvent.change(input, { target: { value: 'Apelido' } });
    const saveButton = screen.getByLabelText('Salvar apelido');
    expect(saveButton).not.toBeDisabled();
  });
});

describe('ConfigModal - Tema', () => {
  it('ícone de tema fica DENTRO do Toggle button', () => {
    render(<ConfigModal isOpen={true} onClose={jest.fn()} />);
    const toggle = screen.getByRole('switch');
    expect(toggle.querySelector('svg')).toBeInTheDocument();
  });
});

describe('ConfigModal - Reset ao fechar', () => {
  it('fica vazio (sem mensagem e sem apelido) ao reabrir após fechar', async () => {
    const mockOnClose = jest.fn();
    mockUpdateNicknameAction.mockResolvedValue({ success: true });

    function Wrapper() {
      const [open, setOpen] = useState(true);
      return (
        <div>
          <button onClick={() => setOpen(false)}>fechar</button>
          <button onClick={() => setOpen(true)}>abrir</button>
          {open && <ConfigModal isOpen={true} onClose={mockOnClose} />}
        </div>
      );
    }

    render(<Wrapper />);

    const input = screen.getByLabelText('Apelido') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'NovoApelido' } });
    fireEvent.click(screen.getByLabelText('Salvar apelido'));

    await waitFor(() => {
      expect(screen.getByText('Apelido alterado com sucesso')).toBeInTheDocument();
    });

    // Fecha o modal (desmonta)
    fireEvent.click(screen.getByText('fechar'));
    expect(screen.queryByLabelText('Apelido')).not.toBeInTheDocument();

    // Reabre
    fireEvent.click(screen.getByText('abrir'));
    const reopenedInput = screen.getByLabelText('Apelido') as HTMLInputElement;
    expect(reopenedInput.value).toBe('');
    expect(screen.queryByText('Apelido alterado com sucesso')).not.toBeInTheDocument();
  });
});
