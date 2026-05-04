import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getTasks } from '@/api/services';
import type { Task } from '@/types';

export function useTasksQuery(enabled = !!localStorage.getItem('authToken')): UseQueryResult<Task[]> {
  return useQuery({
    queryKey: ['tasks'],
    queryFn:  async () => {
      const res = await getTasks();
      const data = res.data;
      return 'results' in data ? data.results : data;
    },
    enabled,
  });
}