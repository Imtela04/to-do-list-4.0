import { useEffect, useRef, useCallback } from 'react';

const ACTIVITY_EVENTS =               ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const;

interface SessionTimerOptions {
  onWarn:                             () => void;
  onExpire:                           () => void;
  warningAfter?:                      number;
  expireAfter?:                       number;
}

interface SessionTimerResult {
  reset:                              () => void;
  clear:                              () => void;
}

const DEFAULT_WARNING_AFTER =         55 * 60 * 1000;
const DEFAULT_EXPIRE_AFTER =          60 * 60 * 1000;


export function useSessionTimer({ onWarn, onExpire, warningAfter = DEFAULT_WARNING_AFTER, expireAfter = DEFAULT_EXPIRE_AFTER }: SessionTimerOptions): SessionTimerResult {
  const warnTimer =                   useRef<ReturnType<typeof setTimeout> | null>(null);
  const expireTimer =                 useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store callbacks in refs so the reset/clear functions never become stale
  // and the effect doesn't need to re-run when the parent re-renders.
  const onWarnRef =                   useRef(onWarn);
  const onExpireRef =                 useRef(onExpire);
  useEffect(() => { onWarnRef.current   = onWarn;   }, [onWarn]);
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  const clear = useCallback((): void => {
    if (warnTimer.current)   clearTimeout(warnTimer.current);
    if (expireTimer.current) clearTimeout(expireTimer.current);
  }, []);

  const reset = useCallback((): void => {
    clear();
    warnTimer.current   = setTimeout(() => onWarnRef.current(),   warningAfter);
    expireTimer.current = setTimeout(() => onExpireRef.current(), expireAfter);
  }, [clear]);

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