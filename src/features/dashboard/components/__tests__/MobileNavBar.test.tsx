import { render, screen } from '@testing-library/react';
import { MobileNavBar } from '../MobileNavBar';

// Mock usePathname
jest.mock('next/navigation', () => ({
  usePathname: jest.fn().mockReturnValue('/dashboard'),
}));

describe('MobileNavBar', () => {
  it('renderiza itens de navegação', () => {
    render(<MobileNavBar />);
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /transações/i })).toBeInTheDocument();
  });

  it('inclui o link para Categorias', () => {
    render(<MobileNavBar />);
    expect(screen.getByRole('link', { name: /categorias/i })).toHaveAttribute('href', '/categorias');
  });

  it('renderiza oculto em desktop', () => {
    const { container } = render(<MobileNavBar />);
    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('md:hidden');
  });

  it('renderiza estilos de navegação flutuante', () => {
    const { container } = render(<MobileNavBar />);
    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('fixed bottom-4');
  });
});