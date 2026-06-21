import { useEffect, useState } from 'react';

/** Shows `true` only if `loading` persists past `delay`ms, and keeps it for `minDuration`ms once shown. */
export function useDelayedLoading(loading: boolean, delay = 150, minDuration = 400) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;
    let shownAt = 0;

    if (loading) {
      showTimer = setTimeout(() => { setShow(true); shownAt = Date.now(); }, delay);
    } else if (show) {
      const elapsed = Date.now() - shownAt;
      hideTimer = setTimeout(() => setShow(false), Math.max(0, minDuration - elapsed));
    }
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [loading]);

  return show;
}