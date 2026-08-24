import { render, screen, fireEvent } from '@testing-library/react';
import { HeaderLayout } from '../HeaderLayout';

jest.mock('@/features/auth/actions/logoutAction', () => ({
  logoutAction: jest.fn(),
}));

describe('HeaderLayout', () => {
  it('renderiza botão de menu', () => {
    render(<HeaderLayout />);
    const menuButton = screen.getByLabelText('Abrir menu');
    expect(menuButton).toBeInTheDocument();
    // O botão de menu agora é visível em todas as telas (sem md:hidden)
    expect(menuButton).toHaveClass('flex');
  });

  it('renderiza botão de menu em todas as telas', () => {
    // O botão de menu agora é visível em todas as telas
    const { container } = render(<HeaderLayout />);
    const menuButton = container.querySelector('button[aria-label="Abrir menu"]');
    expect(menuButton).toBeInTheDocument();
    // Verifica que NÃO tem md:hidden (visível em todas as telas)
    expect(menuButton).not.toHaveClass('md:hidden');
  });

  it('renderiza a marca "FinanceGuy" visível em todas as telas', () => {
    render(<HeaderLayout />);
    expect(screen.getByText('FinanceGuy')).toBeInTheDocument();
  });

  it('chama onToggleDrawer ao clicar no botão de menu', () => {
    const mockToggleDrawer = jest.fn();
    render(<HeaderLayout onToggleDrawer={mockToggleDrawer} isDrawerOpen={false} />);
    fireEvent.click(screen.getByLabelText('Abrir menu'));
    expect(mockToggleDrawer).toHaveBeenCalledTimes(1);
  });

  it('renderiza SearchInput em desktop', () => {
    const { container } = render(<HeaderLayout />);
    const searchContainer = container.querySelector('.hidden.md\\:flex');
    expect(searchContainer).toBeInTheDocument();
    const searchInput = searchContainer?.querySelector('input[type="search"]');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', 'Buscar transações...');
  });

  it('renderiza os botões de ação Configurações e Perfil', () => {
    render(<HeaderLayout />);
    expect(screen.getAllByLabelText('Assistente IA')).toHaveLength(2);
    expect(screen.getByLabelText('Notificações')).toBeInTheDocument();
    expect(screen.getByLabelText('Perfil')).toBeInTheDocument();
  });

  it('renderiza Configurações ativo (sem aria-disabled)', () => {
    render(<HeaderLayout />);
    expect(screen.getByLabelText('Configurações')).not.toHaveAttribute('aria-disabled');
  });
});
