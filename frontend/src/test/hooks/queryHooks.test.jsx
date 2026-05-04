vi.unmock('@/hooks/useTasksQuery');
vi.unmock('@/hooks/useCategoriesQuery');
vi.unmock('@/hooks/useNotesQuery');

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getTasks, getCategories, getStickyNotes } from '@/api/services';
import { useTasksQuery } from '@/hooks/useTasksQuery';
import { useCategoriesQuery } from '@/hooks/useCategoriesQuery';
import { useNotesQuery } from '@/hooks/useNotesQuery';
import { makeQueryClient, mockTask, mockCategory } from '../utils';

function wrapper(queryClient) {
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useTasksQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('authToken', 'fake-token');
  });

  it('returns tasks from the API', async () => {
    const tasks = [mockTask({ id: 1 }), mockTask({ id: 2, title: 'Task 2' })];
    getTasks.mockResolvedValue({ data: tasks });

    const qc = makeQueryClient();
    const { result } = renderHook(() => useTasksQuery(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0].title).toBe('Test Task');
  });

  it('returns empty array when API returns empty', async () => {
    getTasks.mockResolvedValue({ data: [] });

    const qc = makeQueryClient();
    const { result } = renderHook(() => useTasksQuery(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('handles paginated response with results key', async () => {
    const tasks = [mockTask()];
    getTasks.mockResolvedValue({ data: { results: tasks } });

    const qc = makeQueryClient();
    const { result } = renderHook(() => useTasksQuery(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it('does not fetch when no auth token', async () => {
    localStorage.removeItem('authToken');

    const qc = makeQueryClient();
    const { result } = renderHook(() => useTasksQuery(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(getTasks).not.toHaveBeenCalled();
  });

  it('sets isError on API failure', async () => {
    getTasks.mockRejectedValue(new Error('Network error'));

    const qc = makeQueryClient();
    const { result } = renderHook(() => useTasksQuery(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useCategoriesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('authToken', 'fake-token');
  });

  it('returns categories from the API', async () => {
    const categories = [mockCategory({ id: 1 }), mockCategory({ id: 2, name: 'Personal' })];
    getCategories.mockResolvedValue({ data: categories });

    const qc = makeQueryClient();
    const { result } = renderHook(() => useCategoriesQuery(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it('does not fetch when no auth token', async () => {
    localStorage.removeItem('authToken');

    const qc = makeQueryClient();
    const { result } = renderHook(() => useCategoriesQuery(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(getCategories).not.toHaveBeenCalled();
  });
});

describe('useNotesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('authToken', 'fake-token');
  });

  it('returns notes from the API', async () => {
    const notes = [{ id: 1, note: 'Hello', color: '#7c6aff' }];
    getStickyNotes.mockResolvedValue({ data: notes });

    const qc = makeQueryClient();
    const { result } = renderHook(() => useNotesQuery(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});
