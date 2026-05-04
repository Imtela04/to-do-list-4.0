import { useQueryClient } from '@tanstack/react-query';
import { useTasksQuery } from '@/hooks/useTasksQuery';
import { useCategoriesQuery } from '@/hooks/useCategoriesQuery';
import { useNotesQuery } from '@/hooks/useNotesQuery';
import { useProfileQuery } from '@/hooks/useProfileQuery';

export function useDataLoader() {
  const queryClient = useQueryClient();
  const isAuthed = !!localStorage.getItem('authToken');

  useTasksQuery(isAuthed);
  useCategoriesQuery(isAuthed);
  useNotesQuery(isAuthed);
  useProfileQuery(isAuthed);

  const reload = (keys = ['tasks', 'categories', 'notes', 'profile']) =>
    Promise.all(keys.map(key => queryClient.invalidateQueries({ queryKey: [key] })));

  return { reload };
}