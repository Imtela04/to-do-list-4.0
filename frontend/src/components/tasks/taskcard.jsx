import { useState, useEffect, useRef } from 'react';
import { format, isPast, isToday, addDays } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';

import { toggleTask, deleteTask, updateTask as updateTaskApi, getCategories } from '@/api/services';
import styles from './taskcard.module.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Pin, PinOff, Trash, SquarePen, CalendarPlus, Hourglass } from 'lucide-react';

const PRIORITY_MAP = {
  low:      { color: '#6ab4ff', label: 'Low' },
  medium:   { color: '#6affdc', label: 'Medium' },
  high:     { color: '#ffaa6a', label: 'High' },
  critical: { color: '#ff6a6a', label: 'Critical' },
};

const PRIORITIES = ['low', 'medium', 'high', 'critical'];

function useCountdown(deadline, timed) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!deadline) return;

    const calc = () => {
      const due = new Date(deadline);
      const now = new Date();

      if (!timed) {
        const dueDay   = new Date(due.getFullYear(), due.getMonth(), due.getDate());
        const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffDays = Math.round((dueDay - today) / 86400000);

        if (diffDays < 0)        { setRemaining(null); return; }
        else if (diffDays === 0) setRemaining('due today');
        else if (diffDays === 1) setRemaining('due tomorrow');
        else                     setRemaining(`${diffDays}d`);
        return;
      }

      const diff = due - now;
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

export default function TaskCard({ task }) {
  const queryClient = useQueryClient();
  const updateXp    = useAppStore(s => s.updateXp);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn:  async () => {
      const res = await getCategories();
      return res.data;
    },
  });

  const [deleting, setDeleting]           = useState(false);
  const [editing, setEditing]             = useState(false);
  const [expanded, setExpanded]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmUncomplete, setConfirmUncomplete] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '', description: '', priority: '', category: '', deadline: null, timed: false,
  });

  const cardRef    = useRef(null);
  const category   = task.category;
  const priority   = PRIORITY_MAP[task.priority] || PRIORITY_MAP.low;
  const dueDate    = task.deadline ? new Date(task.deadline) : null;
  const isDueToday = dueDate && isToday(dueDate);
  const isTimed    = dueDate && !(dueDate.getHours() === 23 && dueDate.getMinutes() === 59);
  const isOverdue  = dueDate && !task.completed && (
    isTimed ? isPast(dueDate) : isPast(dueDate) && !isToday(dueDate)
  );

  const countdown = useCountdown(task.deadline, isTimed);

  // ── Shared optimistic update helper ───────────────────────
  const optimisticUpdate = (updatedTask) => {
    queryClient.setQueryData(['tasks'], old =>
      old?.map(t => t.id === updatedTask.id ? updatedTask : t) ?? []
    );
  };

  const rollback = (ctx) => {
    queryClient.setQueryData(['tasks'], ctx.previous);
  };

  const makeOptimisticMutation = (mutationFn, getUpdated) => ({
    mutationFn,
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData(['tasks']);
      optimisticUpdate(getUpdated(vars));
      return { previous };
    },
    onError:   (err, vars, ctx) => rollback(ctx),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  // ── Mutations ──────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: ({ completed }) => toggleTask(task.id, completed),
    onMutate: async ({ completed }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData(['tasks']);
      optimisticUpdate({ ...task, completed });
      return { previous };
    },
    onSuccess: (res) => {
      if (res.data.xp_result) updateXp(res.data.xp_result);
    },
    onError:   (err, vars, ctx) => rollback(ctx),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const updateMutation = useMutation(
    makeOptimisticMutation(
      ({ changes }) => updateTaskApi(task.id, changes),
      ({ updated }) => updated,
    )
  );

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(task.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData(['tasks']);
      queryClient.setQueryData(['tasks'], old => old?.filter(t => t.id !== task.id) ?? []);
      return { previous };
    },
    onError:   (err, vars, ctx) => rollback(ctx),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  // ── Handlers ───────────────────────────────────────────────
  useEffect(() => {
    if (!expanded) return;
    const handler = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) setExpanded(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded]);

  const clickTimer = useRef(null);
  const handleCardClick = (e) => {
    if (e.target.closest('button, input, textarea, select')) return;
    if (editing) return;
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      setExpanded(false);
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        setExpanded(e => !e);
      }, 220);
    }
  };

  const handleMoveToNextDay = (e) => {
    e.stopPropagation();
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(23, 59, 0, 0);
    const newDeadline = tomorrow.toISOString();
    updateMutation.mutate({
      changes: { deadline: newDeadline },
      updated: { ...task, deadline: newDeadline },
    });
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!task.completed) {
      toggleMutation.mutate({ completed: true });
    } else {
      setConfirmUncomplete(true);
    }
  };

  const handleConfirmUncomplete = () => {
    setConfirmUncomplete(false);
    toggleMutation.mutate({ completed: false });
  };

  const handleDelete = () => {
    setDeleting(true);
    setTimeout(() => deleteMutation.mutate(), 300);
  };

  const handlePin = (e) => {
    e.stopPropagation();
    updateMutation.mutate({
      changes: { pinned: !task.pinned },
      updated: { ...task, pinned: !task.pinned },
    });
  };

  const openEdit = (e) => {
    e.stopPropagation();
    const existingDeadline = task.deadline ? new Date(task.deadline) : null;
    setEditForm({
      title:       task.title,
      description: task.description || '',
      priority:    task.priority,
      category:    task.category?.id?.toString() || '',
      deadline:    existingDeadline,
      timed: existingDeadline
        ? !(existingDeadline.getHours() === 23 && existingDeadline.getMinutes() === 59)
        : false,
    });
    setExpanded(true);
    setEditing(true);
  };

  const handleSave = (e) => {
    e?.stopPropagation();
    const changes = {};

    if (editForm.title.trim())       changes.title       = editForm.title.trim();
    if (editForm.description.trim()) changes.description = editForm.description.trim();
    if (editForm.priority)           changes.priority    = editForm.priority;
    if (editForm.category)           changes.category    = parseInt(editForm.category);

    if (editForm.deadline) {
      const d = new Date(editForm.deadline);
      if (!editForm.timed) d.setHours(23, 59, 0, 0);
      changes.deadline = d.toISOString();
    }

    if (Object.keys(changes).length > 0) {
      const updated = {
        ...task,
        ...changes,
        category: editForm.category
          ? categories.find(c => c.id === parseInt(editForm.category)) || task.category
          : task.category,
      };
      updateMutation.mutate({ changes, updated });
    }

    setEditing(false);
  };

  const set = (key, val) => setEditForm(f => ({ ...f, [key]: val }));

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

      <div className={styles.body}>
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
              <option value="">Category (unchanged)</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
            <div className={styles.dateTimeRow}>
              <DatePicker
                selected={editForm.deadline}
                onChange={date => {
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
                  onChange={time => {
                    if (!time) {
                      const d = new Date(editForm.deadline);
                      d.setHours(23, 59, 0, 0);
                      setEditForm(f => ({ ...f, deadline: d, timed: false }));
                      return;
                    }
                    const d = new Date(editForm.deadline);
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
            <p
              className={`${styles.title} ${task.completed ? styles.strikethrough : ''}`}
              style={{ color: task.priority ? priority.color : 'inherit' }}
            >
              {task.title}
            </p>
            {dueDate && !task.completed && (
              <div className={`${styles.countdown} ${isOverdue ? styles.countdownOverdue : ''}`}>
                <Hourglass size={11} />
                {isOverdue ? `Overdue · ${format(dueDate, 'MMM d')}` : countdown}
              </div>
            )}
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