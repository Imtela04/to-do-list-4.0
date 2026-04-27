import { useState, useEffect, useRef, useCallback } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { useApp } from '@/context/AppContext';
import { toggleTask, deleteTask, updateTask } from '@/api/services';
import styles from './taskcard.module.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Trash, Timer } from 'lucide-react';

const PRIORITY_MAP = {
  low:      { color: '#6ab4ff', label: 'Low' },
  medium:   { color: '#6affdc', label: 'Medium' },
  high:     { color: '#ffaa6a', label: 'High' },
  critical: { color: '#ff6a6a', label: 'Critical' },
};

const PRIORITIES = ['low', 'medium', 'high', 'critical'];

// Countdown hook — ticks every second
function useCountdown(deadline) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!deadline) return;

    const calc = () => {
      const diff = new Date(deadline) - new Date();
      if (diff <= 0) { setRemaining(null); return; } // overdue

      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      if (d > 0)      setRemaining(`${d}d ${h}h ${m}m`);
      else if (h > 0) setRemaining(`${h}h ${m}m ${s}s`);
      else            setRemaining(`${m}m ${s}s`);
    };

    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return remaining;
}

export default function TaskCard({ task }) {
  const { dispatch, state } = useApp();
  const [deleting, setDeleting]           = useState(false);
  const [editing, setEditing]             = useState(false);
  const [expanded, setExpanded]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editForm, setEditForm]           = useState({
    title: '', description: '', priority: '', category: '', deadline: null,
  });

  const cardRef   = useRef(null);
  const countdown = useCountdown(task.deadline);

  const category  = task.category;
  const priority  = PRIORITY_MAP[task.priority] || PRIORITY_MAP.low;
  const dueDate   = task.deadline ? new Date(task.deadline) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !task.completed;
  const isDueToday = dueDate && isToday(dueDate);

  // Collapse on outside click
  useEffect(() => {
    if (!expanded) return;
    const handler = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded]);

  // Single vs double click handling
  const clickTimer = useRef(null);
  const handleCardClick = (e) => {
    // Don't expand if clicking buttons or inputs
    if (e.target.closest('button, input, textarea, select')) return;
    if (editing) return;

    if (clickTimer.current) {
      // Double click — collapse
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

  const handleToggle = async (e) => {
    e.stopPropagation();
    const updated = { ...task, completed: !task.completed };
    dispatch({ type: 'UPDATE_TASK', payload: updated });
    try { await toggleTask(task.id, !task.completed); }
    catch { dispatch({ type: 'UPDATE_TASK', payload: task }); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setTimeout(async () => {
      dispatch({ type: 'DELETE_TASK', payload: task.id });
      try { await deleteTask(task.id); }
      catch { dispatch({ type: 'ADD_TASK', payload: task }); }
    }, 300);
  };

  const openEdit = (e) => {
    e.stopPropagation();
    setEditForm({
      title: '', description: '', priority: '', category: '',
      deadline: task.deadline ? new Date(task.deadline) : null,
    });
    setExpanded(true);
    setEditing(true);
  };

  const handleSave = async (e) => {
    e?.stopPropagation();
    const changes = {};
    if (editForm.title.trim())       changes.title       = editForm.title.trim();
    if (editForm.description.trim()) changes.description = editForm.description.trim();
    if (editForm.priority)           changes.priority    = editForm.priority;
    if (editForm.category)           changes.category    = editForm.category;
    if (editForm.deadline)           changes.deadline    = editForm.deadline.toISOString();

    if (Object.keys(changes).length > 0) {
      const updated = {
        ...task, ...changes,
        category: editForm.category
          ? state.categories.find(c => c.id === parseInt(editForm.category)) || task.category
          : task.category,
      };
      dispatch({ type: 'UPDATE_TASK', payload: updated });
      try { await updateTask(task.id, changes); } catch {}
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
      {/* Toggle button */}
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
              {state.categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
            <DatePicker
              selected={editForm.deadline}
              onChange={date => set('deadline', date)}
              placeholderText={task.deadline ? format(new Date(task.deadline), 'MMM d, yyyy h:mm aa') : 'Set deadline'}
              dateFormat="MMM d, yyyy h:mm aa"
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              className={styles.editInput}
              popperPlacement="top-start"
            />
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

            {/* Countdown — always visible when deadline exists */}
            {dueDate && !task.completed && (
              <div className={`${styles.countdown} ${isOverdue ? styles.countdownOverdue : ''}`}>
                <Timer size={11} />
                {isOverdue
                  ? `Overdue · ${format(dueDate, 'MMM d')}`
                  : countdown}
              </div>
            )}

            {/* Details — shown on expand */}
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
        <button className={styles.editBtn} onClick={editing ? handleSave : openEdit}>
          {editing ? '✓' : '✏'}
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
    </div>
  );
}