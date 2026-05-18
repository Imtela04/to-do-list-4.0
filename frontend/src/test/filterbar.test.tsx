import { screen, fireEvent } from '@testing-library/react';
import FilterBar from '../components/layout/filterbar';
import { renderWithProviders } from './utils/utils';
import { useAppStore } from '@/store/useAppStore';

vi.mock('@/hooks/useCategoriesQuery', () => ({
  useCategoriesQuery: () => ({
    data: [{ id: 1, name: 'Work', icon: '💼' }],
    isLoading: false,
  }),
}));

beforeEach(() => useAppStore.getState().resetState());

describe('FilterBar', () => {
  test('renders search input', () => {
    renderWithProviders(<FilterBar />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  test('updates search filter on input', () => {
    renderWithProviders(<FilterBar />);
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'hello' } });
    expect(useAppStore.getState().filter.search).toBe('hello');
  });

  test('clears search with × button', () => {
    renderWithProviders(<FilterBar />);
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByText('×'));
    expect(useAppStore.getState().filter.search).toBe('');
  });

  test('today button sets deadlineDay filter', () => {
    renderWithProviders(<FilterBar />);
    fireEvent.click(screen.getByText('today'));
    const { filter } = useAppStore.getState();
    expect(filter.deadlineDay).not.toBeNull();
    expect(filter.deadlineDay?.day).toBe(new Date().getDate());
  });

  test('today button toggles off when already active', () => {
    renderWithProviders(<FilterBar />);
    fireEvent.click(screen.getByText('today'));
    fireEvent.click(screen.getByText('today'));
    expect(useAppStore.getState().filter.deadlineDay).toBeNull();
  });
});