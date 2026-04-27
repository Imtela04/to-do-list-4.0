import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { createStickyNote, updateStickyNote, deleteStickyNote } from '@/api/services';
import styles from './stickynote.module.css';
import { Bubbles, Icon } from 'lucide-react';

const NOTE_COLORS = ['#7c6aff', '#ff6a9e', '#6affdc', '#ffaa6a', '#6ab4ff', '#c96aff'];
const ui = {bubbles: Bubbles}
export default function StickyNotes() {
  const { state, dispatch } = useApp();
  const [adding, setAdding] = useState(false);
  const [newColor, setNewColor] = useState(NOTE_COLORS[0]);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const addEditorRef = useRef(null);
  const editEditorRef = useRef(null);

  // clear editor when opening add form
  useEffect(() => {
    if (adding && addEditorRef.current) {
      addEditorRef.current.innerHTML = '';
    }
  }, [adding]);

  // set content when opening edit
  useEffect(() => {
    if (editingId && editEditorRef.current) {
      const note = state.stickyNotes.find(n => n.id === editingId);
      if (note) editEditorRef.current.innerHTML = note.note;
    }
  }, [editingId]);

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const editableDiv = e.currentTarget;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = document.createElement('img');
          img.src = ev.target.result;
          img.style.maxWidth = '100%';
          img.style.display = 'block';
          img.style.borderRadius = '4px';
          img.style.marginTop = '4px';

          const selection = window.getSelection();
          if (selection.rangeCount) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(img);
            range.setStartAfter(img);
            range.setEndAfter(img);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  };

  const handleAdd = async () => {
    const content = addEditorRef.current?.innerHTML || '';
    const hasContent = content.trim() || content.includes('<img');
    if (!hasContent) return;
    setAdding(false);
    try {
      const res = await createStickyNote({ note: content, color: newColor });
      dispatch({ 
        type: 'ADD_NOTE', 
        payload: { ...res.data, color: newColor } // ← force local color
      });
    } catch {}
  };

  const handleSaveEdit = async (note) => {
    const content = editEditorRef.current?.innerHTML || '';
    const updated = { ...note, note: content };
    dispatch({ type: 'UPDATE_NOTE', payload: updated });
    setEditingId(null);
    try { await updateStickyNote(note.id, { note: content }); } catch {}
  };

  const handleDelete = async (id) => {
    dispatch({ type: 'DELETE_NOTE', payload: id });
    try { await deleteStickyNote(id); } catch {}
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Sticky Notes</span>
        <button className={styles.addBtn} onClick={() => setAdding(true)}>+</button>
      </div>

      {adding && (
        <div
          className={`${styles.noteForm} animate-scale-in`}
          style={{ borderLeft: `4px solid ${newColor}` }} // or background: newColor + '22'
        >
          <div
            ref={addEditorRef}
            className={styles.textarea}
            contentEditable
            suppressContentEditableWarning
            onPaste={handlePaste}
            data-placeholder="..."
          />
          <div className={styles.colorRow}>
            {NOTE_COLORS.map(c => (
              <button
                key={c}
                className={`${styles.colorDot} ${newColor === c ? styles.colorSelected : ''}`}
                style={{
                  background: c,
                  outline: newColor === c ? `2px solid white` : 'none', // fallback if CSS module fails
                  transform: newColor === c ? 'scale(1.25)' : 'scale(1)',
                }}
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
            className={`${styles.note} ${expandedId === note.id ? styles.noteExpanded : ''}`}
            style={{ '--note-color': note.color, animationDelay: `${i * 50}ms` }}
            onClick={() => {
              if (editingId !== note.id) {
                setExpandedId(prev => prev === note.id ? null : note.id);
              }
            }}
          >
            <div className={styles.noteAccent} />

            {editingId === note.id ? (
              <div
                ref={editEditorRef}
                className={styles.noteEditArea}
                contentEditable
                suppressContentEditableWarning
                onPaste={handlePaste}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <p
                className={styles.noteText}
                dangerouslySetInnerHTML={{ __html: note.note }}
              />
            )}

            <div className={styles.noteActions}>
              <button
                className={styles.noteBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  if (editingId === note.id) {
                    handleSaveEdit(note);
                  } else {
                    setEditingId(note.id);
                    setExpandedId(note.id);
                  }
                }}
              >
                {editingId === note.id ? '✓' : '✏'}
              </button>
              <button
                className={styles.noteBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(note.id);
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}