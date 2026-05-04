import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCategoriesQuery } from '@/hooks/useCategoriesQuery';
import { createTask } from '@/api/services';
import { useDraft } from '@/hooks/useDraft';
import type { TaskPayload } from '@/types';
import styles from './addtask.module.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Pickaxe, Trash, Lock } from 'lucide-react';

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const DRAFT_KEY  = 'draft_task';

interface TaskForm {
  title:       string;
  description: string;
  priority:    string;
  category:    string;
  due_date:    Date | null;
  due_time:    Date | null;
  timed:       boolean;
}

interface AddTaskProps {
  open:    boolean;
  setOpen: (open: boolean) => void;
}

export default function AddTask({ open, setOpen }: AddTaskProps) {
  const queryClient = useQueryClient();
  
  const { data: categories = [] } = useCategoriesQuery();
  const { save, load, clear }     = useDraft<TaskForm>(DRAFT_KEY);

  const [form, setForm] = useState<TaskForm>({
    title: '', description: '', priority: '', category: '',
    due_date: null, due_time: null, timed: false,
  });
  const [hasDraft, setHasDraft]     = useState(!!load());
  const [limitError, setLimitError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLimitError(null);
      const draft = load();
      if (draft) {
        setForm({ ...draft, due_date: draft.due_date ? new Date(draft.due_date) : null });
      } else {
        setForm({ title: '', description: '', priority: '', category: '', due_date: null, due_time: null, timed: false });
      }
    }
  }, [open]);

  const set = <K extends keyof TaskForm>(key: K, val: TaskForm[K]): void => {
    setForm(f => {
      const updated = { ...f, [key]: val };
      const isEmpty = !updated.title && !updated.description && !updated.priority && !updated.category && !updated.due_date;
      if (isEmpty) { clear(); setHasDraft(false); }
      else { save({ ...updated, due_date: updated.due_date ?? null }); setHasDraft(true); }
      return updated;
    });
  };

  const addMutation = useMutation({
    mutationFn: (payload: TaskPayload) => createTask(payload),
    onSuccess: (res) => {
      queryClient.setQueryData(['tasks'], (old: unknown[]) => [res.data, ...(old ?? [])]);
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      clear();
      setHasDraft(false);
      setOpen(false);
    },
    onError: (err: { response?: { status: number; data?: { limit_reached?: boolean; detail?: string } } }) => {
      if (err.response?.status === 403 && err.response?.data?.limit_reached) {
        setLimitError(err.response.data.detail ?? 'Limit reached');
      }
    },
  });

  const handleSubmit = (): void => {
    if (!form.title.trim()) return;
    setLimitError(null);

    let deadline = '';
    if (form.due_date) {
      const d = new Date(form.due_date);
      if (form.timed && form.due_time) {
        d.setHours(form.due_time.getHours(), form.due_time.getMinutes(), 0, 0);
      } else {
        d.setHours(23, 59, 0, 0);
      }
      deadline = d.toISOString();
    }

    addMutation.mutate({
      title:       form.title,
      description: form.description,
      priority:    form.priority as TaskPayload['priority'],
      category:    form.category,
      deadline,
    });
  };

  const handleCancel  = (): void => setOpen(false);
  const handleDiscard = (): void => {
    clear(); setHasDraft(false);
    setForm({ title: '', description: '', priority: '', category: '', due_date: null, due_time: null, timed: false });
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className={`${styles.form} animate-scale-in`}>
      {hasDraft && (
        <div className={styles.draftBadge}>
          <span><Pickaxe size={13} /> Draft</span>
          <button className={styles.discardBtn} onClick={handleDiscard}><Trash size={13} /></button>
        </div>
      )}
      {limitError && (
        <div className={styles.limitError}>
          <Lock size={13} />
          <span>{limitError}</span>
        </div>
      )}
      <input
        autoFocus
        className={styles.titleInput}
        placeholder="What do?"
        value={form.title}
        onChange={e => set('title', e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') handleCancel(); }}
      />
      <textarea
        className={styles.titleInput}
        placeholder="Description (optional)"
        value={form.description}
        onChange={e => set('description', e.target.value)}
        rows={2}
      />
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Priority</label>
          <div className={styles.priorities}>
            {PRIORITIES.map(p => (
              <button
                key={p}
                className={`${styles.prioBtn} ${form.priority === p ? styles.prioActive : ''}`}
                data-priority={p}
                onClick={() => set('priority', p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Category</label>
          <select className={styles.select} value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">None</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Due Date</label>
          <DatePicker
            selected={form.due_date}
            onChange={(date: Date | null) => {
              if (!date) { set('due_date', null); set('timed', false); set('due_time', null); return; }
              set('due_date', date);
            }}
            placeholderText="Pick a date"
            dateFormat="MMM d, yyyy"
            className={styles.datePicker}
            popperPlacement="top-start"
          />
        </div>
        {form.due_date && (
          <div className={styles.field}>
            <label className={styles.label}>
              Time <span className={styles.optional}>(optional)</span>
            </label>
            <DatePicker
              selected={form.due_time}
              onChange={(time: Date | null) => { set('due_time', time); set('timed', !!time); }}
              placeholderText="No time set"
              showTimeSelect
              showTimeSelectOnly
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="h:mm aa"
              className={styles.datePicker}
              isClearable
            />
          </div>
        )}
      </div>
      <div className={styles.actions}>
        <button className={styles.cancelBtn} onClick={handleCancel}>Cancel</button>
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={addMutation.isPending || !form.title.trim()}
        >
          {addMutation.isPending ? '...' : 'Add Task'}
        </button>
      </div>
    </div>
  );
}