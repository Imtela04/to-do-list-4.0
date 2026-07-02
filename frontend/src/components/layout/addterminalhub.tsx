import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import styles from './addterminalhub.module.css';

interface Props { onAddTask: () => void; onQuickNote: () => void; }

export default function  Addterminalhub({ onAddTask, onQuickNote }: Props) {
  const [open, setOpen]     = useState(false);
  const wrapRef             = useRef<HTMLDivElement | null>(null);
  const limits              = useAppStore(s => s.limits);
  const counts              = useAppStore(s => s.counts);
  const level               = useAppStore(s => s.level);

  const tasksLocked = limits.tasks !== null && counts.tasks >= limits.tasks;
  const notesLocked = limits.notes !== null && counts.notes >= limits.notes;

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const act = (fn: () => void) => { fn(); setOpen(false); };
  const actions = [
    { icon: tasksLocked ? `locked · lv${level+1}` : `add task [n]`,   onClick: () => !tasksLocked && act(onAddTask),   locked: tasksLocked },
    { icon: notesLocked ? `locked · lv${level+1}` : `add note [m]`, onClick: () => !notesLocked && act(onQuickNote), locked: notesLocked },
  ];

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {open && (
        <div className={styles.terminalPanel}>
          {actions.map((a, i) => (
            <button
              key={i}
              className={`${styles.terminalRow} ${a.locked ? styles.terminalRowLocked : ''}`}
              onClick={a.onClick}
            >
              <span className={styles.terminalPrompt}>&gt;</span>
              {a.icon}
              <span className={styles.terminalLabel}></span>
            </button>
          ))}
        </div>
      )}

      <button
        className={`${styles.hub} ${open ? styles.hubOpen : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Quick actions"
      >
        <span className={styles.hubPrompt}>&gt;</span>
        <span className={styles.hubCursor} />
      </button>
    </div>
  );
}