import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { createCategory, deleteCategory } from '@/api/services';
import styles from './categorypanel.module.css';

const COLORS = ['#7c6aff','#ff6a9e','#6affdc','#ffaa6a','#6ab4ff','#c96aff','#ff6a6a','#6aff9e'];

export default function Categories() {
  const { state, dispatch } = useApp();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    const cat = { id: Date.now(), name: name.trim(), color };
    dispatch({ type: 'ADD_CATEGORY', payload: cat });
    setName(''); setAdding(false);
    try {
      const res = await createCategory({ name: name.trim(), color });
      dispatch({ type: 'DELETE_CATEGORY', payload: cat.id });
      dispatch({ type: 'ADD_CATEGORY', payload: res.data });
    } catch {}
  };

  const handleDelete = async (id) => {
    dispatch({ type: 'DELETE_CATEGORY', payload: id });
    try { await deleteCategory(id); } catch {}
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Categories</span>
        <button className={styles.addBtn} onClick={() => setAdding(v => !v)}>+</button>
      </div>

      {adding && (
        <div className={`${styles.form} animate-scale-in`}>
          <input
            autoFocus
            className={styles.input}
            placeholder="Category name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
          />
          <div className={styles.colorRow}>
            {COLORS.map(c => (
              <button
                key={c}
                className={`${styles.dot} ${color === c ? styles.selected : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <button className={styles.saveBtn} onClick={handleAdd}>Add</button>
        </div>
      )}

      <div className={styles.list}>
        {state.categories.map(cat => {
          const count = state.tasks.filter(t => t.category === cat.id).length;
          return (
            <div key={cat.id} className={styles.item}>
              <span className={styles.dot2} style={{ background: cat.color }} />
              <span className={styles.catName}>{cat.name}</span>
              <span className={styles.count}>{count}</span>
              <button className={styles.delBtn} onClick={() => handleDelete(cat.id)}>✕</button>
            </div>
          );
        })}
        {state.categories.length === 0 && (
          <p className={styles.empty}>No categories yet</p>
        )}
      </div>
    </div>
  );
}
