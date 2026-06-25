import { AlarmClockCheck } from 'lucide-react';
import styles from './logo.module.css';

export function Logo() {
  return (
    <div>
      <div className={styles.logo}>
        <span className={styles.logoText}>
          what-d<AlarmClockCheck className={styles.logoIcon} />
        </span>
      </div>
    </div>
  );
}