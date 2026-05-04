import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
import { createCategory, deleteCategory } from '@/api/services';
import type { Category } from '@/types';
import styles from './categorypanel.module.css';
import { Lock } from 'lucide-react';
import { useTasksQuery } from '../../hooks/useTasksQuery';
import { useCategoriesQuery } from '../../hooks/useCategoriesQuery';

const ICONS = ['💼','🏠','💪','💰','📚','📌','🎯','🛒','✈️','🎮'] as const;

interface CategoryMutationContext {
  previous: Category[] | undefined;
}

interface ApiError {
  response?: {
    status: number;
    data?: { limit_reached?: boolean; detail?: string };
  };
}

export default function Categories() {
  const queryClient    = useQueryClient();
  const limits         = useAppStore(s => s.limits);
  const level          = useAppStore(s => s.level);
  const activeCategory = useAppStore(s => s.filter.category);
  const setFilter      = useAppStore(s => s.setFilter);

  const { data: tasks      = [] } = useTasksQuery();
  const { data: categories = [] } = useCategoriesQuery();

  const [adding, setAdding]         = useState(false);
  const [name, setName]             = useState('');
  const [icon, setIcon]             = useState<string>(ICONS[0]);
  const [limitError, setLimitError] = useState<string | null>(null);

  const categoriesLocked = limits.categories !== null && categories.length >= limits.categories;

  const toggleFilter = (val: number | 'uncategorised'): void =>
    setFilter({ category: activeCategory === val ? null : val });

  const addMutation = useMutation({
    mutationFn: (payload: { name: string; icon: string }) => createCategory(payload),
    onMutate: async (payload: { name: string; icon: string }): Promise<CategoryMutationContext> => {
      await queryClient.cancelQueries({ queryKey: ['categories'] });
      const previous = queryClient.getQueryData<Category[]>(['categories']);
      const optimistic: Category = { id: Date.now(), ...payload };
      queryClient.setQueryData<Category[]>(['categories'], old => [...(old ?? []), optimistic]);
      return { previous };
    },
    onError: (err: ApiError, _vars: { name: string; icon: string }, ctx: CategoryMutationContext | undefined) => {
      if (ctx) queryClient.setQueryData(['categories'], ctx.previous);
      if (err.response?.status === 403 && err.response?.data?.limit_reached) {
        setAdding(true);
        setLimitError(err.response.data.detail ?? 'Limit reached');
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onMutate: async (id: number): Promise<CategoryMutationContext> => {
      await queryClient.cancelQueries({ queryKey: ['categories'] });
      const previous = queryClient.getQueryData<Category[]>(['categories']);
      queryClient.setQueryData<Category[]>(['categories'], old => old?.filter(c => c.id !== id) ?? []);
      return { previous };
    },
    onError: (_err: ApiError, _vars: number, ctx: CategoryMutationContext | undefined) => {
      if (ctx) queryClient.setQueryData(['categories'], ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const handleAdd = (): void => {
    if (!name.trim()) return;
    setLimitError(null);
    addMutation.mutate({ name: name.trim(), icon });
    setName('');
    setAdding(false);
  };

  const handleDelete = (e: React.MouseEvent, id: number): void => {
    e.stopPropagation();
    deleteMutation.mutate(id);
  };

  const uncategorisedCount = tasks.filter(t => !t.category).length;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Categories</span>
        <button
          className={`${styles.addBtn} ${categoriesLocked ? styles.locked : ''}`}
          onClick={() => {
            if (categoriesLocked) { setLimitError(`Reach Level ${level + 1} to unlock more categories`); return; }
            setAdding(v => !v);
            setLimitError(null);
          }}
        >
          {categoriesLocked ? <Lock size={14} /> : '+'}
        </button>
      </div>

      {limitError && !adding && (
        <div className={styles.limitError}><Lock size={12} /><span>{limitError}</span></div>
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
              <button key={i} className={`${styles.dot} ${icon === i ? styles.selected : ''}`} onClick={() => setIcon(i)}>
                {i}
              </button>
            ))}
          </div>
          <div className={styles.formActions}>
            <button className={styles.cancelFormBtn} onClick={() => { setAdding(false); setName(''); setLimitError(null); }}>Cancel</button>
            <button className={styles.saveBtn} onClick={handleAdd}>Add</button>
          </div>
        </div>
      )}

      <div className={styles.list}>
        <div
          className={`${styles.item} ${activeCategory === null ? styles.itemActive : ''}`}
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