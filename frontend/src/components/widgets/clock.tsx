import { useState, useEffect } from 'react';
import styles from './clock.module.css';


const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function ClockWidget() {
  const [now, setNow]           = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours   = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const ampm    = now.getHours() >= 12 ? 'PM' : 'AM';

  return (
    <div className={styles.widget}>
      <div className={styles.clock}>
        <div className={styles.time}>
          <span className={styles.digits}>{hours}</span>
          <span className={styles.colon}>:</span>
          <span className={styles.digits}>{minutes}</span>
          <span className={styles.colon}>:</span>
          <span className={styles.seconds}>{seconds}</span>
          <span className={styles.ampm}>{ampm}</span>
        </div>
        <div className={styles.dateStr}>
          {DAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}, {now.getFullYear()}
        </div>
      </div>
    </div>
  );
}