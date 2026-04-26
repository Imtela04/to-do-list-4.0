import { useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { useApp } from '@/context/AppContext';
import { toggleTask, deleteTask, updateTask } from '@/api/services';
import styles from './taskcard.module.css';

const PRIORITY_MAP = {
  low:      { color: '#6ab4ff', label: 'Low' },
  medium:   { color: '#6affdc', label: 'Medium' },
  high:     { color: '#ffaa6a', label: 'High' },
  critical: { color: '#ff6a6a', label: 'Critical' },
};

const PRIORITIES = ['low', 'medium', 'high', 'critical'];

export default function TaskCard({ task, index }) {
  const { dispatch, state } = useApp();
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: '',
    category: '',
    deadline: '',
  });

  const category = task.category;
  const priority = PRIORITY_MAP[task.priority] || PRIORITY_MAP.low;
  const dueDate = task.deadline ? new Date(task.deadline) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !task.completed;
  const isDueToday = dueDate && isToday(dueDate);

  const handleToggle = async () => {
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

  const openEdit = () => {
    setEditForm({ title: '', description: '', priority: '', category: '', deadline: '' });
    setEditing(true);
  };

  const handleSave = async () => {
    // only include fields that were actually changed
    const changes = {};
    if (editForm.title.trim())       changes.title = editForm.title.trim();
    if (editForm.description.trim()) changes.description = editForm.description.trim();
    if (editForm.priority)           changes.priority = editForm.priority;
    if (editForm.category)           changes.category = editForm.category;
    if (editForm.deadline)           changes.deadline = editForm.deadline;

    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }

    const updated = {
      ...task,
      ...changes,
      category: editForm.category
        ? state.categories.find(c => c.id === parseInt(editForm.category)) || task.category
        : task.category,
    };
    dispatch({ type: 'UPDATE_TASK', payload: updated });
    setEditing(false);
    try { await updateTask(task.id, changes); } catch {}
  };

  const set = (key, val) => setEditForm(f => ({ ...f, [key]: val }));

  return (
    <div className={`${styles.card} ${task.completed ? styles.completed : ''} ${deleting ? styles.deleting : ''}`}>
      <div className={styles.left}>
        <button className={styles.toggle} onClick={handleToggle}>
          {task.completed ? '✓' : '○'}
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
            <input
              type="date"
              className={styles.editInput}
              value={editForm.deadline}
              onChange={e => set('deadline', e.target.value)}
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
            <div className={styles.tooltip}>
              {category && <span>{category.icon} {category.name}</span>}
              {task.priority && <span>🎯 {priority.label}</span>}
              {dueDate && (
                <span className={isOverdue ? styles.overdue : isDueToday ? styles.today : ''}>
                  📅 {format(dueDate, 'MMM d, yyyy')}
                </span>
              )}
              {task.description && <span>📝 {task.description}</span>}
            </div>
          </>
        )}
      </div>

      <div className={styles.actions}>
        <button className={styles.editBtn} onClick={editing ? handleSave : openEdit}>
          {editing ? '✓' : '✏'}
        </button>
        <button className={styles.deleteBtn} onClick={handleDelete}>✕</button>
      </div>
    </div>
  );
}