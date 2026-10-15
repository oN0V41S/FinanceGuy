import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NicknameForm } from '../NicknameForm';

const mockUpdateNicknameAction = jest.fn();

jest.mock('@/features/auth/actions/updateNicknameAction', () => ({
  updateNicknameAction: (...args: unknown[]) => mockUpdateNicknameAction(...args),
}));

describe('NicknameForm - Apelido', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza o campo de apelido e o botão salvar', () => {
    render(<NicknameForm />);
    expect(screen.getByLabelText('Apelido')).toBeInTheDocument();
    expect(screen.getByLabelText('Salvar apelido')).toBeInTheDocument();
  });

  it('exibe Loader2 (spinner) durante o salvamento', async () => {
    mockUpdateNicknameAction.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 200))
    );

    render(<NicknameForm />);

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

    render(<NicknameForm />);

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

    render(<NicknameForm />);

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

    render(<NicknameForm />);

    const input = screen.getByLabelText('Apelido');
    fireEvent.change(input, { target: { value: 'NovoApelido' } });

    const saveButton = screen.getByLabelText('Salvar apelido');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Erro de conexão')).toBeInTheDocument();
    });
  });

  it('desabilita o botão salvar quando nickname está vazio', () => {
    render(<NicknameForm />);
    const saveButton = screen.getByLabelText('Salvar apelido');
    expect(saveButton).toBeDisabled();
  });

  it('habilita o botão salvar quando nickname não está vazio', () => {
    render(<NicknameForm />);
    const input = screen.getByLabelText('Apelido');
    fireEvent.change(input, { target: { value: 'Apelido' } });
    const saveButton = screen.getByLabelText('Salvar apelido');
    expect(saveButton).not.toBeDisabled();
  });
});
