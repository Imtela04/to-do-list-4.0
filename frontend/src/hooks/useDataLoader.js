import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getTasks, getCategories, getStickyNotes, getProfile } from '@/api/services';

export function useDataLoader() {
  const setTasks      = useAppStore(s => s.setTasks);
  const setCategories = useAppStore(s => s.setCategories);
  const setNotes      = useAppStore(s => s.setNotes);
  const setProfile    = useAppStore(s => s.setProfile);
  const setLoading    = useAppStore(s => s.setLoading);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const loadTasks = async () => {
      setLoading({ tasks: true });
      try {
        const res = await getTasks();
        setTasks(res.data.results || res.data);
      } catch {
        setTasks([]);
      } finally {
        setLoading({ tasks: false });
      }
    };

    const loadCategories = async () => {
      try {
        const res = await getCategories();
        setCategories(res.data);
      } catch {}
    };

    const loadNotes = async () => {
      try {
        const res = await getStickyNotes();
        setNotes(res.data);
      } catch {}
    };

    const loadProfile = async () => {
      try {
        const res = await getProfile();
        setProfile(res.data);
      } catch {}
    };

    loadTasks();
    loadCategories();
    loadNotes();
    loadProfile();
  }, []);

  // expose reload functions for manual refresh (e.g. after login)
  const reload = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      const [tasks, cats, notes, profile] = await Promise.all([
        getTasks(),
        getCategories(),
        getStickyNotes(),
        getProfile(),
      ]);
      setTasks(tasks.data.results || tasks.data);
      setCategories(cats.data);
      setNotes(notes.data);
      setProfile(profile.data);
    } catch {}
  };

  return { reload };
}