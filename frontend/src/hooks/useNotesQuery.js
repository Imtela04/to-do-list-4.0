import { useQuery } from '@tanstack/react-query';
import { getStickyNotes } from '@/api/services';

export function useNotesQuery(enabled = !!localStorage.getItem('authToken')) {
  return useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const res = await getStickyNotes();
      return res.data;
    },
    enabled,
  });
}