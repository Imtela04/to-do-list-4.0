import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getCategories } from '@/api/services';
import type { Category } from '@/types';

export function useCategoriesQuery(enabled = !!localStorage.getItem('authToken')): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: ['categories'],
    queryFn:  async () => {
      const res = await getCategories();
      return res.data;
    },
    enabled,
  });
}