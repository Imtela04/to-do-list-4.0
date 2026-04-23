import { useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { useApp } from '@/context/AppContext';
import { toggleTask, deleteTask, updateTask } from '@/api/services';
import styles from './taskcard.module.css';
import { SignalLow, SignalMedium, SignalHigh, TriangleAlert } from 'lucide-react';

const PRIORITY_MAP={
  low:{ icon: SignalLow, label:'Low', color: ''},
  medium:{ icon: SignalMedium, label:'Medium', color: ''},
  high:{ icon: SignalHigh, label:'High', color: ''},
  critical:{ icon: TriangleAlert, label:'Critical', color: ''},
}

export default function TaskCard({ task, index }){
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
    <div className={`${styles.card} ${task.completed ? styles.completed : ''} ${deleting ? styles.deleting : ''}`}>
        <div className={styles.left}>
            <button className={styles.toggle} onClick={handleToggle}>
                {task.completed ? '✓' : '○'}
            </button>
        </div>

        <div className={styles.body}>
            {editing ? (
                <input
                    autoFocus
                    className={styles.editInput}
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') setEditing(false); }}
                />
            ) : (
                <p className={`${styles.title} ${task.completed ? styles.strikethrough : ''}`}>
                    {task.title}
                </p>
            )}

            <div className={styles.meta}>
                {category && <span className={styles.category}>{category.icon} {category.name}</span>}
                {dueDate && (
                    <span className={`${styles.due} ${isOverdue ? styles.overdue : ''} ${isDueToday ? styles.today : ''}`}>
                        {isOverdue ? '⚠ ' : '📅 '}{format(dueDate, 'MMM d')}
                    </span>
                )}
                {task.priority && (
                    <span className={styles.priority}>
                        <priority.icon size={14} /> {priority.label}
                    </span>
                )}
            </div>
        </div>

        <div className={styles.actions}>
            <button className={styles.editBtn} onClick={handleEdit}>
                {editing ? '✓' : '✏'}
            </button>
            <button className={styles.deleteBtn} onClick={handleDelete}>✕</button>
        </div>
    </div>
);


}