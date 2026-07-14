import { render, screen } from '@testing-library/react';
import DashboardLoading from '../loading';

describe('DashboardLoading', () => {
  it('renders LoadingSpinner with dashboard text', () => {
    render(<DashboardLoading />);
    expect(screen.getByText('Carregando dashboard...')).toBeInTheDocument();
  });
});
