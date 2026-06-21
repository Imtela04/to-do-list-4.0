import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { completePomodoro } from '@/api/services';
import { Play, Pause, RotateCcw, X, Timer } from 'lucide-react';
import styles from './pomodoro.module.css';
import { useTasksQuery } from '@/hooks/useTasksQuery';
import type { Task } from '@/types';

type ModeKey = 'work' | 'short' | 'long';

interface Mode {
  label:    string;
  duration: number;
  color:    string;
}

const MODES: Record<ModeKey, Mode> = {
  work:  { label: 'Focus',        duration: 25 * 60, color: '#7c6aff' },
  short: { label: 'Short Break',  duration: 5 * 60,  color: '#6affdc' },
  long:  { label: 'Long Break',   duration: 15 * 60, color: '#6ab4ff' },
};

const SESSION_CYCLE: ModeKey[] = ['work', 'short', 'work', 'short', 'work', 'short', 'work', 'long'];

interface Props {
  onClose: () => void;
}

export default function Pomodoro({ onClose }: Props) {
  const pomodoroComplete        = useAppStore(s => s.pomodoroComplete);
  const pomodoroQueue           = useAppStore(s => s.pomodoroQueue);
  const addToPomodoroQueue      = useAppStore(s => s.addToPomodoroQueue);
  const removeFromPomodoroQueue = useAppStore(s => s.removeFromPomodoroQueue);
  const { data: tasks = [] } = useTasksQuery();

  const [modeIndex, setModeIndex] = useState(0);
  const [timeLeft, setTimeLeft]   = useState(MODES.work.duration);
  const [running, setRunning]     = useState(false);
  const [sessions, setSessions]   = useState(0);
  const [xpToast, setXpToast]     = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef    = useRef<HTMLAudioElement | null>(null);

  const currentKey   = SESSION_CYCLE[modeIndex % SESSION_CYCLE.length];
  const mode         = MODES[currentKey];
  const isWork       = currentKey === 'work';

  const total        = mode.duration;
  const pct          = ((total - timeLeft) / total) * 100;
  const radius       = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDash   = circumference - (pct / 100) * circumference;

  const handleSessionComplete = useCallback(async (): Promise<void> => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }

    if (isWork) {
      setSessions(s => s + 1);
      try {
        const res = await completePomodoro();
        pomodoroComplete(res.data);
        setXpToast('+5 XP');
        setTimeout(() => setXpToast(null), 2000);
      } catch {}
    }

    setModeIndex(i => i + 1);
    setTimeLeft(MODES[SESSION_CYCLE[(modeIndex + 1) % SESSION_CYCLE.length]].duration);
  }, [isWork, modeIndex, pomodoroComplete]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { handleSessionComplete(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, handleSessionComplete]);

  // auto-drop tasks that got completed/deleted elsewhere while the panel is open
  useEffect(() => {
    pomodoroQueue
      .filter(id => { const t = tasks.find((x: Task) => x.id === id); return !t || t.completed; })
      .forEach(removeFromPomodoroQueue);
  }, [tasks, pomodoroQueue, removeFromPomodoroQueue]);

  const handleReset = (): void => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimeLeft(mode.duration);
  };

  const switchMode = (key: ModeKey): void => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const idx = SESSION_CYCLE.indexOf(key);
    setModeIndex(idx >= 0 ? idx : 0);
    setTimeLeft(MODES[key].duration);
  };

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  const queuedTasks    = pomodoroQueue.map(id => tasks.find((t: Task) => t.id === id)).filter((t): t is Task => !!t);
  const availableTasks = tasks.filter((t: Task) => !t.completed && !pomodoroQueue.includes(t.id));
  return (
    <div className={styles.panel}>
      <audio ref={audioRef} src="/sounds/bell.mp3" preload="auto" />
      <div className={styles.header}>
        <span className={styles.title}><Timer size={14} /> Pomodoro</span>
        <button className={styles.closeBtn} onClick={onClose}><X size={14} /></button>
      </div>
      <div className={styles.tabs}>
        {(Object.entries(MODES) as [ModeKey, Mode][]).map(([key, { label }]) => (
          <button
            key={key}
            className={`${styles.tab} ${currentKey === key ? styles.tabActive : ''}`}
            onClick={() => switchMode(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.timerWrap}>
        {xpToast && <span className={styles.xpToast}>{xpToast}</span>}
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--bg-secondary)" strokeWidth="8" />
          <circle cx="70" cy="70" r={radius} fill="none" stroke={mode.color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDash}
            transform="rotate(-90 70 70)" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
        </svg>
        <div className={styles.timerText}>
          <span className={styles.time}>{mins}:{secs}</span>
          <span className={styles.modeLabel}>{mode.label}</span>
        </div>
      </div>
      <div className={styles.controls}>
        <button className={styles.controlBtn} onClick={handleReset}><RotateCcw size={16} /></button>
        <button
          className={`${styles.controlBtn} ${styles.playBtn}`}
          style={{ borderColor: mode.color, color: mode.color }}
          onClick={() => setRunning(r => !r)}
        >
          {running ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <span className={styles.sessionCount}>{sessions} session{sessions !== 1 ? 's' : ''} today</span>
      </div>
      <div className={styles.taskLink}>
        <select
          className={styles.taskSelect}
          value=""
          onChange={e => { if (e.target.value) addToPomodoroQueue(parseInt(e.target.value)); }}
        >
          <option value="">+ Add task to queue</option>
          {availableTasks.map((t: Task) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
        {queuedTasks.length > 0 && (
          <div className={styles.taskQueue}>
            {queuedTasks.map((t, i) => (
              <div key={t.id} className={styles.queueItem}>
                <span className={styles.queueDot}>{i === 0 ? '🎯' : i + 1}</span>
                <span className={styles.queueTitle}>{t.title}</span>
                <button className={styles.queueRemove} onClick={() => removeFromPomodoroQueue(t.id)}>
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}