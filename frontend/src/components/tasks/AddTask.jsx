import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { createTask } from '@/api/services';
import { useDraft } from '@/hooks/useDraft';
import styles from './addtask.module.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Pickaxe, AlertTriangle, Trash } from 'lucide-react'
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const DRAFT_KEY  = 'draft_task';

export default function AddTask({ open, setOpen }) {
  const { state, dispatch } = useApp();
  const { save, load, clear } = useDraft(DRAFT_KEY);
  const [form, setForm]       = useState({ title: '', description: '', priority: '', category: '', due_date: null });
  const [loading, setLoading] = useState(false);
  const [hasDraft, setHasDraft] = useState(!!load());

  // Restore draft when opened
  useEffect(() => {
    if (open) {
      const draft = load();
      if (draft) {
        setForm({
          ...draft,
          due_date: draft.due_date ? new Date(draft.due_date) : null,
        });
      } else {
        setForm({ title: '', description: '', priority: '', category: '', due_date: null });
      }
    }
  }, [open]);

  // Auto-save draft as user types
  const set = (key, val) => {
    setForm(f => {
      const updated = { ...f, [key]: val };
      const isEmpty = !updated.title && !updated.description && !updated.priority && !updated.category && !updated.due_date;
      if (isEmpty) { clear(); setHasDraft(false); }
      else         { save({ ...updated, due_date: updated.due_date?.toISOString() ?? null }); setHasDraft(true); }
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const res = await createTask({
        title:       form.title,
        description: form.description,
        priority:    form.priority,
        category:    form.category,
        deadline:    form.due_date ? form.due_date.toISOString() : '',
      });
      dispatch({ type: 'ADD_TASK', payload: res.data });
      clear();
      setHasDraft(false);
      setOpen(false);
    } catch {}
    setLoading(false);
  };

  const handleCancel = () => {
    // keep draft — don't clear on cancel so user doesn't lose work
    setOpen(false);
  };

  const handleDiscard = () => {
    clear();
    setHasDraft(false);
    setForm({ title: '', description: '', priority: '', category: '', due_date: null });
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className={`${styles.form} animate-scale-in`}>
      {hasDraft && (
        <div className={styles.draftBadge}>
          <span><Pickaxe size={15}/> Draft</span>
          <button className={styles.discardBtn} onClick={handleDiscard}><Trash size={15}/></button>
        </div>
      )}
      <input
        autoFocus
        className={styles.titleInput}
        placeholder="What do?"
        value={form.title}
        onChange={e => set('title', e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') handleCancel(); }}
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
        <button className={styles.cancelBtn} onClick={handleCancel}>Cancel</button>
        <button className={styles.submitBtn} onClick={handleSubmit} disabled={loading || !form.title.trim()}>
          {loading ? '...' : 'Add Task'}
        </button>
      </div>
    </div>
  );
}