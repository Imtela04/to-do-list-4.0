import { useQueryClient } from '@tanstack/react-query';
import { useTasksQuery }      from '@/hooks/useTasksQuery';
import { useCategoriesQuery } from '@/hooks/useCategoriesQuery';
import { useNotesQuery }      from '@/hooks/useNotesQuery';
import { useProfileQuery }    from '@/hooks/useProfileQuery';

type QueryKey = 'tasks' | 'categories' | 'notes' | 'profile';

export function useDataLoader() {
  const queryClient = useQueryClient();
  const isAuthed    = !!localStorage.getItem('authToken');

  useTasksQuery(isAuthed);
  useCategoriesQuery(isAuthed);
  useNotesQuery(isAuthed);
  useProfileQuery(isAuthed);

  const reload = (keys: QueryKey[] = ['tasks', 'categories', 'notes', 'profile']): Promise<void[]> =>
    Promise.all(keys.map(key => queryClient.invalidateQueries({ queryKey: [key] })));

  return { reload };
}