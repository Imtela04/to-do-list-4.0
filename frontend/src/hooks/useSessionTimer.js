import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const WARNING_AFTER  = 55 * 60 * 1000; // warn at 55 min
const EXPIRE_AFTER   = 60 * 60 * 1000; // expire at 60 min
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

export function useSessionTimer({ onWarn, onExpire }) {
  const warnTimer   = useRef(null);
  const expireTimer = useRef(null);

  const clear = useCallback(() => {
    clearTimeout(warnTimer.current);
    clearTimeout(expireTimer.current);
  }, []);

  const reset = useCallback(() => {
    clear();
    warnTimer.current   = setTimeout(onWarn,   WARNING_AFTER);
    expireTimer.current = setTimeout(onExpire, EXPIRE_AFTER);
  }, [clear, onWarn, onExpire]);

  useEffect(() => {
    reset(); // start on mount

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clear();
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, reset));
    };
  }, [reset, clear]);

  return { reset, clear };
}