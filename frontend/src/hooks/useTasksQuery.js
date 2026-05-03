// src/hooks/useTasksQuery.js
import { useQuery } from '@tanstack/react-query';

export function useTasksQuery() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await getTasks();
      return res.data.results || res.data;
    },
    enabled: !!localStorage.getItem('authToken'),
  });
}