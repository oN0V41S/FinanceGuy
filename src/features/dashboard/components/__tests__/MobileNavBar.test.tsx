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

  it('renderiza o item Assistente apontando para /assistente', () => {
    render(<MobileNavBar />);
    expect(screen.getByRole('link', { name: /assistente/i })).toHaveAttribute(
      'href',
      '/assistente',
    );
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