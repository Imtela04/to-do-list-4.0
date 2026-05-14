// frontend/src/components/tasks/subtask.tsx
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSubtask, updateSubtask, deleteSubtask } from '@/api/services';
import { useAppStore } from '@/store/useAppStore';
import type { Task, Subtask as SubtaskType } from '@/types';
import styles from './subtask.module.css';
import { Plus, Check } from 'lucide-react';

const SUBTASK_LIMIT = 10;

interface Props {
  taskId: number;
  subtasks: SubtaskType[];
  /** When provided, mutations will optimistically update a real task in the cache */
  optimisticUpdate?: (updated: Task) => void;
  rollback?: (ctx: { previous: Task[] | undefined }) => void;
}

export default function Subtask({ taskId, subtasks, optimisticUpdate, rollback }: Props) {
  const queryClient        = useQueryClient();
  const updateXp           = useAppStore(s => s.updateXp);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [addingSubtask, setAddingSubtask]     = useState(false);
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  const atSubtaskLimit = subtasks.length >= SUBTASK_LIMIT;

  useEffect(() => {
    if (addingSubtask) subtaskInputRef.current?.focus();
  }, [addingSubtask]);

  const addSubtaskMutation = useMutation({
    mutationFn: (title: string) => createSubtask(taskId, { title }),
    onSuccess: (res) => {
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => t.id === taskId
          ? { ...t, subtasks: [...(t.subtasks ?? []), res.data] }
          : t) ?? []
      );
      setNewSubtaskTitle('');
      setAddingSubtask(false);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: ({ subtaskId, completed }: { subtaskId: number; completed: boolean }) =>
      updateSubtask(taskId, subtaskId, { completed }),
    onMutate: async ({ subtaskId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData<Task[]>(['tasks']);
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => t.id === taskId
          ? { ...t, subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, completed } : s) }
          : t) ?? []
      );
      return { previous };
    },
    onSuccess: (res) => {
      optimisticUpdate?.(res.data.task);
      if (res.data.xp_result) updateXp(res.data.xp_result);
    },
    onError: (_e, _v, ctx) => { if (ctx) rollback?.(ctx); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: (subtaskId: number) => deleteSubtask(taskId, subtaskId),
    onMutate: async (subtaskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData<Task[]>(['tasks']);
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => t.id === taskId
          ? { ...t, subtasks: t.subtasks.filter(s => s.id !== subtaskId) }
          : t) ?? []
      );
      return { previous };
    },
    onSuccess: (res) => {
      optimisticUpdate?.(res.data.task);
      if (res.data.xp_result) updateXp(res.data.xp_result);
    },
    onError: (_e, _v, ctx) => { if (ctx) rollback?.(ctx); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const handleAddSubtask = () => {
    const title = newSubtaskTitle.trim();
    if (!title || atSubtaskLimit) return;
    addSubtaskMutation.mutate(title);
  };

  return (
    <div className={styles.subtaskSection}>
      {subtasks.map(subtask => (
        <div key={subtask.id} className={styles.subtaskRow}>
          <button
            className={`${styles.subtaskCheck} ${subtask.completed ? styles.subtaskChecked : ''}`}
            onClick={() => toggleSubtaskMutation.mutate({ subtaskId: subtask.id, completed: !subtask.completed })}
          >
            {subtask.completed && <Check size={9} strokeWidth={3} />}
          </button>
          <span className={`${styles.subtaskLabel} ${subtask.completed ? styles.strikethrough : ''}`}>
            {subtask.title}
          </span>
          <button className={styles.subtaskDel} onClick={() => deleteSubtaskMutation.mutate(subtask.id)}>
            ×
          </button>
        </div>
      ))}

      {!atSubtaskLimit && (
        addingSubtask ? (
          <div className={styles.subtaskAddRow}>
            <input
              ref={subtaskInputRef}
              className={styles.subtaskInput}
              placeholder="Add subtask..."
              value={newSubtaskTitle}
              onChange={e => setNewSubtaskTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddSubtask();
                if (e.key === 'Escape') { setAddingSubtask(false); setNewSubtaskTitle(''); }
              }}
            />
            <button className={styles.subtaskConfirm} onClick={handleAddSubtask}>
              <Check size={11} strokeWidth={3} />
            </button>
            <button className={styles.subtaskCancelBtn} onClick={() => { setAddingSubtask(false); setNewSubtaskTitle(''); }}>
              ×
            </button>
          </div>
        ) : (
          <button className={styles.addSubtaskBtn} onClick={() => setAddingSubtask(true)}>
            <Plus size={11} /> add subtask
          </button>
        )
      )}

      {atSubtaskLimit && <p className={styles.subtaskLimit}>max {SUBTASK_LIMIT} subtasks</p>}
    </div>
  );
}