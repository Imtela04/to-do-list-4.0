import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
import { getTasks, getCategories, getStickyNotes, getProfile } from '@/api/services';

export function useDataLoader() {
  const setProfile = useAppStore(s => s.setProfile);
  const queryClient = useQueryClient();

  useQuery({
    queryKey: ['tasks'],
    queryFn:  async () => {
      const res = await getTasks();
      return res.data.results || res.data;
    },
    enabled: !!localStorage.getItem('authToken'),
  });

  useQuery({
    queryKey: ['categories'],
    queryFn:  async () => {
      const res = await getCategories();
      return res.data;
    },
    enabled: !!localStorage.getItem('authToken'),
  });

  useQuery({
    queryKey: ['notes'],
    queryFn:  async () => {
      const res = await getStickyNotes();
      return res.data;
    },
    enabled: !!localStorage.getItem('authToken'),
  });

  useQuery({
    queryKey: ['profile'],
    queryFn:  async () => {
      const res = await getProfile();
      setProfile(res.data);   // still sync XP/level/limits into Zustand
      return res.data;
    },
    enabled: !!localStorage.getItem('authToken'),
  });

  const reload = () => queryClient.invalidateQueries();

  return { reload };
}