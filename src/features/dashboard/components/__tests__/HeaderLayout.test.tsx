import { render, screen } from '@testing-library/react';
import { HeaderLayout } from '../HeaderLayout';

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

jest.mock('@/features/auth/actions/logoutAction', () => ({
  logoutAction: jest.fn(),
}));

jest.mock('../ProfileDropdown', () => ({
  ProfileDropdown: () => <button aria-label="Perfil">Perfil</button>,
}));

jest.mock('../ConfigModal', () => ({
  ConfigModal: () => null,
}));

describe('HeaderLayout', () => {
  it('renderiza a marca "FinanceGuy" visível', () => {
    render(<HeaderLayout />);
    expect(screen.getByText('FinanceGuy')).toBeInTheDocument();
  });

  it('inclui o link para Categorias na navegação', () => {
    render(<HeaderLayout />);
    expect(screen.getByRole('link', { name: /categorias/i })).toHaveAttribute('href', '/categorias');
  });

  it('renderiza o item Assistente apontando para /assistente', () => {
    render(<HeaderLayout />);
    expect(screen.getByRole('link', { name: /assistente/i })).toHaveAttribute(
      'href',
      '/assistente',
    );
  });

  it('renderiza botão de Configurações', () => {
    render(<HeaderLayout />);
    expect(screen.getByLabelText('Configurações')).toBeInTheDocument();
  });
});
