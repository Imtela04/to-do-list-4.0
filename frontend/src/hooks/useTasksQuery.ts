import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getTasks } from '@/api/services';
import type { Task } from '@/types';

export function useTasksQuery(enabled = !!localStorage.getItem('authToken')): UseQueryResult<Task[]> {
  return useQuery({
    queryKey: ['tasks'],
        queryFn: async () => {
      const res = await getTasks();
      return res.data.results;
    },

    enabled,
    retry: false,
  });
}