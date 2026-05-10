import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import Home from '../pages/home';
import { renderWithProviders } from './utils';

// Mock components
vi.mock('../components/layout/greetings', () => ({
  default: () => <div>Greetings</div>
}));

vi.mock('../components/tasks/tasklist', () => ({
  default: () => <div>Task List</div>
}));

vi.mock('../components/categories/categorypanel', () => ({
  default: () => <div>Category Panel</div>
}));

vi.mock('../components/widgets/stats', () => ({
  default: () => <div>Stats</div>
}));

describe('Home', () => {
  test('renders all main components', () => {
    renderWithProviders(<Home />);
    expect(screen.getByText('Greetings')).toBeInTheDocument();
    expect(screen.getByText('Task List')).toBeInTheDocument();
    expect(screen.getByText('Category Panel')).toBeInTheDocument();
    expect(screen.getByText('Stats')).toBeInTheDocument();
  });

  test('displays welcome message', () => {
    renderWithProviders(<Home />);
    expect(screen.getByText('Greetings')).toBeInTheDocument();
  });
});