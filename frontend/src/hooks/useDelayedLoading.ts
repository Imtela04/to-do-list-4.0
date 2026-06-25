import { useEffect, useRef, useState } from 'react';

/** Shows `true` only if `loading` persists past `delay`ms, and keeps it for `minDuration`ms once shown. */
export function useDelayedLoading(loading: boolean, delay = 150, minDuration = 400) {
  const [show, setShow] = useState(() => loading && delay <= 0);
  const shownAtRef = useRef(0);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;

    if (loading) {
      if (delay <= 0) {
        setShow(true);
        shownAtRef.current = Date.now();
      } else {
        showTimer = setTimeout(() => {
          setShow(true);
          shownAtRef.current = Date.now();
        }, delay);
      }
    } else if (show) {
      const elapsed = Date.now() - shownAtRef.current;
      hideTimer = setTimeout(() => setShow(false), Math.max(0, minDuration - elapsed));
    }

    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [loading]);

  return show;
}