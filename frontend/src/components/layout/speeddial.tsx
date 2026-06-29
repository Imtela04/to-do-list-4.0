import { useState, useRef, useEffect } from 'react';
import { Plus, NotebookPen, Lock } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import styles from './speeddial.module.css';

interface Props {
  onAddTask:   () => void;
  onQuickNote: () => void;
}

export default function SpeedDial({ onAddTask, onQuickNote }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef         = useRef<HTMLDivElement | null>(null);
  const limits          = useAppStore(s => s.limits);
  const counts          = useAppStore(s => s.counts);
  const level           = useAppStore(s => s.level);
  const setPomodoroOpen = useAppStore(s => s.setPomodoroOpen);

  const tasksLocked = limits.tasks !== null && counts.tasks >= limits.tasks;
  const notesLocked = limits.notes !== null && counts.notes >= limits.notes;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const act = (fn: () => void) => { fn(); setOpen(false); };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {open && (
        <>
          <button className={styles.option} onClick={() => act(() => setPomodoroOpen(true))} title='Pomodoro'>
            <span className={styles.optionIcon}>🍅︎</span>
          </button>
          <button
            className={styles.option}
            onClick={() => !notesLocked && act(onQuickNote)}
            title={notesLocked ? `Reach Level ${level + 1} to unlock notes` : `Quick Note`}
          >
            <span className={styles.optionIcon}>
              {notesLocked ? <Lock size={14} /> : <NotebookPen size={14} />}
            </span>
          </button>
          <button
            className={styles.option}
            onClick={() => !tasksLocked && act(onAddTask)}
            title={tasksLocked ? `Reach Level ${level + 1} to add more tasks` : `Add Task`}
          >
            <span className={styles.optionIcon}>
              {tasksLocked ? <Lock size={14} /> : <Plus size={14} />}
            </span>
          </button>
        </>
      )}
      <button
        className={`${styles.main} ${open ? styles.mainOpen : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Quick actions"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}