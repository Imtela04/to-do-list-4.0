import { useEffect, useRef, useCallback } from 'react';

const WARNING_AFTER   = 55 * 60 * 1000;
const EXPIRE_AFTER    = 60 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const;

interface SessionTimerOptions {
  onWarn:   () => void;
  onExpire: () => void;
}

interface SessionTimerResult {
  reset: () => void;
  clear: () => void;
}

export function useSessionTimer({ onWarn, onExpire }: SessionTimerOptions): SessionTimerResult {
  const warnTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expireTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback((): void => {
    if (warnTimer.current)   clearTimeout(warnTimer.current);
    if (expireTimer.current) clearTimeout(expireTimer.current);
  }, []);

  const reset = useCallback((): void => {
    clear();
    warnTimer.current   = setTimeout(onWarn,   WARNING_AFTER);
    expireTimer.current = setTimeout(onExpire, EXPIRE_AFTER);
  }, [clear, onWarn, onExpire]);

  useEffect(() => {
    reset();
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clear();
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, reset));
    };
  }, [reset, clear]);

  return { reset, clear };
}