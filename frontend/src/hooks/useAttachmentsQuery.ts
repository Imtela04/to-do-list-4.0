import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getAllAttachments } from '@/api/services';
import type { AttachmentWithTask } from '@/types';

interface Params {
  search?:  string;
  type?:    'image' | 'document';
  task_id?: number;
}

export function useAttachmentsQuery(params: Params = {}): UseQueryResult<AttachmentWithTask[]> {
  return useQuery({
    queryKey: ['attachments', params],
    queryFn: async () => {
      const res = await getAllAttachments(params as Record<string, unknown>);
      return res.data;
    },
    enabled: !!localStorage.getItem('authToken'),
  });
}