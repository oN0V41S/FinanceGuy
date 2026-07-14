import { render, screen } from '@testing-library/react';
import { HeaderBrand } from '../HeaderBrand';

describe('HeaderBrand', () => {
  it('renderiza o texto "FinanceGuy"', () => {
    render(<HeaderBrand />);
    expect(screen.getByText('FinanceGuy')).toBeInTheDocument();
  });

  it('renderiza o logo (ícone Wallet)', () => {
    const { container } = render(<HeaderBrand />);
    const logo = container.querySelector('svg');
    expect(logo).toBeInTheDocument();
  });
});
