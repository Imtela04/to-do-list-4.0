import { useEffect, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Play, Pause, RotateCcw, X, Timer } from 'lucide-react';
import styles from './pomodoro.module.css';
import { useTasksQuery } from '@/hooks/useTasksQuery';
import type { Task } from '@/types';
import { MODES, SESSION_CYCLE } from '@/utils/pomodoroModes';

type ModeKey = 'work' | 'short' | 'long';

interface Mode {
  label:    string;
  duration: number;
  color:    string;
}

export default function Pomodoro() {
  const pomodoroQueue                                   = useAppStore(s => s.pomodoroQueue);
  const addToPomodoroQueue                              = useAppStore(s => s.addToPomodoroQueue);
  const removeFromPomodoroQueue                         = useAppStore(s => s.removeFromPomodoroQueue);
  const { data: tasks = [] }                            = useTasksQuery();
  const { modeIndex, timeLeft, running, sessions, xpToast } = useAppStore(s => s.pomodoro);
  const intervalRef                                     = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef                                        = useRef<HTMLAudioElement | null>(null);
  const setPomodoroTimer                                = useAppStore(s => s.setPomodoroTimer);

  const currentKey                                      = SESSION_CYCLE[modeIndex % SESSION_CYCLE.length];
  const mode                                            = MODES[currentKey];
  const total                                           = mode.duration;
  const pct                                             = ((total - timeLeft) / total) * 100;
  const radius                                          = 90;
  const circumference                                   = 2 * Math.PI * radius;
  const strokeDash                                      = circumference - (pct / 100) * circumference;


  useEffect(() => {
    pomodoroQueue
      .filter(id => { const t = tasks.find((x: Task) => x.id === id); return !t || t.completed; })
      .forEach(removeFromPomodoroQueue);
  }, [tasks, pomodoroQueue, removeFromPomodoroQueue]);

  const handleReset = (): void => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPomodoroTimer({ running: false, timeLeft: mode.duration });
  };


  const switchMode = (key: ModeKey): void => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const idx = SESSION_CYCLE.indexOf(key);
    setPomodoroTimer({
      running:   false,
      modeIndex: idx >= 0 ? idx : 0,
      timeLeft:  MODES[key].duration,
    });
  };

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  const queuedTasks    = pomodoroQueue.map(id => tasks.find((t: Task) => t.id === id)).filter((t): t is Task => !!t);
  const availableTasks = tasks.filter((t: Task) => !t.completed && !pomodoroQueue.includes(t.id));
  return (
    <div className={styles.viewLayout}>
      <audio ref={audioRef} src="/sounds/bell.mp3" preload="auto" />

      <div className={styles.timerColumn}>
        <div className={styles.header}>
          <span className={styles.title}><Timer size={16} /> Pomodoro</span>
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

        <div className={styles.timerWrap} style={{ '--mode-color': mode.color } as React.CSSProperties}>
          {xpToast && <span className={styles.xpToast}>{xpToast}</span>}
          <svg width="220" height="220" viewBox="0 0 220 220">
            <circle cx="110" cy="110" r={radius} fill="none" stroke="var(--bg-secondary)" strokeWidth="10" />
            <circle
              cx="110" cy="110" r={radius} fill="none" stroke="var(--mode-color)" strokeWidth="10"
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDash}
              transform="rotate(-90 110 110)" className={styles.progressRing}
            />
          </svg>
          <div className={styles.timerText}>
            <span className={styles.time}>{mins}:{secs}</span>
            <span className={styles.modeLabel}>{mode.label}</span>
          </div>
        </div>

        <div className={styles.controls}>
          <button className={styles.controlBtn} onClick={handleReset}><RotateCcw size={18} /></button>
          <button
            className={`${styles.controlBtn} ${styles.playBtn}`}
            onClick={() => setPomodoroTimer({ running: !running })}
          >
            {running ? <Pause size={22} /> : <Play size={22} />}
          </button>
        </div>

        <div className={styles.cycleDots}>
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className={`${styles.cycleDot} ${i < sessions % 4 ? styles.cycleDotFilled : ''}`} />
          ))}
          <span className={styles.sessionCount}>{sessions} session{sessions !== 1 ? 's' : ''} today</span>
        </div>
      </div>

      <div className={styles.queueColumn}>
        <div className={styles.queuePanel}>
          <span className={styles.queuePanelTitle}>Task Queue</span>
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

          {queuedTasks.length === 0 ? (
            <p className={styles.queueEmpty}>No tasks queued</p>
          ) : (
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
    </div>
  );
}