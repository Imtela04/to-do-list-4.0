import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCategoriesQuery } from '@/hooks/useCategoriesQuery';
import { createTask,createSubtask } from '@/api/services';
import { useDraft } from '@/hooks/useDraft';
import type { TaskPayload } from '@/types';
import styles from './addtask.module.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Pickaxe, Trash, Lock } from 'lucide-react';
import { useTasksQuery } from '@/hooks/useTasksQuery';
import { useAppStore } from '@/store/useAppStore';
import type { Task } from '@/types';
import ModalShell from '../common/moduleshell';

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
  recurrence: string;
}

type TaskDraft = TaskForm & { subtasks: string[] };
interface AddTaskProps {
  open:    boolean;
  setOpen: (open: boolean) => void;
}

export default function AddTask({ open, setOpen }: AddTaskProps) {
  const queryClient = useQueryClient();
  
  const { data: categories = [] }                  = useCategoriesQuery();
  const { save, load, clear }                      = useDraft<TaskDraft>(DRAFT_KEY);
  const [form, setForm]                            = useState<TaskForm>({title: '', description: '', priority: '', category: '', due_date: null, due_time: null, timed: false, recurrence: '', });
  const [hasDraft, setHasDraft]                    = useState(!!load());
  const [limitError, setLimitError]                = useState<string | null>(null);
  const [pendingSubtasks, setPendingSubtasks]      = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput]            = useState('');
  const isGuest                                    = useAppStore(s=>s.isGuest);
  const { data: tasks = [] }                       = useTasksQuery();
  const setFocusTask                               = useAppStore(s => s.setFocusTask);
  const [duplicateTask, setDuplicateTask]          = useState<Task | null>(null);

  const checkDuplicate = (): void => {
    const match = tasks.find(
      t => t.title.trim().toLowerCase() === form.title.trim().toLowerCase()
    );
    setDuplicateTask(form.title.trim() && match ? match : null);
  };
  const SUBTASK_LIMIT = 10;

  useEffect(() => {
    if (open) {
      setLimitError(null);
      setSubtaskInput('');
      const draft = load();
      if (draft) {
        const { subtasks, ...formFields } = draft;
        setForm({ ...formFields, due_date: formFields.due_date ? new Date(formFields.due_date) : null });
        setPendingSubtasks(subtasks ?? []);
        setHasDraft(true);
      } else {
        setForm({ title: '', description: '', priority: '', category: '', due_date: null, due_time: null, timed: false, recurrence: '' });
        setPendingSubtasks([]);
      }
    }
  }, [open]);

  const persistDraft = (formData: TaskForm, subtasks: string[]): void => {
    const isEmpty = !formData.title && !formData.description && !formData.priority &&
      !formData.category && !formData.due_date && subtasks.length === 0;
    if (isEmpty) { clear(); setHasDraft(false); }
    else { save({ ...formData, due_date: formData.due_date ?? null, subtasks }); setHasDraft(true); }
  };

  const set = <K extends keyof TaskForm>(key: K, val: TaskForm[K]): void => {
    if (key === 'title') setDuplicateTask(null); // add this line
    setForm(f => {
      const updated = { ...f, [key]: val };
      persistDraft(updated, pendingSubtasks);
      return updated;
    });
  };

  const addPendingSubtask = (title: string): void => {
    setPendingSubtasks(prev => {
      const updated = [...prev, title];
      persistDraft(form, updated);
      return updated;
    });
  };

  const removePendingSubtask = (index: number): void => {
    setPendingSubtasks(prev => {
      const updated = prev.filter((_, j) => j !== index);
      persistDraft(form, updated);
      return updated;
    });
  };

  const addMutation = useMutation({
    mutationFn: (payload: TaskPayload) => createTask(payload),
    onSuccess: async (res) => {
      const newTaskId = res.data.id;
      // fire-and-forget subtask creation
      await Promise.all(
        pendingSubtasks.map(title => createSubtask(newTaskId, { title }))
      );
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      clear();
      setHasDraft(false);
      setPendingSubtasks([]);
      setSubtaskInput('');
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
      recurrence: (form.recurrence as TaskPayload['recurrence']) || null,
    });
  };

  const handleCancel  = (): void => setOpen(false);
  const handleDiscard = (): void => {
    clear(); setHasDraft(false);
    setForm({ title: '', description: '', priority: '', category: '', due_date: null, due_time: null, timed: false, recurrence: '' });
    setOpen(false);
    setPendingSubtasks([]);
    setSubtaskInput('');
  };

  if (!open) return null;

  return (
    <ModalShell onClose={handleCancel} maxWidth={560}>
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
        onBlur={checkDuplicate}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') handleCancel(); }}
      />
      {duplicateTask && (
        <div className={styles.duplicateWarning}>
          <span>A task named "{duplicateTask.title}" already exists</span>
          <button
            className={styles.duplicateViewBtn}
            onClick={() => { setFocusTask(duplicateTask.id); setOpen(false); }}
          >
            View existing
          </button>
        </div>
      )}
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
        
        {!isGuest && (
          <div className={styles.field}>
            <label className={styles.label}>Repeat</label>
            <div className={styles.priorities}>
              {(['daily','weekly','monthly','yearly'] as const).map(r => (
                <button
                  key={r}
                  className={`${styles.prioBtn} ${form.recurrence === r ? styles.prioActive : ''}`}
                  onClick={() => {
                    const next = form.recurrence === r ? '' : r;
                    set('recurrence', next);
                    if (next && !form.due_date) set('due_date', new Date());
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

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
      {/* Subtasks */}
      <div className={styles.field}>
        <label className={styles.label}>Subtasks <span className={styles.optional}>({pendingSubtasks.length}/{SUBTASK_LIMIT})</span></label>
        <div className={styles.subtaskList}>
          {pendingSubtasks.map((title, i) => (
            <div key={i} className={styles.subtaskRow}>
              <span className={styles.subtaskLabel}>{title}</span>
              <button
                className={styles.subtaskDel}
                onClick={() => removePendingSubtask(i)}
              >×</button>
            </div>
          ))}
        </div>
        {pendingSubtasks.length < SUBTASK_LIMIT && (
          <div className={styles.subtaskAddRow}>
            <input
              className={styles.subtaskInput}
              placeholder="Add subtask"
              value={subtaskInput}
              onChange={e => setSubtaskInput(e.target.value)}
             onKeyDown={e => {
              if (e.key === 'Enter' && subtaskInput.trim()) {
                addPendingSubtask(subtaskInput.trim());
                setSubtaskInput('');
              }
              if (e.key === 'Escape') setSubtaskInput('');
            }}

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
    </ModalShell>
        
  );
}