import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import styles from './clock.module.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function ClockWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
  const day = DAYS[now.getDay()];
  const month = MONTHS[now.getMonth()];
  const date = now.getDate();
  const year = now.getFullYear();

  // Mini calendar
  const firstDay = new Date(year, now.getMonth(), 1).getDay();
  const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
  const calCells = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );

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
        <div className={styles.dateStr}>{day}, {month} {date}, {year}</div>
      </div>

      <div className={styles.calendar}>
        <div className={styles.calHeader}>
          <span>{month} {year}</span>
        </div>
        <div className={styles.calGrid}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <div key={d} className={styles.calDayName}>{d}</div>
          ))}
          {calCells.map((d, i) => (
            <div
              key={i}
              className={`${styles.calCell} ${d === date ? styles.today : ''} ${!d ? styles.empty : ''}`}
            >
              {d || ''}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
