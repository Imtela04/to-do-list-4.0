import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAttachmentsQuery } from '@/hooks/useAttachmentsQuery';
import { deleteAttachment } from '@/api/services';
import { FileText, Image as ImageIcon, Download, Trash2, Search, X } from 'lucide-react';
import styles from './mediahub.module.css';

const API_ORIGIN = (import.meta.env.VITE_API_URL as string).replace(/\/api\/?$/, '');
const resolveUrl = (url: string) => (url.startsWith('http') ? url : `${API_ORIGIN}${url}`);

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type TypeFilter = 'all' | 'image' | 'document';

export default function MediaHub() {
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [taskFilter, setTaskFilter] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: files = [], isLoading } = useAttachmentsQuery({
    search:  search || undefined,
    type:    typeFilter === 'all' ? undefined : typeFilter,
    task_id: taskFilter ?? undefined,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ taskId, id }: { taskId: number; id: number }) => deleteAttachment(taskId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return (
    <div className={styles.hub}>
      <div className={styles.searchWrap}>
        <Search size={13} className={styles.searchIcon} />
        <input
          className={styles.search}
          placeholder="Search files..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.tabs}>
        {(['all', 'image', 'document'] as TypeFilter[]).map(t => (
          <button
            key={t}
            className={`${styles.tab} ${typeFilter === t ? styles.tabActive : ''}`}
            onClick={() => setTypeFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {taskFilter && (
        <div className={styles.filterChip}>
          filtered by task
          <button onClick={() => setTaskFilter(null)}><X size={11} /></button>
        </div>
      )}

      <div className={styles.list}>
        {isLoading && <p className={styles.empty}>Loading...</p>}
        {!isLoading && files.length === 0 && <p className={styles.empty}>No files yet</p>}
        {files.map(f => (
          <div key={f.id} className={styles.row}>
            {f.content_type.startsWith('image/') ? <ImageIcon size={14} /> : <FileText size={14} />}
            <div className={styles.info}>
              <a href={resolveUrl(f.url)} target="_blank" rel="noreferrer" className={styles.name}>{f.filename}</a>
              <button className={styles.taskBadge} onClick={() => setTaskFilter(f.task_id)}>
                {f.task_title}
              </button>
            </div>
            <span className={styles.size}>{formatSize(f.size)}</span>
            <a href={resolveUrl(f.url)} download={f.filename} className={styles.iconBtn}><Download size={13} /></a>
            <button className={styles.iconBtn} onClick={() => deleteMutation.mutate({ taskId: f.task_id, id: f.id })}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}