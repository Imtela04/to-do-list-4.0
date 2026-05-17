import { useEffect, useState } from 'react';
import { getHeatmap } from '@/api/services';
import { createPortal } from 'react-dom';
import styles from './heatmap.module.css';

const DAYS   = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getColor(count: number): string {
  if (count === 0) return 'var(--heat-0)';
  if (count === 1) return 'var(--heat-1)';
  if (count <= 3)  return 'var(--heat-2)';
  if (count <= 6)  return 'var(--heat-3)';
  return 'var(--heat-4)';
}

export default function Heatmap() {
  const [data, setData]       = useState<Record<string, number>>({});
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [weeks, setWeeks]     = useState<{ date: string; count: number }[][]>([]);
  const [months, setMonths]   = useState<{ label: string; col: number }[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    getHeatmap().then(res => setData(res.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const today   = new Date();
    const start   = new Date(today);
    start.setDate(today.getDate() - 364);
    start.setDate(start.getDate() - start.getDay());

    const allWeeks: { date: string; count: number }[][] = [];
    const monthLabels: { label: string; col: number }[] = [];
    let   cur = new Date(start);
    let   lastMonth = -1;

    while (cur <= today) {
      const week: { date: string; count: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const key   = cur.toISOString().slice(0, 10);
        const isFut = cur > today;
        week.push({ date: key, count: isFut ? -1 : (data[key] ?? 0) });

        if (!isFut && cur.getMonth() !== lastMonth) {
          monthLabels.push({ label: MONTHS[cur.getMonth()], col: allWeeks.length });
          lastMonth = cur.getMonth();
        }
        cur.setDate(cur.getDate() + 1);
      }
      allWeeks.push(week);
    }
    setWeeks(allWeeks);
    setMonths(monthLabels);
  }, [data]);

  const total = Object.values(data).reduce((a, b) => a + b, 0);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>Activity</span>
        <span className={styles.total}>{total} completions</span>
      </div>

      <div className={styles.grid}>
        {/* Day labels */}
        <div className={styles.dayLabels}>
          {DAYS.map((d, i) => <span key={i} className={styles.dayLabel}>{d}</span>)}
        </div>

        {/* Month labels + cells */}
        <div className={styles.right}>
            <div className={styles.monthRow}>
            {months.map(m => (
                <span
                key={m.col + m.label}
                className={styles.monthLabel}
                style={{ left: m.col * 12 }}
                >
                {m.label}
                </span>
            ))}
            </div>
          <div className={styles.cells}>
            {weeks.map((week, wi) => (
              <div key={wi} className={styles.week}>
                {week.map((cell, di) => (
                  <div
                    key={di}
                    className={`${styles.cell} ${cell.count < 0 ? styles.future : ''}`}
                    style={{ background: cell.count >= 0 ? getColor(cell.count) : undefined }}
                    onMouseEnter={e => {
                      if (cell.count < 0) return;
                      const r = (e.target as HTMLElement).getBoundingClientRect();
                      setTooltip({
                        text: cell.count === 0
                          ? `${cell.date} — no completions`
                          : `${cell.date} — ${cell.count} task${cell.count > 1 ? 's' : ''} completed`,
                        x: r.left + r.width / 2,
                        y: r.top - 6,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendLabel}>Less</span>
        {[0,1,2,3,4].map(i => (
          <div key={i} className={styles.legendCell} style={{ background: `var(--heat-${i})` }} />
        ))}
        <span className={styles.legendLabel}>More</span>
      </div>

    {tooltip && createPortal(
        <div className={styles.tooltip} style={{ left: tooltip.x, top: tooltip.y }}>
            {tooltip.text}
        </div>,
        document.body
        )}
    </div>
  );
}