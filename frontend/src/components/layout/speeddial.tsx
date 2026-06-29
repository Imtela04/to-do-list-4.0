import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, NotebookPen, Lock, Timer } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import styles from './speeddial.module.css';

// Increased radius to push buttons closer to the edge of the new solid dial plate
const RADIUS = 96; 

const toXY = (deg: number) => ({
  x: Math.round(Math.cos((deg * Math.PI) / 180) * RADIUS),
  y: Math.round(-Math.sin((deg * Math.PI) / 180) * RADIUS),
});

interface Props { onAddTask: () => void; onQuickNote: () => void; }

export default function SpeedDial({ onAddTask, onQuickNote }: Props) {
  const [open, setOpen]     = useState(false);
  const wrapRef             = useRef<HTMLDivElement | null>(null);
  const limits              = useAppStore(s => s.limits);
  const counts              = useAppStore(s => s.counts);
  const level               = useAppStore(s => s.level);
  const setPomodoroOpen     = useAppStore(s => s.setPomodoroOpen);

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

  // Adjusted angles to 90 (Top), 135 (Top-Left), 180 (Left) 
  // This ensures they fit perfectly along the arc of the dial plate from the bottom-right corner.
  const actions = [
    { angle: 90,  icon: tasksLocked ? <Lock size={13}/> : <Plus size={13}/>,        label: tasksLocked ? `LV${level+1}` : 'TASK',  cv: '--accent-primary',   onClick: () => !tasksLocked && act(onAddTask),         locked: tasksLocked },
    { angle: 135, icon: notesLocked ? <Lock size={13}/> : <NotebookPen size={13}/>, label: notesLocked ? `LV${level+1}` : 'NOTE',  cv: '--accent-warm', onClick: () => !notesLocked && act(onQuickNote),       locked: notesLocked },
    { angle: 180, icon: <Timer size={13}/>,                                          label: 'FOCUS',                                 cv: '--accent-tertiary',  onClick: () => act(() => setPomodoroOpen(true)),        locked: false },
  ];

  // Scaled up the ticks to fit the new 280x280 dial plate
  const ticks = useMemo(() =>
    Array.from({ length: 36 }, (_, i) => {
      const rad = ((i / 36) * 360 * Math.PI) / 180;
      const isMajor = i % 9 === 0, isMinor = i % 3 === 0;
      const inner = 64, outer = isMajor ? 128 : isMinor ? 120 : 112;
      return {
        // Center is now 140, 140 for a 280x280 SVG
        x1: 140 + Math.cos(rad) * inner, y1: 140 + Math.sin(rad) * inner,
        x2: 140 + Math.cos(rad) * outer, y2: 140 + Math.sin(rad) * outer,
        isMajor, isMinor,
      };
    }), []);

  return (
    <div className={styles.wrap} ref={wrapRef}>

      {/* ── Solid Dial Plate & Engraved Ticks ── */}
      <div className={`${styles.dialPlate} ${open ? styles.dialPlateOpen : ''}`}>
        <svg className={styles.ringsvg} width="280" height="280" viewBox="0 0 280 280">
          <circle cx="140" cy="140" r="128" fill="none" stroke="var(--accent-primary)" strokeWidth="0.5" opacity="0.2"/>
          <circle cx="140" cy="140" r="64" fill="none" stroke="var(--accent-primary)" strokeWidth="0.4" opacity="0.12" strokeDasharray="3 5"/>
          {ticks.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke="var(--accent-primary)"
              strokeWidth={t.isMajor ? 1.5 : t.isMinor ? 1 : 0.5}
              opacity={t.isMajor ? 0.9 : t.isMinor ? 0.5 : 0.2}
            />
          ))}
        </svg>
      </div>

      {/* ── Action slots ── */}
      {actions.map((a, i) => {
        const { x, y } = toXY(a.angle);
        return (
          <button
            key={i}
            className={[styles.action, open ? styles.actionOpen : '', a.locked ? styles.actionLocked : ''].join(' ')}
            style={{ '--dx': `${x}px`, '--dy': `${y}px`, '--c': `var(${a.cv})`, '--delay': `${i * 45}ms` } as React.CSSProperties}
            onClick={a.onClick}
            title={a.label}
          >
            {a.icon}
            <span className={styles.actionLabel}>{a.label}</span>
          </button>
        );
      })}

      {/* ── Hub ── */}
      <button
        className={`${styles.hub} ${open ? styles.hubOpen : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Quick actions"
      >
        <Plus size={20} className={`${styles.hubIcon} ${open ? styles.hubIconOpen : ''}`}/>
        <div className={styles.orbRing1}/>
        <div className={styles.orbRing2}/>
      </button>
    </div>
  );
}