import { useQueryClient } from '@tanstack/react-query';
import { useTasksQuery }      from '@/hooks/useTasksQuery';
import { useCategoriesQuery } from '@/hooks/useCategoriesQuery';
import { useNotesQuery }      from '@/hooks/useNotesQuery';
import { useProfileQuery }    from '@/hooks/useProfileQuery';
import { useAlarms }          from '@/hooks/useAlarm';

export function useDataLoader() {
  const queryClient = useQueryClient();
  const isAuthed    = !!localStorage.getItem('authToken');

  const tasksQuery = useTasksQuery(isAuthed);
  useCategoriesQuery(isAuthed);
  useNotesQuery(isAuthed);
  useProfileQuery(isAuthed);

  useAlarms(tasksQuery.data ?? []);

  const reload = (keys: Array<'tasks' | 'categories' | 'notes' | 'profile'> = ['tasks', 'categories', 'notes', 'profile']) =>
    Promise.all(keys.map(key => queryClient.invalidateQueries({ queryKey: [key] })));

  return { reload };
}