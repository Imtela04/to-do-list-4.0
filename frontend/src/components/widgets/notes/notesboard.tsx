import { useState, useMemo, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, PenBox, Trash, X } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useNotesQuery } from '@/hooks/useNotesQuery';
import { updateStickyNote, deleteStickyNote } from '@/api/services';
import { normalizeNoteHtml } from '@/utils/normalizeNoteHtml';
import type { StickyNote } from '@/types';
import styles from './notesboard.module.css';

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, ' ');

export default function NotesBoard({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: notes = [] } = useNotesQuery();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const editRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(
    () => notes.filter((n: StickyNote) => stripHtml(n.note).toLowerCase().includes(search.toLowerCase())),
    [notes, search]
  );

  // ── same mutation shape as stickynote.tsx ──
  const updateMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) => updateStickyNote(id, { note: content }),
    onMutate: async ({ id, content }) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });
      const previous = queryClient.getQueryData<StickyNote[]>(['notes']);
      queryClient.setQueryData(['notes'], (old: StickyNote[] | undefined) =>
        old?.map(n => n.id === id ? { ...n, note: content } : n) ?? []);
      return { previous };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(['notes'], ctx?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteStickyNote(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });
      const previous = queryClient.getQueryData<StickyNote[]>(['notes']);
      queryClient.setQueryData(['notes'], (old: StickyNote[] | undefined) => old?.filter(n => n.id !== id) ?? []);
      return { previous };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(['notes'], ctx?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  const saveEdit = (note: StickyNote) => {
    const html = normalizeNoteHtml(editRef.current?.innerHTML || '');
    updateMutation.mutate({ id: note.id, content: html });
    setEditingId(null);
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.topBar}>
          <div className={styles.searchWrap}>
            <Search size={14} className={styles.searchIcon} />
            <input
              autoFocus
              className={styles.search}
              placeholder="Search notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && onClose()}
            />
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        {filtered.length === 0 && (
          <p className={styles.empty}>{search ? 'No matching notes' : 'No notes yet'}</p>
        )}

        <div className={styles.grid}>
          {filtered.map((note: StickyNote) => (
            <div key={note.id} className={styles.card} style={{ '--note-color': note.color } as React.CSSProperties}>
              <div className={styles.cardAccent} />
              {editingId === note.id ? (
                <div
                  ref={editRef}
                  className={styles.cardEdit}
                  contentEditable
                  suppressContentEditableWarning
                  onClick={e => e.stopPropagation()}
                  dangerouslySetInnerHTML={{ __html: note.note }}
                />
              ) : (
                <p className={styles.cardText} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.note) }} />
              )}

              <div className={styles.cardActions}>
                <button
                  className={styles.cardBtn}
                  onClick={() => editingId === note.id ? saveEdit(note) : setEditingId(note.id)}
                >
                  {editingId === note.id ? '✓' : <PenBox size={12} />}
                </button>
                <button className={styles.cardBtn} onClick={() => setConfirmId(note.id)}>
                  <Trash size={12} />
                </button>
              </div>

              {confirmId === note.id && (
                <div className={styles.confirmOverlay}>
                  <p className={styles.confirmText}>Delete?</p>
                  <div className={styles.confirmActions}>
                    <button className={styles.confirmCancel} onClick={() => setConfirmId(null)}>Cancel</button>
                    <button
                      className={styles.confirmDelete}
                      onClick={() => { setConfirmId(null); deleteMutation.mutate(note.id); }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}