import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getProfile } from '@/api/services';
import { useAppStore } from '@/store/useAppStore';
import type { Profile } from '@/types';

export function useProfileQuery(enabled = !!localStorage.getItem('authToken')): UseQueryResult<Profile> {
  const setProfile = useAppStore(s => s.setProfile);

  return useQuery({
    queryKey: ['profile'],
    queryFn:  async () => {
      const res = await getProfile();
      setProfile(res.data);
      return res.data;
    },
    enabled,
    retry: false,
  });
}