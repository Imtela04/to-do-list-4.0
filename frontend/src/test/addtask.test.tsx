import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AddTask from '../components/tasks/addtask';
import { renderWithProviders } from './utils/utils';
import { createTask } from '@/api/services';

vi.mock('@/hooks/useCategoriesQuery', () => ({
  useCategoriesQuery: () => ({
    data: [{ id: 1, name: 'Work', icon: '💼' }],
    isLoading: false,
  }),
}));

describe('AddTask', () => {
  const setOpen = vi.fn();

  test('renders nothing when closed', () => {
    const { container } = renderWithProviders(<AddTask open={false} setOpen={setOpen} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders form when open', () => {
    renderWithProviders(<AddTask open setOpen={setOpen} />);
    expect(screen.getByPlaceholderText('What do?')).toBeInTheDocument();
  });

  test('disables submit when title is empty', () => {
    renderWithProviders(<AddTask open setOpen={setOpen} />);
    expect(screen.getByText('Add Task')).toBeDisabled();
  });

  test('enables submit when title is filled', () => {
    renderWithProviders(<AddTask open setOpen={setOpen} />);
    fireEvent.change(screen.getByPlaceholderText('What do?'), { target: { value: 'New task' } });
    expect(screen.getByText('Add Task')).not.toBeDisabled();
  });

  test('calls createTask on submit', async () => {
    (createTask as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 99, title: 'New task', priority: 'low', completed: false,
              pinned: false, deadline: null, category: null,
              created_at: new Date().toISOString(), completed_at: null, subtasks: [] },
    });
    renderWithProviders(<AddTask open setOpen={setOpen} />);
    fireEvent.change(screen.getByPlaceholderText('What do?'), { target: { value: 'New task' } });
    fireEvent.click(screen.getByText('Add Task'));
    await waitFor(() => expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New task' })
    ));
  });

  test('closes on Escape key', () => {
    renderWithProviders(<AddTask open setOpen={setOpen} />);
    fireEvent.keyDown(screen.getByPlaceholderText('What do?'), { key: 'Escape' });
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  test('shows limit error from API', async () => {
    (createTask as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { status: 403, data: { limit_reached: true, detail: 'Limit reached' } },
    });
    renderWithProviders(<AddTask open setOpen={setOpen} />);
    fireEvent.change(screen.getByPlaceholderText('What do?'), { target: { value: 'X' } });
    fireEvent.click(screen.getByText('Add Task'));
    await waitFor(() => expect(screen.getByText('Limit reached')).toBeInTheDocument());
  });
});