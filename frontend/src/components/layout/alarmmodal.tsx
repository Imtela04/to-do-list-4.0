import { useEffect, useState } from 'react';
import type { Task } from '@/types';
import styles from './alarmmodal.module.css';
import { BellRing, ClockAlert } from 'lucide-react';

interface AlarmEvent {
  task: Task;
  type: 'warn' | 'due';
}

let listener: ((e: AlarmEvent) => void) | null = null;
export function fireAlarmEvent(e: AlarmEvent) {
  listener?.(e);
}

export default function AlarmModal() {
  const [queue, setQueue] = useState<AlarmEvent[]>([]);
  const current           = queue[0] ?? null;

  useEffect(() => {
    listener = (e) => setQueue(q => [...q, e]);
    return () => { listener = null; };
  }, []);

  if (!current) return null;

  const isWarn = current.type === 'warn';
  const dismiss = () => setQueue(q => q.slice(1));

  return (
    <div className={styles.backdrop}>
      <div className={`${styles.modal} ${isWarn ? styles.modalWarn : styles.modalDue}`}>
        <div className={styles.icon}>
          {isWarn ? <ClockAlert/> : <BellRing/>}
        </div>
        <div className={styles.content}>
          <p className={`${styles.label} ${isWarn ? styles.labelWarn : styles.labelDue}`}>
            {isWarn ? 'Due in 15 minutes' : 'Due now'}
          </p>
          <p className={styles.title}>{current.task.title}</p>
          {current.task.category && (
            <p className={styles.category}>
              {current.task.category.icon} {current.task.category.name}
            </p>
          )}
        </div>
        {queue.length > 1 && (
          <p className={styles.more}>
            +{queue.length - 1} more alarm{queue.length > 2 ? 's' : ''}
          </p>
        )}
        <button
          className={`${styles.dismissBtn} ${isWarn ? styles.dismissWarn : styles.dismissDue}`}
          onClick={dismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}