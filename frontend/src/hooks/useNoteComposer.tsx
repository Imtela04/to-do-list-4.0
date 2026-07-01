import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createStickyNote } from '@/api/services';
import { useDraft } from './useDraft';
import type { StickyNote } from '@/types';
import { normalizeNoteHtml } from '@/utils/normalizeNoteHtml';

const NOTE_COLORS = ['#7c6aff', '#ff6a9e', '#6affdc', '#ffaa6a', '#6ab4ff', '#c96aff'];

export function useNoteComposer(onSaved: () => void) {
  const queryClient = useQueryClient();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [color, setColor] = useState(NOTE_COLORS[0]);
  const [limitError, setLimitError] = useState<string | null>(null);
  const { save, load, clear } = useDraft('draft_note');
  const [hasDraft, setHasDraft] = useState(!!load());

  const addMutation = useMutation({
    mutationFn: (payload: { note: string; color: string }) => createStickyNote(payload),
    onSuccess: (res) => {
      queryClient.setQueryData(['notes'], (old: StickyNote[] | undefined) => [...(old ?? []), res.data]);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      clear();
      setHasDraft(false);
      onSaved();
    },
    onError: (err: any) => {
      if (err.response?.status === 403 && err.response?.data?.limit_reached) {
        setLimitError(err.response.data.detail);
      }
    },
  });

  const handleInput = () => {
    const content = editorRef.current?.innerHTML || '';
    if (content.trim()) { save({ content, color }); setHasDraft(true); }
    else { clear(); setHasDraft(false); }
  };

	const handleSubmit = () => {
		const raw = editorRef.current?.innerHTML || '';
		if (!raw.trim() && !raw.includes('<img')) return;
		setLimitError(null);
		addMutation.mutate({ note: normalizeNoteHtml(raw), color });
	};

	const discardDraft = () => {
		clear();
		setHasDraft(false);
		if (editorRef.current) editorRef.current.innerHTML = '';
	};


  const hydrate = () => {
    const draft = load() as { content: string; color: string } | null;
    if (draft && editorRef.current) {
      editorRef.current.innerHTML = draft.content || '';
      setColor(draft.color || NOTE_COLORS[0]);
    }
  };

  

  return { 
		editorRef, color, setColor, limitError, setLimitError, hasDraft, hydrate, handleInput, handleSubmit, isPending: addMutation.isPending, NOTE_COLORS, discardDraft};
}