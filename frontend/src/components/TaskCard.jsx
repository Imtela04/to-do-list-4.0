import { useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { useApp } from '../context/AppContext';
import { toggleTask, deleteTask, updateTask } from '../api/services';
import styles from './TaskCard.module.css';

const PRIORITY_MAP = {
  low: { label: 'Low', color: '#6affdc' },
  medium: { label: 'Med', color: '#ffaa6a' },
  high: { label: 'High', color: '#ff6a9e' },
  critical: { label: '!!!', color: '#ff4444' },
};

export default function TaskCard({ task, index }) {
  const { dispatch, state } = useApp();
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const category = state.categories.find(c => c.id === task.category);
  const priority = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !task.completed;
  const isDueToday = dueDate && isToday(dueDate);

  const handleToggle = async () => {
    const updated = { ...task, completed: !task.completed };
    dispatch({ type: 'UPDATE_TASK', payload: updated });
    try { await toggleTask(task.id, !task.completed); } catch { dispatch({ type: 'UPDATE_TASK', payload: task }); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setTimeout(async () => {
      dispatch({ type: 'DELETE_TASK', payload: task.id });
      try { await deleteTask(task.id); } catch { dispatch({ type: 'ADD_TASK', payload: task }); }
    }, 300);
  };

  const handleEdit = async () => {
    if (!editing) return setEditing(true);
    const updated = { ...task, title: editTitle.trim() || task.title };
    dispatch({ type: 'UPDATE_TASK', payload: updated });
    setEditing(false);
    try { await updateTask(task.id, { title: updated.title }); } catch {}
  };

  return (
    <div
      className={`${styles.card} ${task.completed ? styles.completed : ''} ${deleting ? styles.deleting : ''}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className={styles.priorityBar} style={{ background: priority.color }} />

      <button className={`${styles.checkbox} ${task.completed ? styles.checked : ''}`} onClick={handleToggle}>
        {task.completed && (
          <svg viewBox="0 0 16 16" width="12" height="12">
            <polyline points="2,8 6,12 14,4" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className={styles.content}>
        {editing ? (
          <input
            autoFocus
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') setEditing(false); }}
            onBlur={handleEdit}
            className={styles.editInput}
          />
        ) : (
          <span className={styles.title} onDoubleClick={() => setEditing(true)}>{task.title}</span>
        )}

        <div className={styles.meta}>
          {category && (
            <span className={styles.category} style={{ borderColor: category.color, color: category.color }}>
              {category.name}
            </span>
          )}
          <span className={styles.priorityBadge} style={{ color: priority.color }}>
            {priority.label}
          </span>
          {dueDate && (
            <span className={`${styles.due} ${isOverdue ? styles.overdue : ''} ${isDueToday ? styles.dueToday : ''}`}>
              {isOverdue ? '⚠ ' : isDueToday ? '📅 ' : ''}
              {format(dueDate, 'MMM d')}
            </span>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={() => setEditing(!editing)} title="Edit">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11 2l3 3-9 9H2v-3l9-9z" />
          </svg>
        </button>
        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={handleDelete} title="Delete">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 4h12M6 4V2h4v2M5 4v9h6V4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
