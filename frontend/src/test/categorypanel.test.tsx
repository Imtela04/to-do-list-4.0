import { screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import CategoryPanel from '../components/categories/categorypanel';
import { renderWithProviders } from './utils';

// Mock the hooks
vi.mock('../hooks/useCategoriesQuery', () => ({
  useCategoriesQuery: () => ({
    data: [
      { id: 1, name: 'Work', icon: '💼' },
      { id: 2, name: 'Personal', icon: '👤' }
    ],
    isLoading: false,
    error: null
  })
}));

vi.mock('../hooks/useTasksQuery', () => ({
  useTasksQuery: () => ({
    data: [],
    isLoading: false,
    error: null
  })
}));

describe('CategoryPanel', () => {
  test('renders categories', () => {
    renderWithProviders(<CategoryPanel />);
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  test('shows add category button', () => {
    renderWithProviders(<CategoryPanel />);
    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument();
  });

  test('filters tasks by category', () => {
    renderWithProviders(<CategoryPanel />);
    const workCategory = screen.getByText('Work');
    fireEvent.click(workCategory);
    // Add assertions for filtering
  });
});