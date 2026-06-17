import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadAttachment, deleteAttachment } from '@/api/services';
import type { Task, Attachment } from '@/types';
import { Paperclip, Download, Trash2, Upload } from 'lucide-react';
import styles from './attachments.module.css';

const MAX_SIZE  = 5 * 1024 * 1024;
const MAX_FILES = 5;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Attachments({ taskId, attachments }: { taskId: number; attachments: Attachment[] }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(taskId, file),
    onSuccess: (res) => {
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => t.id === taskId ? { ...t, attachments: [...(t.attachments ?? []), res.data] } : t) ?? []
      );
      setError(null);
    },
    onError: (err: any) => setError(err.response?.data?.detail ?? 'Upload failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAttachment(taskId, id),
    onMutate: async (id: number) => {
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => t.id === taskId ? { ...t, attachments: t.attachments.filter(a => a.id !== id) } : t) ?? []
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_SIZE) { setError('File too large (max 5MB)'); return; }
    if (attachments.length >= MAX_FILES) { setError(`Max ${MAX_FILES} files per task`); return; }
    uploadMutation.mutate(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={styles.section}>
      {attachments.map(a => (
        <div key={a.id} className={styles.row}>
          <Paperclip size={12} />
          <a href={a.url} target="_blank" rel="noreferrer" className={styles.name}>{a.filename}</a>
          <span className={styles.size}>{formatSize(a.size)}</span>
          <a href={a.url} download={a.filename} className={styles.iconBtn}><Download size={12} /></a>
          <button className={styles.iconBtn} onClick={() => deleteMutation.mutate(a.id)}><Trash2 size={12} /></button>
        </div>
      ))}
      {error && <p className={styles.error}>{error}</p>}
      {attachments.length < MAX_FILES && (
        <button className={styles.addBtn} onClick={() => inputRef.current?.click()} disabled={uploadMutation.isPending}>
          <Upload size={12} /> {uploadMutation.isPending ? 'Uploading...' : 'Attach file'}
        </button>
      )}
      <input ref={inputRef} type="file" hidden onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  );
}