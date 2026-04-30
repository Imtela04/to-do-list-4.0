import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Star } from 'lucide-react';
import styles from './leveluptoast.module.css';

const LEVEL_LABELS = {
  1: 'Novice',
  2: 'Apprentice',
  3: 'Journeyman',
  4: 'Expert',
  5: 'Master',
};

export default function LevelUpToast() {
  const { state, dispatch } = useApp();
  const [visible, setVisible] = useState(false);
  const [level, setLevel]     = useState(null);

  useEffect(() => {
    if (state.levelUpEvent) {
      setLevel(state.levelUpEvent.newLevel);
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(() => dispatch({ type: 'CLEAR_LEVEL_UP' }), 400);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [state.levelUpEvent]);

  if (!level) return null;

  return (
    <div className={`${styles.toast} ${visible ? styles.toastVisible : styles.toastHidden}`}>
      <div className={styles.stars}>
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            className={styles.star}
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
      <div className={styles.content}>
        <span className={styles.title}>Level Up!</span>
        <span className={styles.sub}>You reached Level {level} · {LEVEL_LABELS[level]}</span>
      </div>
      <div className={styles.glow} />
    </div>
  );
}