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
import { Pin, PinOff, Trash, SquarePen, CalendarPlus, Hourglass, Plus, Check, GitBranch } from 'lucide-react';

const PRIORITY_MAP: Record<string, { color: string; label: string }> = {
  low:      { color: 'var(--priority-low)',      label: 'Low'      },
  medium:   { color: 'var(--priority-medium)',   label: 'Medium'   },
  high:     { color: 'var(--priority-high)',     label: 'High'     },
  critical: { color: 'var(--priority-critical)', label: 'Critical' },
};

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const SUBTASK_LIMIT = 10;

interface ToggleMutationVars  { completed: boolean; }
interface UpdateMutationVars  { changes: Partial<TaskPayload>; updated: Task; }
interface MutationContext     { previous: Task[] | undefined; }

interface EditForm {
  title:       string;
  description: string;
  priority:    string;
  category:    string;
  deadline:    Date | null;
  timed:       boolean;
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

interface TaskCardProps {
  task:  Task;
  index: number;
}

export default function TaskCard({ task }: TaskCardProps) {
  const queryClient = useQueryClient();
  const updateXp    = useAppStore(s => s.updateXp);
  const { data: categories = [] } = useCategoriesQuery();

  const [deleting, setDeleting]                   = useState(false);
  const [editing, setEditing]                     = useState(false);
  const [expanded, setExpanded]                   = useState(false);
  const [confirmDelete, setConfirmDelete]         = useState(false);
  const [confirmUncomplete, setConfirmUncomplete] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    title: '', description: '', priority: '', category: '', deadline: null, timed: false,
  });

  // ── Subtask state ──────────────────────────────────────────
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [addingSubtask, setAddingSubtask]     = useState(false);
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  const cardRef    = useRef<HTMLDivElement>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const category   = task.category;
  const priority   = PRIORITY_MAP[task.priority] ?? PRIORITY_MAP.low;
  const dueDate    = task.deadline ? new Date(task.deadline) : null;
  const isDueToday = dueDate ? isToday(dueDate) : false;
  const isTimed    = dueDate ? !(dueDate.getHours() === 23 && dueDate.getMinutes() === 59) : false;
  const isOverdue  = dueDate && !task.completed
    ? (isTimed ? isPast(dueDate) : isPast(dueDate) && !isToday(dueDate))
    : false;

  const countdown       = useCountdown(task.deadline, isTimed);
  const subtasks        = task.subtasks ?? [];
  const completedCount  = subtasks.filter(s => s.completed).length;
  const hasSubtasks     = subtasks.length > 0;
  const atSubtaskLimit  = subtasks.length >= SUBTASK_LIMIT;

  useEffect(() => {
    if (addingSubtask) subtaskInputRef.current?.focus();
  }, [addingSubtask]);

  // ── Optimistic helpers ─────────────────────────────────────
  const optimisticUpdate = (updatedTask: Task): void => {
    queryClient.setQueryData<Task[]>(['tasks'], old =>
      old?.map(t => t.id === updatedTask.id ? updatedTask : t) ?? []
    );
  };

  const rollback = (ctx: MutationContext): void => {
    queryClient.setQueryData(['tasks'], ctx.previous);
  };

  // helper — apply xp_result from subtask responses
  const handleXpResult = (data: { xp_result?: XpResult }): void => {
    if (data.xp_result) updateXp(data.xp_result);
  };

  // ── Task mutations ─────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: ({ completed }: ToggleMutationVars) =>
      toggleTask(task.id, completed, completed ? false : task.pinned),
    onMutate: async ({ completed }: ToggleMutationVars) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData<Task[]>(['tasks']);
      optimisticUpdate({
        ...task,
        completed,
        pinned:   completed ? false : task.pinned,
        subtasks: completed
          ? subtasks.map(s => ({ ...s, completed: true }))
          : subtasks.map(s => ({ ...s, completed: false })),
      });
      return { previous };
    },
    onSuccess: (res) => { handleXpResult(res.data); },
    onError:   (_err: Error, _vars: ToggleMutationVars, ctx: MutationContext | undefined) => { if (ctx) rollback(ctx); },
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
    onError:   (_err: Error, _vars: UpdateMutationVars, ctx: MutationContext | undefined) => { if (ctx) rollback(ctx); },
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
    onError:   (_err: Error, _vars: void, ctx: MutationContext | undefined) => { if (ctx) rollback(ctx); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  // ── Subtask mutations ──────────────────────────────────────
  const addSubtaskMutation = useMutation({
    mutationFn: (title: string) => createSubtask(task.id, { title }),
    onSuccess: (res) => {
      // backend returns new subtask, merge into cache
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => t.id === task.id
          ? { ...t, subtasks: [...(t.subtasks ?? []), res.data] }
          : t
        ) ?? []
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
      // optimistically update the subtask
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => t.id === task.id
          ? { ...t, subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, completed } : s) }
          : t
        ) ?? []
      );
      return { previous };
    },
    onSuccess: (res) => {
      // backend returns full updated parent task with new completion state + xp
      const updatedTask: Task = res.data as unknown as Task;
      optimisticUpdate(updatedTask);
      handleXpResult(res.data as unknown as { xp_result?: XpResult });
    },
    onError:   (_err: Error, _vars: unknown, ctx: MutationContext | undefined) => { if (ctx) rollback(ctx); },
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
          : t
        ) ?? []
      );
      return { previous };
    },
    onSuccess: (res) => {
      const updatedTask: Task = res.data as unknown as Task;
      optimisticUpdate(updatedTask);
      handleXpResult(res.data as unknown as { xp_result?: XpResult });
    },
    onError:   (_err: Error, _vars: unknown, ctx: MutationContext | undefined) => { if (ctx) rollback(ctx); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  // ── Handlers ───────────────────────────────────────────────
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) setExpanded(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded]);

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>): void => {
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

  const handleMoveToNextDay = (e: React.MouseEvent): void => {
    e.stopPropagation();
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(23, 59, 0, 0);
    updateMutation.mutate({
      changes: { deadline: tomorrow.toISOString() },
      updated: { ...task, deadline: tomorrow.toISOString() },
    });
  };

  const handleToggle = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (!task.completed) toggleMutation.mutate({ completed: true });
    else setConfirmUncomplete(true);
  };

  const handleConfirmUncomplete = (): void => {
    setConfirmUncomplete(false);
    toggleMutation.mutate({ completed: false });
  };

  const handleDelete = (): void => {
    setDeleting(true);
    setTimeout(() => deleteMutation.mutate(), 300);
  };

  const handlePin = (e: React.MouseEvent): void => {
    e.stopPropagation();
    updateMutation.mutate({
      changes: { pinned: !task.pinned },
      updated: { ...task, pinned: !task.pinned },
    });
  };

  const openEdit = (e: React.MouseEvent): void => {
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

  const handleSave = (e?: React.MouseEvent): void => {
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
        ...task,
        ...changes,
        category: editForm.category
          ? (categories.find(c => c.id === parseInt(editForm.category)) ?? task.category)
          : task.category,
      };
      updateMutation.mutate({ changes, updated });
    }
    setEditing(false);
  };

  const handleAddSubtask = (): void => {
    const title = newSubtaskTitle.trim();
    if (!title || atSubtaskLimit) return;
    addSubtaskMutation.mutate(title);
  };

  const set = <K extends keyof EditForm>(key: K, val: EditForm[K]): void =>
    setEditForm(f => ({ ...f, [key]: val }));

  return (
    <div
      ref={cardRef}
      className={`${styles.card} ${task.completed ? styles.completed : ''} ${deleting ? styles.deleting : ''} ${expanded ? styles.cardExpanded : ''}`}
      onClick={handleCardClick}
    >
      {task.pinned && <span className={styles.pinnedBadge}><Pin size={13} /></span>}
      <div className={styles.left}>
        <button className={styles.toggle} onClick={handleToggle}>
          {task.completed ? '✓' : <span className={styles.activeDot} />}
        </button>
      </div>

      <div className={`${styles.body} ${expanded ? styles.bodyExpanded : ''}`}>
        {editing ? (
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
            <select
              className={styles.editInput}
              value={editForm.category}
              onChange={e => set('category', e.target.value)}
            >
              <option value="">Category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
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
                  showTimeSelect
                  showTimeSelectOnly
                  timeFormat="HH:mm"
                  timeIntervals={15}
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
        ) : (
          <>
            <div className={`styles.mainContent  ${task.completed ? styles.completed : ''}`}>
              <p
                className={`${styles.title} ${task.completed ? styles.strikethrough : ''}`}
                style={{ color: task.priority ? priority.color : 'inherit' }}
              >
                {task.title}
              </p>

              {/* subtask progress pill — always visible when subtasks exist */}
              {hasSubtasks && (
                
                <div className={styles.subtaskProgress}>
                  <div className={styles.taskProgressBar}>
                    <div
                      className={styles.taskProgressBarFill}
                      style={{ width: `${(completedCount / subtasks.length) * 100}%` }}
                    />
                  </div>
                  <span className={styles.subtaskCount}>
                    {completedCount}/{subtasks.length}
                  </span>
                  <div className={styles.subtaskBar}>
                    <div
                      className={styles.subtaskBarFill}
                      style={{ width: `${(completedCount / subtasks.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {dueDate && !task.completed && (
                <div className={`${styles.countdown} ${isOverdue ? styles.countdownOverdue : ''}`}>
                  <Hourglass size={11} />
                  {isOverdue ? `Overdue · ${format(dueDate, 'MMM d')}` : countdown}
                </div>
              )}

              {/* expanded details */}
              <div className={`${styles.tooltip} ${expanded ? styles.tooltipExpanded : ''}`}>
                {category && <span>{category.icon} {category.name}</span>}
                {task.priority && <span>🎯 {priority.label}</span>}
                {dueDate && (
                  <span className={isOverdue ? styles.overdue : isDueToday ? styles.today : ''}>
                    📅 {format(dueDate, 'MMM d, yyyy')}
                    {dueDate.getHours() !== 0 || dueDate.getMinutes() !== 0
                      ? ` · ${format(dueDate, 'h:mm aa')}`
                      : ''}
                  </span>
                )}
                {task.description && <span>📝 {task.description}</span>}
              </div>
            </div>

            {expanded && (
              <div className={styles.subtaskPanel} onClick={e => e.stopPropagation()}>
                <div className={styles.subtaskPanelHeader}
                  style={{ color: task.priority ? priority.color : 'inherit' }}>
                    <GitBranch/>
                </div>
                <div className={styles.subtaskList}>
                  {subtasks.map(subtask => (
                    <div key={subtask.id} className={styles.subtaskItem}>
                      <button
                        className={`${styles.subtaskToggle} ${subtask.completed ? styles.subtaskDone : ''}`}
                        onClick={() => toggleSubtaskMutation.mutate({
                          subtaskId: subtask.id,
                          completed: !subtask.completed,
                        })}
                      >
                        {subtask.completed ? <Check size={10} /> : null}
                      </button>
                      <span className={`${styles.subtaskTitle} ${subtask.completed ? styles.strikethrough : ''}`}>
                        {subtask.title}
                      </span>
                      <button
                        className={styles.subtaskDelete}
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
                          placeholder="Subtask title..."
                          value={newSubtaskTitle}
                          onChange={e => setNewSubtaskTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddSubtask();
                            if (e.key === 'Escape') { setAddingSubtask(false); setNewSubtaskTitle(''); }
                          }}
                        />
                        <button className={styles.subtaskConfirm} onClick={handleAddSubtask}>
                          <Check size={12} />
                        </button>
                        <button className={styles.subtaskCancel} onClick={() => { setAddingSubtask(false); setNewSubtaskTitle(''); }}>
                          ×
                        </button>
                      </div>
                    ) : (
                      <button
                        className={styles.subtaskAddBtn}
                        onClick={() => setAddingSubtask(true)}
                      >
                        <Plus size={11} /> add subtask
                      </button>
                    )
                  )}
                  {atSubtaskLimit && (
                    <p className={ styles.subtaskLimit}>Max subtasks limit reached</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className={`${styles.actions} ${expanded ? styles.actionsVisible : ''}`}>
        <button
          className={`${styles.actionBtn} ${task.pinned ? styles.pinned : ''}`}
          onClick={handlePin}
          title={task.pinned ? 'Unpin' : 'Pin'}
        >
          {task.pinned ? <PinOff size={14} /> : <Pin size={14} />}
        </button>
        {isOverdue && (
          <button className={`${styles.actionBtn} ${styles.nextDayBtn}`} onClick={handleMoveToNextDay} title="Move to tomorrow">
            <CalendarPlus size={14} />
          </button>
        )}
        <button className={styles.actionBtn} onClick={editing ? handleSave : openEdit} title={editing ? 'Save' : 'Edit'}>
          <SquarePen size={14} />
        </button>
        <button
          className={`${styles.actionBtn} ${styles.deleteBtn}`}
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
        >
          <Trash size={14} />
        </button>
      </div>

      {confirmDelete && (
        <div className={styles.confirmOverlay}>
          <p className={styles.confirmText}>Delete this task?</p>
          <div className={styles.confirmActions}>
            <button className={styles.confirmCancel} onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button className={styles.confirmDelete} onClick={() => { setConfirmDelete(false); handleDelete(); }}>Delete</button>
          </div>
        </div>
      )}
      {confirmUncomplete && (
        <div className={styles.confirmOverlay}>
          <p className={styles.confirmText}>Mark as incomplete? You'll lose 5 XP.</p>
          <div className={styles.confirmActions}>
            <button className={styles.confirmCancel} onClick={() => setConfirmUncomplete(false)}>Cancel</button>
            <button className={styles.confirmDelete} onClick={handleConfirmUncomplete}>Confirm</button>
          </div>
        </div>
      )}
    </div>
  );
}