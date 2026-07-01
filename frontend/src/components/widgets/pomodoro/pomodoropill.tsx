import { useAppStore } from '@/store/useAppStore';
import { MODES, SESSION_CYCLE } from '@/utils/pomodoroModes';
import styles from './pomodoro.module.css';

export default function PomodoroPill({ onOpen }: { onOpen: () => void }) {
  const { modeIndex, timeLeft, running, xpToast } = useAppStore(s => s.pomodoro);

  if (!running) return null;
  const mode = MODES[SESSION_CYCLE[modeIndex % SESSION_CYCLE.length]];
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
return (
  <div className={styles.pillWrap}>
    {xpToast && <span className={styles.pillXpToast}>{xpToast}</span>}
    <button className={styles.pill} style={{ '--mode-color': mode.color } as React.CSSProperties} onClick={onOpen}>
      <span className={styles.pillDot} />
      <span className={styles.pillTime}>{mins}:{secs}</span>
    </button>
  </div>
);}