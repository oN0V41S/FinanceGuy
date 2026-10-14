import { render, screen } from '@testing-library/react';
import { MarkdownContent } from '../MarkdownContent';

describe('MarkdownContent', () => {
  it('renderiza negrito, listas e títulos', () => {
    const { container } = render(
      <MarkdownContent content={'## Resumo\n\nVocê gastou **R$ 10,00**.\n\n- item A\n- item B\n\n1. um\n2. dois'} />,
    );
    expect(screen.getByRole('heading', { name: 'Resumo' })).toBeInTheDocument();
    expect(container.querySelector('strong')).toHaveTextContent('R$ 10,00');
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
    expect(container.querySelectorAll('ol li')).toHaveLength(2);
  });

  it('renderiza tabelas GFM', () => {
    render(<MarkdownContent content={'| Categoria | Total |\n| - | - |\n| Mercado | 100 |'} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Categoria' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Mercado' })).toBeInTheDocument();
  });

  it('não interpreta HTML bruto', () => {
    const { container } = render(
      <MarkdownContent content={'<script>alert(1)</script><img src=x onerror=alert(1)> <b>negrito</b>'} />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });

  it('descarta links com esquema perigoso e abre os seguros em nova aba', () => {
    render(<MarkdownContent content={'[ruim](javascript:alert(1)) e [bom](https://exemplo.com)'} />);
    expect(screen.getByText('ruim').closest('a')?.getAttribute('href') ?? '').toBe('');
    const good = screen.getByRole('link', { name: 'bom' });
    expect(good).toHaveAttribute('href', 'https://exemplo.com');
    expect(good).toHaveAttribute('target', '_blank');
    expect(good).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('não carrega imagens remotas', () => {
    const { container } = render(<MarkdownContent content={'![x](https://exemplo.com/a.png)'} />);
    expect(container.querySelector('img')).toBeNull();
  });
});
