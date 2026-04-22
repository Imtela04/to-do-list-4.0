import { useApp } from '../context/AppContext';
import styles from './StatsWidget.module.css';

export default function StatsWidget() {
  const { state } = useApp();
  const tasks = state.tasks;

  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const active = total - completed;
  const overdue = tasks.filter(t => {
    if (!t.due_date || t.completed) return false;
    return new Date(t.due_date) < new Date();
  }).length;

  const byPriority = {
    critical: tasks.filter(t => t.priority === 'critical' && !t.completed).length,
    high: tasks.filter(t => t.priority === 'high' && !t.completed).length,
    medium: tasks.filter(t => t.priority === 'medium' && !t.completed).length,
    low: tasks.filter(t => t.priority === 'low' && !t.completed).length,
  };

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <span className={styles.title}>Overview</span>
        <span className={styles.rate}>{completionRate}% done</span>
      </div>

      <div className={styles.grid}>
        <div className={styles.stat}>
          <span className={styles.statNum} style={{ color: 'var(--accent-primary)' }}>{total}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum} style={{ color: 'var(--accent-tertiary)' }}>{completed}</span>
          <span className={styles.statLabel}>Done</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum} style={{ color: 'var(--accent-warm)' }}>{active}</span>
          <span className={styles.statLabel}>Active</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum} style={{ color: 'var(--priority-critical)' }}>{overdue}</span>
          <span className={styles.statLabel}>Overdue</span>
        </div>
      </div>

      {total > 0 && (
        <div className={styles.breakdown}>
          <span className={styles.breakdownLabel}>By priority (active)</span>
          {Object.entries(byPriority).map(([p, count]) => count > 0 && (
            <div key={p} className={styles.breakdownRow}>
              <span className={styles.breakdownName}>{p}</span>
              <div className={styles.breakdownBar}>
                <div
                  className={styles.breakdownFill}
                  style={{
                    width: `${(count / active || 0) * 100}%`,
                    background: `var(--priority-${p})`
                  }}
                />
              </div>
              <span className={styles.breakdownCount}>{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
