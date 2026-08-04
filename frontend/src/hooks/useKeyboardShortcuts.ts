import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface ShortcutHandlers {
  onNewTask: () => void;
  onToggleNotes: () => void;
  onQuickNote: () => void;
  onToggleView: () => void;
}

export function useKeyboardShortcuts({
  onNewTask,
  onToggleNotes,
  onQuickNote,
  onToggleView,
}: ShortcutHandlers) {
  const setFilter = useAppStore(s => s.setFilter);

  useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const tag = target.tagName;
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) ||
      target.isContentEditable;

    // Escape always clears search and blurs, even from inside the search input
    if (e.key === 'Escape') {
      setFilter({ search: '' });
      (document.activeElement as HTMLElement)?.blur();
      return;
    }

    if (isTyping) return;

    if (e.key.toLowerCase() === 'm') {
      e.preventDefault();
      e.shiftKey ? onToggleNotes() : onQuickNote();
      return;
    }

    switch (e.key) {
      case 'n': e.preventDefault(); onNewTask(); break;
      case 'v': e.preventDefault(); onToggleView(); break;
      case '1': setFilter({ status: 'all' }); break;
      case '2': setFilter({ status: 'active' }); break;
      case '3': setFilter({ status: 'completed' }); break;
      case '?': e.preventDefault(); showShortcutsHelp(); break;
    }
  };


    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNewTask, onToggleNotes, onQuickNote, onToggleView, setFilter]);
}

function showShortcutsHelp() {
  window.dispatchEvent(new CustomEvent('show-shortcuts'));
}