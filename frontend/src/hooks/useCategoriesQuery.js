// src/hooks/useCategoriesQuery.js
import { useQuery } from '@tanstack/react-query';
import { getCategories } from '@/api/services';

export function useCategoriesQuery() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await getCategories();
      return res.data;
    },
    enabled: !!localStorage.getItem('authToken'),
  });
}