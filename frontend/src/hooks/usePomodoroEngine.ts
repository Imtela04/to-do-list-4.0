import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { completePomodoro } from '@/api/services';
import { MODES, SESSION_CYCLE } from '@/utils/pomodoroModes';

export function usePomodoroEngine() {
  const { modeIndex, timeLeft, running } = useAppStore(s => s.pomodoro);
  const setPomodoroTimer = useAppStore(s => s.setPomodoroTimer);
  const tickPomodoro     = useAppStore(s => s.tickPomodoro);
  const pomodoroComplete = useAppStore(s => s.pomodoroComplete);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleComplete = useCallback(async () => {
    const isWork = SESSION_CYCLE[modeIndex % SESSION_CYCLE.length] === 'work';
		new Audio('/sounds/bell.mp3').play().catch(() => {});
    if (isWork) {
			try {
				const res = await completePomodoro();
				pomodoroComplete(res.data);
				setPomodoroTimer({ xpToast: '+5 XP' });
				setTimeout(() => setPomodoroTimer({ xpToast: null }), 2000);
			} catch {}
    }
    const nextIndex = modeIndex + 1;
    setPomodoroTimer({
      modeIndex: nextIndex,
      timeLeft:  MODES[SESSION_CYCLE[nextIndex % SESSION_CYCLE.length]].duration,
      running:   false,
    });
  }, [modeIndex, pomodoroComplete, setPomodoroTimer]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      if (timeLeft <= 1) handleComplete();
      else tickPomodoro();
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, timeLeft, tickPomodoro, handleComplete]);
}