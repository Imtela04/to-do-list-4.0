import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { createTask } from '@/api/services';
import styles from './addtask.module.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const PRIORITIES = ['low', 'medium', 'high', 'critical'];

export default function AddTask({ open, setOpen }) {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ 
    title: '', description: '', priority: '', category: '', due_date: null 
  });
  const [loading, setLoading] = useState(false);

  // reset form when opened
  useEffect(() => {
    if (open) setForm({ title: '', description: '', priority: '', category: '', due_date: '' });
  }, [open]);

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const res = await createTask({
        title: form.title,
        description: form.description,
        priority: form.priority,
        category: form.category,
        deadline: form.due_date ? form.due_date.toISOString() : '', // 👈 full ISO, not date-only
      });
      dispatch({ type: 'ADD_TASK', payload: res.data });
      setOpen(false);
    } catch {}
    setLoading(false);
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  if (!open) return null;

  return (
    <div className={`${styles.form} animate-scale-in`}>
      <input
        autoFocus
        className={styles.titleInput}
        placeholder="What do?"
        value={form.title}
        onChange={e => set('title', e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') setOpen(false); }}
      />
      <textarea
        className={styles.descInput}
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
            {state.categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Due Date & Time</label>
          <DatePicker
            selected={form.due_date}
            onChange={date => set('due_date', date)}
            placeholderText="Pick date & time"
            dateFormat="MMM d, yyyy h:mm aa"
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            className={styles.datePicker}
            calendarClassName={styles.calendar}
            popperPlacement="top-start"
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
  );
}