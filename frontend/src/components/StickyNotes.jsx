import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { createStickyNote, updateStickyNote, deleteStickyNote } from '../api/services';
import styles from './StickyNotes.module.css';

const NOTE_COLORS = ['#7c6aff', '#ff6a9e', '#6affdc', '#ffaa6a', '#6ab4ff', '#c96aff'];

export default function StickyNotes() {
  const { state, dispatch } = useApp();
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [newColor, setNewColor] = useState(NOTE_COLORS[0]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const handleAdd = async () => {
    if (!newText.trim()) return;
    const note = { id: Date.now(), content: newText, color: newColor, created_at: new Date().toISOString() };
    dispatch({ type: 'ADD_NOTE', payload: note });
    setNewText('');
    setAdding(false);
    try {
      const res = await createStickyNote({ content: newText, color: newColor });
      dispatch({ type: 'UPDATE_NOTE', payload: { ...note, id: res.data.id } });
    } catch {}
  };

  const handleDelete = async (id) => {
    dispatch({ type: 'DELETE_NOTE', payload: id });
    try { await deleteStickyNote(id); } catch {}
  };

  const handleEdit = async (note) => {
    if (editingId === note.id) {
      const updated = { ...note, content: editText };
      dispatch({ type: 'UPDATE_NOTE', payload: updated });
      setEditingId(null);
      try { await updateStickyNote(note.id, { content: editText }); } catch {}
    } else {
      setEditingId(note.id);
      setEditText(note.content);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Sticky Notes</span>
        <button className={styles.addBtn} onClick={() => setAdding(true)}>+</button>
      </div>

      {adding && (
        <div className={`${styles.noteForm} animate-scale-in`}>
          <textarea
            autoFocus
            className={styles.textarea}
            placeholder="Jot something down..."
            value={newText}
            onChange={e => setNewText(e.target.value)}
            rows={3}
          />
          <div className={styles.colorRow}>
            {NOTE_COLORS.map(c => (
              <button
                key={c}
                className={`${styles.colorDot} ${newColor === c ? styles.colorSelected : ''}`}
                style={{ background: c }}
                onClick={() => setNewColor(c)}
              />
            ))}
            <div style={{ flex: 1 }} />
            <button className={styles.cancelBtn} onClick={() => setAdding(false)}>Cancel</button>
            <button className={styles.saveBtn} onClick={handleAdd}>Save</button>
          </div>
        </div>
      )}

      <div className={styles.notes}>
        {state.stickyNotes.length === 0 && !adding && (
          <p className={styles.empty}>No sticky notes yet.</p>
        )}
        {state.stickyNotes.map((note, i) => (
          <div
            key={note.id}
            className={styles.note}
            style={{ '--note-color': note.color, animationDelay: `${i * 50}ms` }}
          >
            <div className={styles.noteAccent} />
            {editingId === note.id ? (
              <textarea
                autoFocus
                className={styles.noteEditArea}
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') setEditingId(null); }}
                rows={3}
              />
            ) : (
              <p className={styles.noteText}>{note.content}</p>
            )}
            <div className={styles.noteActions}>
              <button className={styles.noteBtn} onClick={() => handleEdit(note)}>
                {editingId === note.id ? '✓' : '✏'}
              </button>
              <button className={styles.noteBtn} onClick={() => handleDelete(note.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
