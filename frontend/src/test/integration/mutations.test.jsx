import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTask, deleteTask, toggleTask } from '@/api/services';
import { renderWithProviders, mockTask } from '../utils';

// ── Stub components defined at module level so they get the provider ──
function MiniTaskCard({ task }) {
  const qc = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: ({ completed }) => toggleTask(task.id, completed),
    onMutate: async ({ completed }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const previous = qc.getQueryData(['tasks']);
      qc.setQueryData(['tasks'], old =>
        old?.map(t => t.id === task.id ? { ...t, completed } : t) ?? []
      );
      return { previous };
    },
    onError: (err, vars, ctx) => qc.setQueryData(['tasks'], ctx.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(task.id),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const previous = qc.getQueryData(['tasks']);
      qc.setQueryData(['tasks'], old => old?.filter(t => t.id !== task.id) ?? []);
      return { previous };
    },
    onError: (err, vars, ctx) => qc.setQueryData(['tasks'], ctx.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  return (
    <div>
      <span data-testid={`task-${task.id}`}>{task.title}</span>
      <span data-testid={`status-${task.id}`}>{task.completed ? 'done' : 'active'}</span>
      <button onClick={() => toggleMutation.mutate({ completed: !task.completed })}>
        toggle
      </button>
      <button onClick={() => deleteMutation.mutate()}>delete</button>
    </div>
  );
}

describe('Task mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('authToken', 'fake-token');
  });

  it('optimistically marks task as completed', async () => {
    const task = mockTask({ id: 1, completed: false });
    const { queryClient } = renderWithProviders(<MiniTaskCard task={task} />);

    // seed cache
    queryClient.setQueryData(['tasks'], [task]);
    toggleTask.mockResolvedValue({ data: { ...task, completed: true, xp_result: { xp_gained: 10 } } });

    fireEvent.click(screen.getByText('toggle'));

    await waitFor(() => {
      const cached = queryClient.getQueryData(['tasks']);
      expect(cached[0].completed).toBe(true);
    });
  });

  it('rolls back on toggle failure', async () => {
    const task = mockTask({ id: 1, completed: false });
    const { queryClient } = renderWithProviders(<MiniTaskCard task={task} />);

    queryClient.setQueryData(['tasks'], [task]);
    toggleTask.mockRejectedValue(new Error('Server error'));

    fireEvent.click(screen.getByText('toggle'));

    await waitFor(() => {
      const cached = queryClient.getQueryData(['tasks']);
      expect(cached[0].completed).toBe(false);
    });
  });

  it('optimistically removes task on delete', async () => {
    const task = mockTask({ id: 1 });
    const { queryClient } = renderWithProviders(<MiniTaskCard task={task} />);

    queryClient.setQueryData(['tasks'], [task]);
    deleteTask.mockResolvedValue({});

    fireEvent.click(screen.getByText('delete'));

    await waitFor(() => {
      const cached = queryClient.getQueryData(['tasks']);
      expect(cached).toHaveLength(0);
    });
  });

  it('rolls back on delete failure', async () => {
    const task = mockTask({ id: 1 });
    const { queryClient } = renderWithProviders(<MiniTaskCard task={task} />);

    queryClient.setQueryData(['tasks'], [task]);
    deleteTask.mockRejectedValue(new Error('Server error'));

    fireEvent.click(screen.getByText('delete'));

    await waitFor(() => {
      const cached = queryClient.getQueryData(['tasks']);
      expect(cached).toHaveLength(1);
    });
  });
});

function AddTaskStub() {
  const qc = useQueryClient();
  const addMutation = useMutation({
    mutationFn: (payload) => createTask(payload),
    onSuccess: (res) => {
      qc.setQueryData(['tasks'], old => [res.data, ...(old ?? [])]);
    },
  });
  return (
    <button onClick={() => addMutation.mutate({ title: 'New Task', priority: 'low' })}>
      add
    </button>
  );
}

describe('Add task mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('authToken', 'fake-token');
  });

  it('adds task to cache on success', async () => {
    const newTask = mockTask({ id: 99, title: 'New Task' });
    createTask.mockResolvedValue({ data: newTask });

    const { queryClient } = renderWithProviders(<AddTaskStub />);
    queryClient.setQueryData(['tasks'], []);

    fireEvent.click(screen.getByText('add'));

    await waitFor(() => {
      const cached = queryClient.getQueryData(['tasks']);
      expect(cached).toHaveLength(1);
      expect(cached[0].title).toBe('New Task');
    });
  });
});