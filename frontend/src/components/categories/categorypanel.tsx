import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
import { createCategory, deleteCategory, updateCategory } from '@/api/services';
import type { Task, Category } from '@/types';
import type { AxiosResponse } from 'axios';
import styles from './categorypanel.module.css';
import { Lock, PenBox, Trash, Ban, Check, FolderOpen } from 'lucide-react';
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
type UpdateVars = { id: number; content: string; icon: string };
type MutateCtx   = { previous?: Category[] };

interface CategoriesProps {
  onNavigate?: () => void;
}


export default function Categories({ onNavigate }: CategoriesProps) {
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
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [editingIcon, setEditingIcon] = useState<string>(ICONS[0]);
  const editEditorRef = useRef<HTMLDivElement | null>(null);

  const counts = useAppStore(s=>s.counts);
  const categoriesLocked = limits.categories !== null && counts.categories >= limits.categories;
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const toggleFilter = (val: number | 'uncategorised'): void => {
    setFilter({ category: activeCategory === val ? null : val });
    onNavigate?.();
  };

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

  const updateMutation = useMutation<
    AxiosResponse<Category>,
    Error,
    UpdateVars,
    MutateCtx
  >({
    mutationFn: ({ id, content, icon }) => updateCategory(id, { name: content, icon }),
      onMutate: async ({ id, content, icon }) => {
        await queryClient.cancelQueries({ queryKey: ['categories'] });
        const previous = queryClient.getQueryData<Category[]>(['categories']);
        queryClient.setQueryData(['categories'], (old: Category[] | undefined) =>
          old?.map(n => n.id === id ? { ...n, name: content, icon } : n) ?? []
        );
        return { previous }
      },
      onSuccess: (_res, { id, content, icon }) => {
        queryClient.setQueryData(['tasks'], (old: Task[] | undefined) =>
          old?.map(t =>
            t.category?.id === id
              ? { ...t, category: { ...t.category, name: content, icon } }
              : t
          ) ?? []
        );
      },

      onError: (_err, _vars, ctx) => queryClient.setQueryData(['categories'], ctx?.previous),
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

  useEffect(() => {
    if (editingId && editEditorRef.current) {
      const cat = categories.find((n: Category) => n.id === editingId);
      if (cat) {
        editEditorRef.current.innerHTML = cat.name;
        setEditingIcon(cat.icon); // ← set current icon
      }
    }
  }, [editingId]);
  

  const handleAdd = (): void => {
    if (!name.trim()) return;
    setLimitError(null);
    addMutation.mutate({ name: name.trim(), icon });
    setName('');
    setAdding(false);
  };

  const handleDelete = (id: number): void => {
    deleteMutation.mutate(id);
  };

  const handleSaveEdit = (cat: Category): void => {
    const content = editEditorRef.current?.innerHTML || '';
    updateMutation.mutate({ id: cat.id, content, icon: editingIcon });
    setEditingId(null);
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
          title = 'Add Category'
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
            <button className={styles.saveBtn} onClick={handleAdd} >Add</button>
          </div>
        </div>
      )}

      <div className={styles.list}>
        <div
          className={`${styles.item} ${activeCategory === null ? styles.itemActive : ''}`}
          onClick={() => { setFilter({ category: null }); onNavigate?.(); }}
        >
          <span className={styles.itemIcon}><FolderOpen size={15}/></span>
          <span className={styles.catName}>All tasks</span>
          <span className={styles.count}>{tasks.length}</span>
        </div>

        {uncategorisedCount > 0 && (
          <div
            className={`${styles.item} ${activeCategory === 'uncategorised' ? styles.itemActive : ''}`}
            onClick={() => toggleFilter('uncategorised')}
          >
            <span className={styles.itemIcon}><FolderOpen size={15}/></span>
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
              onClick={() => { if (editingId !== cat.id) toggleFilter(cat.id); }}
            >
              <span className={styles.itemIcon}>{cat.icon}</span>
              
              {editingId === cat.id ? (
                <div onClick={e => e.stopPropagation()}>
                  <div
                    ref={editEditorRef}
                    className={styles.editInput}
                    contentEditable
                    suppressContentEditableWarning
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(cat); }
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <div className={styles.colorRow}>
                    {ICONS.map(i => (
                      <button
                        key={i}
                        className={`${styles.dot} ${editingIcon === i ? styles.selected : ''}`}
                        onClick={() => setEditingIcon(i)}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <span className={styles.catName}>{cat.name}</span>
              )}
              <span className={styles.count}>{count}</span>
              <button
                className={styles.editBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  if (editingId === cat.id) {
                    handleSaveEdit(cat);
                  } else {
                    setEditingId(cat.id);
                  }
                }}
                title='Edit'
              >
                {editingId === cat.id ? <Check size={12}/> : <PenBox size={12} />}
              </button>
              <button className={styles.delBtn} onClick={e => { e.stopPropagation(); setConfirmDeleteId(cat.id); }} title='Delete'><Trash size={12}/></button>

              {confirmDeleteId === cat.id && (
                <div className={styles.confirmOverlay}>
                  <p className={styles.confirmText}>Delete category?</p>
                  <div className={styles.confirmActions}>
                    <button className={styles.confirmCancel} onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }}><Ban size={12}/></button>
                    <button className={styles.confirmDelete} onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); handleDelete(cat.id); }}><Trash size={12}/></button>
                  </div>
                </div>
              )}
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