import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getStickyNotes } from '@/api/services';
import type { StickyNote } from '@/types';

export function useNotesQuery(enabled = !!localStorage.getItem('authToken')): UseQueryResult<StickyNote[]> {
  return useQuery({
    queryKey: ['notes'],
    queryFn:  async () => {
      const res = await getStickyNotes();
      return res.data;
    },
    enabled,
  });
}