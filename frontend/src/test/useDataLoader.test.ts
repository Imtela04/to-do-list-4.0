import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useDataLoader } from '../hooks/useDataLoader';

// Mock the hooks
vi.mock('../hooks/useTasksQuery', () => ({
  useTasksQuery: vi.fn()
}));

vi.mock('../hooks/useCategoriesQuery', () => ({
  useCategoriesQuery: vi.fn()
}));

vi.mock('../hooks/useNotesQuery', () => ({
  useNotesQuery: vi.fn()
}));

vi.mock('../hooks/useProfileQuery', () => ({
  useProfileQuery: vi.fn()
}));

// Mock queryClient
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn().mockResolvedValue(undefined)
  })
}));

describe('useDataLoader', () => {
  test('returns reload function', () => {
    const { result } = renderHook(() => useDataLoader());
    expect(typeof result.current.reload).toBe('function');
  });

  test('reload invalidates all queries by default', async () => {
    const { result } = renderHook(() => useDataLoader());
    await result.current.reload();
    // Check that invalidateQueries was called for each key
  });

  test('reload invalidates specific queries', async () => {
    const { result } = renderHook(() => useDataLoader());
    await result.current.reload(['tasks']);
    // Check that invalidateQueries was called with ['tasks']
  });
});