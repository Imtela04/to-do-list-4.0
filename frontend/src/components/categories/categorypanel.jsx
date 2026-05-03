import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { createCategory, deleteCategory } from '@/api/services';
import styles from './categorypanel.module.css';
import { Lock } from 'lucide-react';

const ICONS = ['💼','🏠','💪','💰','📚','📌','🎯','🛒','✈️','🎮'];

export default function Categories() {
  const tasks         = useAppStore(s => s.tasks);
  const categories    = useAppStore(s => s.categories);
  const limits        = useAppStore(s => s.limits);
  const level         = useAppStore(s => s.level);
  const activeCategory = useAppStore(s => s.filter.category);
  const setFilter     = useAppStore(s => s.setFilter);
  const addCategory   = useAppStore(s => s.addCategory);
  const deletecat     = useAppStore(s => s.deleteCategory);

  const [adding, setAdding]         = useState(false);
  const [name, setName]             = useState('');
  const [icon, setIcon]             = useState(ICONS[0]);
  const [limitError, setLimitError] = useState(null);

  const categoriesLocked = limits.categories !== null &&
    categories.length >= limits.categories;

  const toggleFilter = (val) => setFilter({
    category: activeCategory === val ? null : val,
  });

  const handleAdd = async () => {
    if (!name.trim()) return;
    setLimitError(null);
    const optimistic = { id: Date.now(), name: name.trim(), icon };
    addCategory(optimistic);
    setName(''); setAdding(false);
    try {
      const res = await createCategory({ name: name.trim(), icon });
      deletecat(optimistic.id);
      addCategory(res.data);
    } catch (err) {
      deletecat(optimistic.id);
      if (err.response?.status === 403 && err.response?.data?.limit_reached) {
        setAdding(true);
        setLimitError(err.response.data.detail);
      }
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    deletecat(id);
    try { await deleteCategory(id); } catch {}
  };

  const uncategorisedCount = tasks.filter(t => !t.category).length;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Categories</span>
        <button
          className={`${styles.addBtn} ${categoriesLocked ? styles.locked : ''}`}
          onClick={() => {
            if (categoriesLocked) {
              setLimitError(`Reach Level ${level + 1} to unlock more categories`);
              return;
            }
            setAdding(v => !v);
            setLimitError(null);
          }}
        >
          {categoriesLocked ? <Lock size={14} /> : '+'}
        </button>
      </div>

      {limitError && !adding && (
        <div className={styles.limitError}>
          <Lock size={12} />
          <span>{limitError}</span>
        </div>
      )}

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
            <button className={styles.cancelFormBtn} onClick={() => { setAdding(false); setName(''); setLimitError(null); }}>
              Cancel
            </button>
            <button className={styles.saveBtn} onClick={handleAdd}>Add</button>
          </div>
        </div>
      )}

      <div className={styles.list}>
        <div
          className={`${styles.item} ${!activeCategory && activeCategory !== 'uncategorised' ? styles.itemActive : ''}`}
          onClick={() => setFilter({ category: null })}
        >
          <span className={styles.itemIcon}>🗂️</span>
          <span className={styles.catName}>All tasks</span>
          <span className={styles.count}>{tasks.length}</span>
        </div>

        {uncategorisedCount > 0 && (
          <div
            className={`${styles.item} ${activeCategory === 'uncategorised' ? styles.itemActive : ''}`}
            onClick={() => toggleFilter('uncategorised')}
          >
            <span className={styles.itemIcon}>📂</span>
            <span className={styles.catName}>Uncategorised</span>
            <span className={styles.count}>{uncategorisedCount}</span>
          </div>
        )}

        {categories.map(cat => {
          const count = tasks.filter(t => t.category?.id === cat.id).length;
          return (
            <div
              key={cat.id}
              className={`${styles.item} ${activeCategory === cat.id ? styles.itemActive : ''}`}
              onClick={() => toggleFilter(cat.id)}
            >
              <span className={styles.itemIcon}>{cat.icon}</span>
              <span className={styles.catName}>{cat.name}</span>
              <span className={styles.count}>{count}</span>
              <button className={styles.delBtn} onClick={e => handleDelete(e, cat.id)}>✕</button>
            </div>
          );
        })}

        {categories.length === 0 && uncategorisedCount === 0 && (
          <p className={styles.empty}>No categories yet</p>
        )}
      </div>
    </div>
  );
}