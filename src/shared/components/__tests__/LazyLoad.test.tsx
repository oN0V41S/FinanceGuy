import { render, screen } from '@testing-library/react';
import { LazyLoad } from '../LazyLoad';

describe('LazyLoad', () => {
  it('shows spinner when isReady is false', () => {
    render(
      <LazyLoad isReady={false}>
        <div data-testid="content">Loaded Content</div>
      </LazyLoad>
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('renders children when isReady is true', () => {
    render(
      <LazyLoad isReady={true}>
        <div data-testid="content">Loaded Content</div>
      </LazyLoad>
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByText('Loaded Content')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(
      <LazyLoad isReady={false} message="Carregando transações...">
        <div data-testid="content">Content</div>
      </LazyLoad>
    );
    expect(screen.getByText('Carregando transações...')).toBeInTheDocument();
  });

  it('transitions from loading to content on prop change', () => {
    const { rerender } = render(
      <LazyLoad isReady={false}>
        <div data-testid="content">Content</div>
      </LazyLoad>
    );
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(
      <LazyLoad isReady={true}>
        <div data-testid="content">Content</div>
      </LazyLoad>
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
