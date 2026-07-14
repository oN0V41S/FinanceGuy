import { render, screen, fireEvent } from '@testing-library/react';
import { HeaderActions } from '../HeaderActions';

describe('HeaderActions', () => {
  it('renderiza os botões Notificações, Configurações e Perfil', () => {
    render(<HeaderActions onLogout={jest.fn()} />);
    expect(screen.getByLabelText('Notificações')).toBeInTheDocument();
    expect(screen.getByLabelText('Configurações')).toBeInTheDocument();
    expect(screen.getByLabelText('Perfil')).toBeInTheDocument();
  });

  it('renderiza Configurações ativo (sem aria-disabled)', () => {
    render(<HeaderActions onLogout={jest.fn()} />);
    expect(screen.getByLabelText('Configurações')).not.toHaveAttribute('aria-disabled');
  });

  it('chama onLogout ao clicar em "Sair" no dropdown do Perfil', () => {
    const mockLogout = jest.fn();
    render(<HeaderActions onLogout={mockLogout} />);
    fireEvent.click(screen.getByLabelText('Perfil'));
    fireEvent.click(screen.getByText('Sair'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('não chama onLogout ao clicar em Notificações', () => {
    const mockLogout = jest.fn();
    render(<HeaderActions onLogout={mockLogout} />);
    fireEvent.click(screen.getByLabelText('Notificações'));
    expect(mockLogout).not.toHaveBeenCalled();
  });
});
