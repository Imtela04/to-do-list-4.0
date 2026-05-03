import { useQuery } from '@tanstack/react-query';
import { getTasks } from '@/api/services';

export function useTasksQuery(enabled = !!localStorage.getItem('authToken')) {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await getTasks();
      return res.data.results || res.data;
    },
    enabled,
  });
}