import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { createCategory, deleteCategory } from '@/api/services';
import styles from './categorypanel.module.css';

const ICONS = ['💼','🏠','💪','💰','📚','📌','🎯','🛒','✈️','🎮'];

export default function Categories() {
  const { state, dispatch } = useApp();
  const [adding, setAdding] = useState(false);
  const [name, setName]     = useState('');
  const [icon, setIcon]     = useState(ICONS[0]);

  const activeCategory = state.filter.category;
  const setFilter = (val) => dispatch({
    type: 'SET_FILTER',
    payload: { category: activeCategory === val ? null : val }
  });

  const handleAdd = async () => {
    if (!name.trim()) return;
    const cat = { id: Date.now(), name: name.trim(), icon };
    dispatch({ type: 'ADD_CATEGORY', payload: cat });
    setName(''); setAdding(false);
    try {
      const res = await createCategory({ name: name.trim(), icon });
      dispatch({ type: 'DELETE_CATEGORY', payload: cat.id });
      dispatch({ type: 'ADD_CATEGORY', payload: res.data });
    } catch {}
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // don't trigger filter click
    dispatch({ type: 'DELETE_CATEGORY', payload: id });
    try { await deleteCategory(id); } catch {}
  };

  // uncategorised = tasks with no category
  const uncategorisedCount = state.tasks.filter(t => !t.category).length;

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
            {ICONS.map(i => (
              <button
                key={i}
                className={`${styles.dot} ${icon === i ? styles.selected : ''}`}
                onClick={() => setIcon(i)}
              >
                {i}
              </button>
            ))}
          </div>
          <div className={styles.formActions}>
            <button className={styles.cancelFormBtn} onClick={() => { setAdding(false); setName(''); }}>
              Cancel
            </button>
            <button className={styles.saveBtn} onClick={handleAdd}>Add</button>
          </div>
        </div>
      )}

      <div className={styles.list}>
        {/* All tasks row */}
        <div
          className={`${styles.item} ${!activeCategory && activeCategory !== 'uncategorised' ? styles.itemActive : ''}`}
          onClick={() => dispatch({ type: 'SET_FILTER', payload: { category: null } })}
        >
          <span className={styles.itemIcon}>🗂️</span>
          <span className={styles.catName}>All tasks</span>
          <span className={styles.count}>{state.tasks.length}</span>
        </div>

        {/* Uncategorised row */}
        {uncategorisedCount > 0 && (
          <div
            className={`${styles.item} ${activeCategory === 'uncategorised' ? styles.itemActive : ''}`}
            onClick={() => setFilter('uncategorised')}
          >
            <span className={styles.itemIcon}>📂</span>
            <span className={styles.catName}>Uncategorised</span>
            <span className={styles.count}>{uncategorisedCount}</span>
          </div>
        )}

        {/* User categories */}
        {state.categories.map(cat => {
          const count = state.tasks.filter(t => t.category?.id === cat.id).length;
          return (
            <div
              key={cat.id}
              className={`${styles.item} ${activeCategory === cat.id ? styles.itemActive : ''}`}
              onClick={() => setFilter(cat.id)}
            >
              <span className={styles.itemIcon}>{cat.icon}</span>
              <span className={styles.catName}>{cat.name}</span>
              <span className={styles.count}>{count}</span>
              <button className={styles.delBtn} onClick={e => handleDelete(e, cat.id)}>✕</button>
            </div>
          );
        })}

        {state.categories.length === 0 && uncategorisedCount === 0 && (
          <p className={styles.empty}>No categories yet</p>
        )}
      </div>
    </div>
  );
}