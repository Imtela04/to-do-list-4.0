// taskcard.tsx — full replacement
import { useState, useEffect, useRef } from 'react';
import { format, isPast, isToday, addDays } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { useCategoriesQuery } from '@/hooks/useCategoriesQuery';
import { toggleTask, deleteTask, updateTask as updateTaskApi, createSubtask, updateSubtask, deleteSubtask } from '@/api/services';
import type { Task, TaskPayload, XpResult } from '@/types';
import styles from './taskcard.module.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Pin, PinOff, Trash, SquarePen, CalendarPlus, Hourglass, Plus, Check } from 'lucide-react';

const PRIORITY_MAP: Record<string, { color: string; label: string }> = {
  low:      { color: 'var(--priority-low)',      label: 'Low'      },
  medium:   { color: 'var(--priority-medium)',   label: 'Medium'   },
  high:     { color: 'var(--priority-high)',     label: 'High'     },
  critical: { color: 'var(--priority-critical)', label: 'Critical' },
};

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const SUBTASK_LIMIT = 10;

interface ToggleMutationVars { completed: boolean; }
interface UpdateMutationVars { changes: Partial<TaskPayload>; updated: Task; }
interface MutationContext    { previous: Task[] | undefined; }
interface EditForm {
  title: string; description: string; priority: string;
  category: string; deadline: Date | null; timed: boolean;
}

function useCountdown(deadline: string | null, timed: boolean): string | null {
  const [remaining, setRemaining] = useState<string | null>('');
  useEffect(() => {
    if (!deadline) return;
    const calc = () => {
      const due = new Date(deadline);
      const now = new Date();
      if (!timed) {
        const dueDay   = new Date(due.getFullYear(), due.getMonth(), due.getDate());
        const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
        if (diffDays < 0)         { setRemaining(null); return; }
        else if (diffDays === 0)  setRemaining('due today');
        else if (diffDays === 1)  setRemaining('due tomorrow');
        else if (diffDays >= 730) setRemaining(`due in ${Math.floor(diffDays / 365)}y`);
        else if (diffDays >= 365) setRemaining('due next year');
        else if (diffDays >= 60)  setRemaining(`due in ${Math.floor(diffDays / 30)}m`);
        else if (diffDays >= 30)  setRemaining('due next month');
        else if (diffDays >= 14)  setRemaining(`due in ${Math.floor(diffDays / 7)}w`);
        else if (diffDays >= 7)   setRemaining('due next week');
        else                      setRemaining(`${diffDays}d`);
        return;
      }
      const diff = due.getTime() - now.getTime();
      if (diff <= 0) { setRemaining(null); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0)      setRemaining(`${d}d ${h}h ${m}m`);
      else if (h > 0) setRemaining(`${h}h ${m}m ${s}s`);
      else            setRemaining(`${m}m ${s}s`);
    };
    calc();
    const id = setInterval(calc, timed ? 1000 : 60000);
    return () => clearInterval(id);
  }, [deadline, timed]);
  return remaining;
}

export default function TaskCard({ task }: { task: Task; index: number }) {
  const queryClient = useQueryClient();
  const updateXp    = useAppStore(s => s.updateXp);
  const { data: categories = [] } = useCategoriesQuery();

  const [deleting, setDeleting]                   = useState(false);
  const [editing, setEditing]                     = useState(false);
  const [expanded, setExpanded]                   = useState(false);
  const [confirmDelete, setConfirmDelete]         = useState(false);
  const [confirmUncomplete, setConfirmUncomplete] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle]     = useState('');
  const [addingSubtask, setAddingSubtask]         = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    title: '', description: '', priority: '', category: '', deadline: null, timed: false,
  });

  const cardRef        = useRef<HTMLDivElement>(null);
  const clickTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  const subtasks       = task.subtasks ?? [];
  const completedCount = subtasks.filter(s => s.completed).length;
  const hasSubtasks    = subtasks.length > 0;
  const atSubtaskLimit = subtasks.length >= SUBTASK_LIMIT;
  const allDone        = hasSubtasks && completedCount === subtasks.length;

  const category   = task.category;
  const priority   = PRIORITY_MAP[task.priority] ?? PRIORITY_MAP.low;
  const dueDate    = task.deadline ? new Date(task.deadline) : null;
  const isDueToday = dueDate ? isToday(dueDate) : false;
  const isTimed    = dueDate ? !(dueDate.getHours() === 23 && dueDate.getMinutes() === 59) : false;
  const isOverdue  = dueDate && !task.completed
    ? (isTimed ? isPast(dueDate) : isPast(dueDate) && !isToday(dueDate))
    : false;
  const countdown  = useCountdown(task.deadline, isTimed);

  useEffect(() => {
    if (addingSubtask) subtaskInputRef.current?.focus();
  }, [addingSubtask]);

  // ── Outside click collapse ─────────────────────────────────
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) setExpanded(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded]);

  // ── Optimistic helpers ─────────────────────────────────────
  const optimisticUpdate = (updated: Task) =>
    queryClient.setQueryData<Task[]>(['tasks'], old =>
      old?.map(t => t.id === updated.id ? updated : t) ?? []
    );

  const rollback = (ctx: MutationContext) =>
    queryClient.setQueryData(['tasks'], ctx.previous);

  const handleXpResult = (data: { xp_result?: XpResult }) => {
    if (data.xp_result) updateXp(data.xp_result);
  };

  // ── Mutations ──────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: ({ completed }: ToggleMutationVars) =>
      toggleTask(task.id, completed, completed ? false : task.pinned),
    onMutate: async ({ completed }: ToggleMutationVars) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData<Task[]>(['tasks']);
      optimisticUpdate({
        ...task, completed,
        pinned:   completed ? false : task.pinned,
        subtasks: subtasks.map(s => ({ ...s, completed })),
      });
      return { previous };
    },
    onSuccess: (res) => handleXpResult(res.data),
    onError:   (_e: Error, _v: ToggleMutationVars, ctx: MutationContext | undefined) => { if (ctx) rollback(ctx); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ changes }: UpdateMutationVars) => updateTaskApi(task.id, changes),
    onMutate: async ({ updated }: UpdateMutationVars) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData<Task[]>(['tasks']);
      optimisticUpdate(updated);
      return { previous };
    },
    onError:   (_e: Error, _v: UpdateMutationVars, ctx: MutationContext | undefined) => { if (ctx) rollback(ctx); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(task.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData<Task[]>(['tasks']);
      queryClient.setQueryData<Task[]>(['tasks'], old => old?.filter(t => t.id !== task.id) ?? []);
      return { previous };
    },
    onError:   (_e: Error, _v: void, ctx: MutationContext | undefined) => { if (ctx) rollback(ctx); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const addSubtaskMutation = useMutation({
    mutationFn: (title: string) => createSubtask(task.id, { title }),
    onSuccess: (res) => {
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => t.id === task.id
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
      updateSubtask(task.id, subtaskId, { completed }),
    onMutate: async ({ subtaskId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData<Task[]>(['tasks']);
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => t.id === task.id
          ? { ...t, subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, completed } : s) }
          : t) ?? []
      );
      return { previous };
    },
    onSuccess: (res) => {
      optimisticUpdate(res.data as unknown as Task);
      handleXpResult(res.data as unknown as { xp_result?: XpResult });
    },
    onError:   (_e: Error, _v: unknown, ctx: MutationContext | undefined) => { if (ctx) rollback(ctx); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: (subtaskId: number) => deleteSubtask(task.id, subtaskId),
    onMutate: async (subtaskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData<Task[]>(['tasks']);
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => t.id === task.id
          ? { ...t, subtasks: t.subtasks.filter(s => s.id !== subtaskId) }
          : t) ?? []
      );
      return { previous };
    },
    onSuccess: (res) => {
      optimisticUpdate(res.data as unknown as Task);
      handleXpResult(res.data as unknown as { xp_result?: XpResult });
    },
    onError:   (_e: Error, _v: unknown, ctx: MutationContext | undefined) => { if (ctx) rollback(ctx); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  // ── Handlers ───────────────────────────────────────────────
  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, select')) return;
    if (editing) return;
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      setExpanded(false);
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        setExpanded(prev => !prev);
      }, 220);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!task.completed) toggleMutation.mutate({ completed: true });
    else setConfirmUncomplete(true);
  };

  const handleConfirmUncomplete = () => {
    setConfirmUncomplete(false);
    toggleMutation.mutate({ completed: false });
  };

  const handleDelete = () => {
    setDeleting(true);
    setTimeout(() => deleteMutation.mutate(), 300);
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateMutation.mutate({
      changes: { pinned: !task.pinned },
      updated: { ...task, pinned: !task.pinned },
    });
  };

  const handleMoveToNextDay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(23, 59, 0, 0);
    updateMutation.mutate({
      changes: { deadline: tomorrow.toISOString() },
      updated: { ...task, deadline: tomorrow.toISOString() },
    });
  };

  const openEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    const existingDeadline = task.deadline ? new Date(task.deadline) : null;
    setEditForm({
      title:       task.title,
      description: task.description ?? '',
      priority:    task.priority,
      category:    task.category?.id?.toString() ?? '',
      deadline:    existingDeadline,
      timed:       existingDeadline
        ? !(existingDeadline.getHours() === 23 && existingDeadline.getMinutes() === 59)
        : false,
    });
    setExpanded(true);
    setEditing(true);
  };

  const handleSave = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const changes: Partial<TaskPayload> = {};
    if (editForm.title?.trim())       changes.title       = editForm.title.trim();
    if (editForm.description?.trim()) changes.description = editForm.description.trim();
    if (editForm.priority)            changes.priority    = editForm.priority as TaskPayload['priority'];
    if (editForm.category)            changes.category    = parseInt(editForm.category);
    if (editForm.deadline) {
      const d = new Date(editForm.deadline);
      if (!editForm.timed) d.setHours(23, 59, 0, 0);
      changes.deadline = d.toISOString();
    }
    if (Object.keys(changes).length > 0) {
      const updated: Task = {
        ...task, ...changes,
        category: editForm.category
          ? (categories.find(c => c.id === parseInt(editForm.category)) ?? task.category)
          : task.category,
      };
      updateMutation.mutate({ changes, updated });
    }
    setEditing(false);
  };

  const handleAddSubtask = () => {
    const title = newSubtaskTitle.trim();
    if (!title || atSubtaskLimit) return;
    addSubtaskMutation.mutate(title);
  };

  const set = <K extends keyof EditForm>(key: K, val: EditForm[K]) =>
    setEditForm(f => ({ ...f, [key]: val }));

  // ── Render ─────────────────────────────────────────────────
  return (
    <div
      ref={cardRef}
      className={[
        styles.card,
        task.completed ? styles.completed : '',
        deleting       ? styles.deleting  : '',
        expanded       ? styles.expanded  : '',
      ].join(' ')}
      onClick={handleCardClick}
    >
      {/* Pin indicator */}
      {task.pinned && <span className={styles.pinnedBadge}><Pin size={11} /></span>}

      {/* Toggle */}
      <button className={styles.toggle} onClick={handleToggle}>
        {task.completed
          ? <Check size={12} strokeWidth={3} />
          : <span className={styles.activeDot} />}
      </button>

      {/* Main content */}
      <div className={styles.body}>

        {/* ── Collapsed view ── */}
        {!editing && (
          <div className={styles.collapsed}>
            <p
              className={`${styles.title} ${task.completed ? styles.strikethrough : ''}`}
              style={{ color: priority.color }}
            >
              {task.title}
            </p>

            <div className={styles.meta}>
              {dueDate && !task.completed && (
                <span className={`${styles.countdown} ${isOverdue ? styles.overdue : ''}`}>
                  <Hourglass size={10} />
                  {isOverdue ? `overdue · ${format(dueDate, 'MMM d')}` : countdown}
                </span>
              )}
              {hasSubtasks && (
                <span className={styles.subtaskBadge}>
                  {completedCount}/{subtasks.length}
                </span>
              )}
            </div>

            {hasSubtasks && (
              <div className={styles.progressBar}>
                <div
                  className={`${styles.progressFill} ${allDone ? styles.progressDone : ''}`}
                  style={{ width: `${(completedCount / subtasks.length) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Edit form ── */}
        {editing && (
          <div className={styles.editForm}>
            <input
              autoFocus
              className={styles.editInput}
              placeholder={task.title}
              value={editForm.title}
              onChange={e => set('title', e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
            />
            <textarea
              className={styles.editInput}
              placeholder={task.description || 'Description'}
              value={editForm.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
            />
            <div className={styles.priorities}>
              {PRIORITIES.map(p => (
                <button
                  key={p}
                  className={`${styles.prioBtn} ${editForm.priority === p ? styles.prioActive : ''}`}
                  style={{ borderColor: editForm.priority === p ? PRIORITY_MAP[p].color : 'transparent' }}
                  onClick={() => set('priority', p)}
                >
                  {p}
                </button>
              ))}
            </div>
            <select className={styles.editInput} value={editForm.category} onChange={e => set('category', e.target.value)}>
              <option value="">Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <div className={styles.dateTimeRow}>
              <DatePicker
                selected={editForm.deadline}
                onChange={(date: Date | null) => {
                  if (!date) { set('deadline', null); set('timed', false); return; }
                  date.setHours(23, 59, 0, 0);
                  set('deadline', date);
                  set('timed', false);
                }}
                placeholderText="Set date"
                dateFormat="MMM d, yyyy"
                className={styles.editInput}
                popperPlacement="top-start"
              />
              {editForm.deadline && (
                <DatePicker
                  selected={editForm.timed ? editForm.deadline : null}
                  onChange={(time: Date | null) => {
                    if (!time) {
                      const d = new Date(editForm.deadline!);
                      d.setHours(23, 59, 0, 0);
                      setEditForm(f => ({ ...f, deadline: d, timed: false }));
                      return;
                    }
                    const d = new Date(editForm.deadline!);
                    d.setHours(time.getHours(), time.getMinutes(), 0, 0);
                    setEditForm(f => ({ ...f, deadline: d, timed: true }));
                  }}
                  placeholderText="+ time"
                  showTimeSelect showTimeSelectOnly
                  timeFormat="HH:mm" timeIntervals={15}
                  dateFormat="h:mm aa"
                  className={styles.editInput}
                  isClearable
                />
              )}
            </div>
            <div className={styles.editActions}>
              <button className={styles.cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
              <button className={styles.saveBtn} onClick={handleSave}>Save</button>
            </div>
          </div>
        )}

        {/* ── Expanded details ── */}
        {expanded && !editing && (
          <div className={styles.expandedDetails} onClick={e => e.stopPropagation()}>
            <div className={styles.detailChips}>
              {category && (
                <span className={styles.chip}>{category.icon} {category.name}</span>
              )}
              {task.priority && (
                <span className={styles.chip} style={{ color: priority.color }}>
                  {priority.label}
                </span>
              )}
              {dueDate && (
                <span className={`${styles.chip} ${isOverdue ? styles.chipOverdue : isDueToday ? styles.chipToday : ''}`}>
                  📅 {format(dueDate, 'MMM d, yyyy')}
                  {isTimed ? ` · ${format(dueDate, 'h:mm aa')}` : ''}
                </span>
              )}
            </div>

            {task.description && (
              <p className={styles.description}>📝 {task.description}</p>
            )}

            {/* Subtasks */}
            <div className={styles.subtaskSection}>
              {subtasks.map(subtask => (
                <div key={subtask.id} className={styles.subtaskRow}>
                  <button
                    className={`${styles.subtaskCheck} ${subtask.completed ? styles.subtaskChecked : ''}`}
                    onClick={() => toggleSubtaskMutation.mutate({
                      subtaskId: subtask.id,
                      completed: !subtask.completed,
                    })}
                  >
                    {subtask.completed && <Check size={9} strokeWidth={3} />}
                  </button>
                  <span className={`${styles.subtaskLabel} ${subtask.completed ? styles.strikethrough : ''}`}>
                    {subtask.title}
                  </span>
                  <button
                    className={styles.subtaskDel}
                    onClick={() => deleteSubtaskMutation.mutate(subtask.id)}
                  >
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

              {atSubtaskLimit && (
                <p className={styles.subtaskLimit}>max {SUBTASK_LIMIT} subtasks</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className={`${styles.actions} ${expanded ? styles.actionsVisible : ''}`}>
        <button className={`${styles.actionBtn} ${task.pinned ? styles.pinned : ''}`} onClick={handlePin} title={task.pinned ? 'Unpin' : 'Pin'}>
          {task.pinned ? <PinOff size={13} /> : <Pin size={13} />}
        </button>
        {isOverdue && (
          <button className={`${styles.actionBtn} ${styles.nextDay}`} onClick={handleMoveToNextDay} title="Move to tomorrow">
            <CalendarPlus size={13} />
          </button>
        )}
        <button className={styles.actionBtn} onClick={editing ? handleSave : openEdit} title={editing ? 'Save' : 'Edit'}>
          <SquarePen size={13} />
        </button>
        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}>
          <Trash size={13} />
        </button>
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className={styles.overlay}>
          <p className={styles.overlayText}>Delete this task?</p>
          <div className={styles.overlayActions}>
            <button className={styles.cancelBtn} onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button className={styles.deleteConfirmBtn} onClick={() => { setConfirmDelete(false); handleDelete(); }}>Delete</button>
          </div>
        </div>
      )}

      {/* Confirm uncomplete */}
      {confirmUncomplete && (
        <div className={styles.overlay}>
          <p className={styles.overlayText}>Mark incomplete? You'll lose 5 XP.</p>
          <div className={styles.overlayActions}>
            <button className={styles.cancelBtn} onClick={() => setConfirmUncomplete(false)}>Cancel</button>
            <button className={styles.deleteConfirmBtn} onClick={handleConfirmUncomplete}>Confirm</button>
          </div>
        </div>
      )}
    </div>
  );
}