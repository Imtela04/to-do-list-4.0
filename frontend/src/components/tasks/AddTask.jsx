import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { createTask } from '@/api/services';
import styles from './addtask.module.css';

const PRIORITIES = ['low', 'medium', 'high', 'critical'];

export default function AddTask() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', priority: 'medium', category: '', due_date: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    const newTask = {
      ...form,
      id: Date.now(),
      completed: false,
      category: form.category ? parseInt(form.category) : null,
      created_at: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_TASK', payload: newTask });
    setForm({ title: '', priority: 'medium', category: '', due_date: '' });
    setOpen(false);
    try {
      const res = await createTask(form);
      dispatch({ type: 'UPDATE_TASK', payload: { ...newTask, id: res.data.id } });
    } catch {}
    setLoading(false);
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className={styles.wrapper}>
      {!open ? (
        <button className={styles.trigger} onClick={() => setOpen(true)}>
          <span className={styles.plus}>+</span>
          <span>Add a new task</span>
        </button>
      ) : (
        <div className={`${styles.form} animate-scale-in`}>
          <input
            autoFocus
            className={styles.titleInput}
            placeholder="What needs to be done?"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') setOpen(false); }}
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
                {state.categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Due Date</label>
              <input
                type="date"
                className={styles.select}
                value={form.due_date}
                onChange={e => set('due_date', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.cancelBtn} onClick={() => setOpen(false)}>Cancel</button>
            <button className={styles.submitBtn} onClick={handleSubmit} disabled={loading || !form.title.trim()}>
              {loading ? '...' : 'Add Task'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
