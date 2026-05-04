import { useTasksQuery } from '@/hooks/useTasksQuery';  // add this
import styles from '@/components/widgets/stats.module.css';

const RADIUS = 28;
const CIRC   = 2 * Math.PI * RADIUS;

export default function StatsWidget() {
  const { data: tasks = [] } = useTasksQuery();

  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const active    = total - completed;
  const overdue   = tasks.filter(t => {
    if (!t.deadline || t.completed) return false;
    return new Date(t.deadline) < new Date();
  }).length;

  const byPriority = {
    critical: tasks.filter(t => t.priority === 'critical' && !t.completed).length,
    high:     tasks.filter(t => t.priority === 'high'     && !t.completed).length,
    medium:   tasks.filter(t => t.priority === 'medium'   && !t.completed).length,
    low:      tasks.filter(t => t.priority === 'low'      && !t.completed).length,
  };

  const rate   = total > 0 ? Math.round((completed / total) * 100) : 0;
  const offset = CIRC - (rate / 100) * CIRC;

  return (
    <div className={styles.widget}>

      {/* Top row — ring + stats */}
      <div className={styles.topRow}>

        {/* Circular progress */}
        <div className={styles.ringWrap}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle
              cx="36" cy="36" r={RADIUS}
              fill="none"
              stroke="var(--bg-glass)"
              strokeWidth="6"
            />

            <circle
              cx="36" cy="36" r={RADIUS}
              fill="none"
              stroke="url(#grad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              transform="rotate(-90 36 36)"
              style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1)' }}
            />
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="var(--accent-primary)" />
                <stop offset="100%" stopColor="var(--accent-secondary)" />
              </linearGradient>
            </defs>
          </svg>
          <div className={styles.ringLabel}>
            <span className={styles.ringPct}>{rate}%</span>
            <span className={styles.ringSub}>done</span>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.statsCol}>
          <div className={styles.statRow}>
            <span className={styles.statDot} style={{ background: 'var(--text-muted)' }} />
            <span className={styles.statName}>Total</span>
            <span className={styles.statVal}>{total}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statDot} style={{ background: 'var(--accent-tertiary)' }} />
            <span className={styles.statName}>Done</span>
            <span className={styles.statVal}>{completed}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statDot} style={{ background: 'var(--accent-primary)' }} />
            <span className={styles.statName}>Active</span>
            <span className={styles.statVal}>{active}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statDot} style={{ background: overdue > 0 ? 'var(--danger)' : 'var(--text-muted)' }} />
            <span className={styles.statName}>Overdue</span>
            <span className={styles.statVal} style={{ color: overdue > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
              {overdue}
            </span>
          </div>
        </div>
      </div>

      {/* Priority breakdown */}
      {active > 0 && (
        <div className={styles.breakdown}>
          {Object.entries(byPriority).map(([p, count]) => count > 0 && (
            <div key={p} className={styles.breakdownRow}>
              <span className={styles.breakdownName}>{p}</span>
              <div className={styles.breakdownBar}>
                <div
                  className={styles.breakdownFill}
                  style={{
                    width: `${(count / active) * 100}%`,
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