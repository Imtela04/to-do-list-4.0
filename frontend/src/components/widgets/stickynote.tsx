import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';
import { useAppStore } from '../../store/useAppStore';
import { createStickyNote, updateStickyNote, deleteStickyNote } from '@/api/services';
import styles from './stickynote.module.css';
import { PenLine, Trash, PenBox, Lock } from 'lucide-react';
import { useDraft } from '../../hooks/useDraft';
import { useNotesQuery } from '../../hooks/useNotesQuery';
import type { StickyNote } from '@/types';

const NOTE_COLORS: string[] = ['#7c6aff', '#ff6a9e', '#6affdc', '#ffaa6a', '#6ab4ff', '#c96aff'];

interface NoteDraft {
  content: string;
  color:   string;
}

type UpdateVars  = { id: number; content: string };
type MutateCtx   = { previous?: StickyNote[] };

export default function StickyNotes() {
  const queryClient = useQueryClient();
  const limits      = useAppStore(s => s.limits);
  const counts      = useAppStore(s => s.counts);
  const level       = useAppStore(s => s.level);

  const { data: stickyNotes = [] } = useNotesQuery();

  const [adding, setAdding]         = useState(false);
  const [newColor, setNewColor]     = useState(NOTE_COLORS[0]);
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);  const addEditorRef  = useRef<HTMLDivElement | null>(null);
  const editEditorRef = useRef<HTMLDivElement | null>(null);
  const { save: saveDraft, load: loadDraft, clear: clearDraft } = useDraft('draft_note');
  const [hasNoteDraft, setHasNoteDraft] = useState(!!loadDraft());

  const notesLocked  = limits.notes !== null && counts.notes >= limits.notes;
  const notesAtLimit = limits.notes === 0;

  useEffect(() => {
    if (adding && addEditorRef.current) {
      const draft = loadDraft() as NoteDraft | null;
      if (draft) {
        addEditorRef.current.innerHTML = draft.content || '';
        setNewColor(draft.color || NOTE_COLORS[0]);
        setHasNoteDraft(true);
      } else {
        addEditorRef.current.innerHTML = '';
        setHasNoteDraft(false);
      }
    }
  }, [adding]);

  useEffect(() => {
    if (editingId && editEditorRef.current) {
      const note = stickyNotes.find((n: StickyNote) => n.id === editingId);
      if (note) editEditorRef.current.innerHTML = note.note;
    }
  }, [editingId]);

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>): void => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = document.createElement('img');
          img.src = ev.target?.result as string;
          img.style.maxWidth = '100%';
          img.style.display = 'block';
          img.style.borderRadius = '4px';
          img.style.marginTop = '4px';
          const selection = window.getSelection();
          if (selection?.rangeCount) {
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
  const handleDelete = (id: number): void => {
    deleteMutation.mutate(id);
  };
  const addMutation = useMutation<
    AxiosResponse<StickyNote>,
    Error,
    { note: string; color: string },
    MutateCtx
  >({
    mutationFn: (payload) => createStickyNote(payload),
    onSuccess: (res) => {
      queryClient.setQueryData(['notes'], (old: StickyNote[] | undefined) => [
        ...(old ?? []),
        res.data,
      ]);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setAdding(false);
      clearDraft();
      setHasNoteDraft(false);
    },
    onError: (err: any) => {
      if (err.response?.status === 403 && err.response?.data?.limit_reached) {
        setLimitError(err.response.data.detail);
      }
    },
  });

  const updateMutation = useMutation<
    AxiosResponse<StickyNote>,
    Error,
    UpdateVars,
    MutateCtx
  >({
    mutationFn: ({ id, content }) => updateStickyNote(id, { note: content }),
    onMutate: async ({ id, content }) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });
      const previous = queryClient.getQueryData<StickyNote[]>(['notes']);
      queryClient.setQueryData(['notes'], (old: StickyNote[] | undefined) =>
        old?.map(n => n.id === id ? { ...n, note: content } : n) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => queryClient.setQueryData(['notes'], ctx?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  const deleteMutation = useMutation<
    AxiosResponse,
    Error,
    number,
    MutateCtx
  >({
    mutationFn: (id) => deleteStickyNote(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });
      const previous = queryClient.getQueryData<StickyNote[]>(['notes']);
      queryClient.setQueryData(['notes'], (old: StickyNote[] | undefined) =>
        old?.filter(n => n.id !== id) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => queryClient.setQueryData(['notes'], ctx?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  const handleAdd = (): void => {
    const content = addEditorRef.current?.innerHTML || '';
    const hasContent = content.trim() || content.includes('<img');
    if (!hasContent) return;
    setLimitError(null);
    addMutation.mutate({ note: content, color: newColor });
  };

  const handleSaveEdit = (note: StickyNote): void => {
    const content = editEditorRef.current?.innerHTML || '';
    updateMutation.mutate({ id: note.id, content });
    setEditingId(null);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        {/* <span className={styles.title}>STICKY NOTES</span> */}
        {notesLocked || notesAtLimit ? (
          <button
            className={`${styles.addBtn} ${styles.locked}`}
            onClick={() => setLimitError(`Reach Level ${level + 1} to unlock sticky notes`)}
            title={`Unlock at Level ${level + 1}`}
          >
            <Lock size={16} />
          </button>
        ) : (
          <button
            className={styles.addBtn}
            onClick={() => { setAdding(true); setLimitError(null); }}
          >
            <PenLine size={16} />
          </button>
        )}
      </div>

      {adding && (
        <div
          className={`${styles.noteForm} animate-scale-in`}
          style={{ borderLeft: `4px solid ${newColor}` }}
        >
          {limitError && (
            <div className={styles.limitBanner}>
              <Lock size={12} /><span>{limitError}</span>
            </div>
          )}
          {hasNoteDraft && (
            <div className={styles.draftBadge}>
              <span>📝 Draft restored</span>
              <button
                className={styles.discardDraft}
                onClick={() => {
                  clearDraft();
                  setHasNoteDraft(false);
                  if (addEditorRef.current) addEditorRef.current.innerHTML = '';
                }}
              >
                Discard
              </button>
            </div>
          )}
          <div
            ref={addEditorRef}
            className={styles.textarea}
            contentEditable
            suppressContentEditableWarning
            onPaste={handlePaste}
            onInput={() => {
              const content = addEditorRef.current?.innerHTML || '';
              if (content.trim()) saveDraft({ content, color: newColor });
              else clearDraft();
            }}
            data-placeholder="..."
          />
          <div className={styles.colorRow}>
            {NOTE_COLORS.map(c => (
              <button
                key={c}
                className={`${styles.colorDot} ${newColor === c ? styles.colorSelected : ''}`}
                style={{
                  background: c,
                  outline: newColor === c ? '2px solid white' : 'none',
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
        {stickyNotes.length === 0 && !adding && (
          <p className={styles.empty}>no notes :(</p>
        )}
        {stickyNotes.map((note: StickyNote, i: number) => (
          <div
            key={note.id}
            className={`${styles.note} ${expandedId === note.id ? styles.noteExpanded : ''}`}
            style={{ '--note-color': note.color, animationDelay: `${i * 50}ms` } as React.CSSProperties}
            onClick={() => {
              if (editingId !== note.id)
                setExpandedId(prev => prev === note.id ? null : note.id);
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
              <p className={styles.noteText} dangerouslySetInnerHTML={{ __html: note.note }} />
            )}
            <div className={styles.noteActions}>
              <button
                className={styles.noteBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  if (editingId === note.id) handleSaveEdit(note);
                  else { setEditingId(note.id); setExpandedId(note.id); }
                }}
              >
                {editingId === note.id ? '✓' : <PenBox size={12} />}
              </button>
              <button
                className={styles.deleteBtn}
                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(note.id); }}
              >
                <Trash size={12} />
              </button>
            </div>

            {confirmDeleteId === note.id && (
              <div className={styles.confirmOverlay}>
                <p className={styles.confirmText}>Delete this note?</p>
                <div className={styles.confirmActions}>
                  <button className={styles.confirmCancel} onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}>Cancel</button>
                  <button className={styles.confirmDelete} onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); handleDelete(note.id); }}>Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}