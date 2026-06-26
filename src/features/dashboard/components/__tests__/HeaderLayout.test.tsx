import { render, screen, fireEvent } from '@testing-library/react';
import { HeaderLayout } from '../HeaderLayout';

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

  it('chama onOpenMobileDrawer ao clicar no menu', () => {
    const mockOpenDrawer = jest.fn();
    render(<HeaderLayout onOpenMobileDrawer={mockOpenDrawer} />);
    fireEvent.click(screen.getByLabelText('Abrir menu'));
    expect(mockOpenDrawer).toHaveBeenCalled();
  });

  it('renderiza SearchInput em desktop', () => {
    const { container } = render(<HeaderLayout />);
    const searchContainer = container.querySelector('.hidden.md\\:flex');
    expect(searchContainer).toBeInTheDocument();
    const searchInput = searchContainer?.querySelector('input[type="search"]');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', 'Buscar transações...');
  });

  it('renderiza todos os botões de ação', () => {
    render(<HeaderLayout />);
    expect(screen.getAllByLabelText('Assistente IA')).toHaveLength(2);
    expect(screen.getByLabelText('Notificações')).toBeInTheDocument();
    expect(screen.getByLabelText('Perfil')).toBeInTheDocument();
  });
});
