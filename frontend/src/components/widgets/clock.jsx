import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import styles from './clock.module.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function ClockWidget() {
  const [now, setNow]           = useState(new Date());
  const [calMonth, setCalMonth] = useState(new Date());
  const { state, dispatch }     = useApp();

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

  // Build a Set of days-of-month that have tasks with deadlines in this month
  const deadlineDays = new Set(
    state.tasks
      .filter(t => {
        if (!t.deadline) return false;
        const d = new Date(t.deadline);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map(t => new Date(t.deadline).getDate())
  );

  const selectedDate = state.filter.deadlineDay; // { year, month, day } or null

  const handleDayClick = (day) => {
    if (!day) return;
    const isSelected = selectedDate?.day === day &&
                       selectedDate?.month === month &&
                       selectedDate?.year === year;
    dispatch({
      type: 'SET_FILTER',
      payload: {
        deadlineDay: isSelected ? null : { year, month, day }
      }
    });
  };

  const prevMonth = () => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const goToday   = () => {
    setCalMonth(new Date());
    dispatch({ type: 'SET_FILTER', payload: { deadlineDay: null } });
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

      <div className={styles.calendar}>
        <div className={styles.calHeader}>
          <button className={styles.navBtn} onClick={prevMonth}>‹</button>
          <button className={styles.monthLabel} onClick={goToday}>
            {MONTHS[month]} {year}
          </button>
          <button className={styles.navBtn} onClick={nextMonth}>›</button>
        </div>

        <div className={styles.calGrid}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <div key={d} className={styles.calDayName}>{d}</div>
          ))}
          {calCells.map((d, i) => {
            const isToday   = d === todayDate.getDate() &&
                              month === todayDate.getMonth() &&
                              year === todayDate.getFullYear();
            const isSelected = selectedDate?.day === d &&
                               selectedDate?.month === month &&
                               selectedDate?.year === year;
            const hasTasks  = d && deadlineDays.has(d);

            return (
              <div
                key={i}
                className={`
                  ${styles.calCell}
                  ${!d ? styles.empty : ''}
                  ${isToday ? styles.today : ''}
                  ${isSelected ? styles.selected : ''}
                  ${hasTasks ? styles.hasDeadline : ''}
                `}
                onClick={() => handleDayClick(d)}
              >
                {d || ''}
                {hasTasks && <span className={styles.dot} />}
              </div>
            );
          })}
        </div>

        {selectedDate && (
          <button className={styles.clearDay} onClick={goToday}>
            Clear date filter ×
          </button>
        )}
      </div>
    </div>
  );
}

