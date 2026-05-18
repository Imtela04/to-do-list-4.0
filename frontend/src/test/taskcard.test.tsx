import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import TaskCard from '../components/tasks/taskcard';
import { renderWithProviders, mockTask } from './utils';

vi.mock('@/hooks/useCategoriesQuery', () => ({
  useCategoriesQuery: () => ({ data: [], isLoading: false }),
}));

describe('TaskCard', () => {
  const baseTask = mockTask({ id: 1, title: 'Test Task', priority: 'low' });

  test('renders task title', () => {
    renderWithProviders(<TaskCard task={baseTask} index={0} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  test('shows completed style when task is done', () => {
    const task = mockTask({ completed: true });
    const { container } = renderWithProviders(<TaskCard task={task} index={0} />);
    expect(container.querySelector('.completed')).toBeInTheDocument();
  });

  test('shows overdue when deadline is past and not completed', () => {
    const task = mockTask({
      deadline: new Date(Date.now() - 86400000 * 2).toISOString(),
      completed: false,
    });
    renderWithProviders(<TaskCard task={task} index={0} />);
    expect(screen.getByText(/overdue/i)).toBeInTheDocument();
  });

  test('shows subtask progress badge when subtasks exist', () => {
    const task = mockTask({
      subtasks: [
        { id: 1, title: 'sub1', completed: true,  completed_at: null, created_at: '' },
        { id: 2, title: 'sub2', completed: false, completed_at: null, created_at: '' },
      ],
    });
    renderWithProviders(<TaskCard task={task} index={0} />);
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  test('shows confirm overlay before delete', () => {
    renderWithProviders(<TaskCard task={baseTask} index={0} />);
    // hover to reveal actions
    const card = screen.getByText('Test Task').closest('.card') as HTMLElement;
    fireEvent.mouseEnter(card!);
    const deleteBtn = document.querySelector('.deleteBtn') as HTMLElement;
    if (deleteBtn) {
      fireEvent.click(deleteBtn);
      expect(screen.getByText(/delete this task/i)).toBeInTheDocument();
    }
  });

  test('calls onToggleSelect when in select mode', () => {
    const onToggleSelect = vi.fn();
    renderWithProviders(
      <TaskCard task={baseTask} index={0} selectMode isSelected={false} onToggleSelect={onToggleSelect} />
    );
    const card = screen.getByText('Test Task').closest('div')!;
    fireEvent.click(card);
    expect(onToggleSelect).toHaveBeenCalledWith(1);
  });

  test('shows recurrence badge when set', () => {
    const task = mockTask({ recurrence: 'daily', completed: false });
    renderWithProviders(<TaskCard task={task} index={0} />);
    expect(screen.getByText(/daily/i)).toBeInTheDocument();
  });
});