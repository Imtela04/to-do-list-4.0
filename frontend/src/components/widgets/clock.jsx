import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import styles from './clock.module.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function ClockWidget() {
  const [now, setNow]           = useState(new Date());
  const [calMonth, setCalMonth] = useState(new Date());

  const tasks         = useAppStore(s => s.tasks);
  const deadlineDay   = useAppStore(s => s.filter.deadlineDay);
  const setFilter     = useAppStore(s => s.setFilter);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours   = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const ampm    = now.getHours() >= 12 ? 'PM' : 'AM';

  const year  = calMonth.getFullYear();
  const month = calMonth.getMonth();

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calCells    = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );

  const deadlineDays = new Set(
    tasks
      .filter(t => {
        if (!t.deadline || t.completed) return false;
        const d = new Date(t.deadline);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map(t => new Date(t.deadline).getDate())
  );

  const handleDayClick = (day) => {
    if (!day) return;
    const isSelected = deadlineDay?.day === day &&
                       deadlineDay?.month === month &&
                       deadlineDay?.year === year;
    setFilter({ deadlineDay: isSelected ? null : { year, month, day } });
  };

  const prevMonth = () => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const goToday   = () => {
    setCalMonth(new Date());
    setFilter({ deadlineDay: null });
  };

  const todayDate = new Date();

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