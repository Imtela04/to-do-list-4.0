import { useState, useEffect } from 'react';

const FRAMES = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];

export function useBrailleSpinner(active: boolean, speed = 500): string {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setI(f => (f + 1) % FRAMES.length), speed);
    return () => clearInterval(id);
  }, [active, speed]);
  return '['+FRAMES[i]+']';
}