import { useApp } from '@/context/AppContext';
import styles from './filterbar.module.css';
import { CalendarArrowDown, CalendarArrowUp, CircleAlert, CalendarClock, ArrowDownAZ } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'newest',   label: 'Newest',   icon: CalendarArrowDown },
  { value: 'oldest',   label: 'Oldest',   icon: CalendarArrowUp   },
  { value: 'priority', label: 'Priority', icon: CircleAlert        },
  { value: 'deadline', label: 'Deadline', icon: CalendarClock      },
  { value: 'alpha',    label: 'A→Z',      icon: ArrowDownAZ        },
];

export default function FilterBar() {
  const { state, dispatch } = useApp();
  const { filter, categories } = state;

  const set = (key, val) => dispatch({ type: 'SET_FILTER', payload: { [key]: val } });

  const hasDateFilter = filter.dateFrom || filter.dateTo;

  return (
    <div className={styles.bar}>
      {/* Search */}
      <div className={styles.searchWrap}>
        <svg className={styles.searchIcon} viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="6.5" cy="6.5" r="4.5" />
          <path d="M10 10l3.5 3.5" strokeLinecap="round" />
        </svg>
        <input
          className={styles.search}
          placeholder="Search tasks..."
          value={filter.search}
          onChange={e => set('search', e.target.value)}
        />
        {filter.search && (
          <button className={styles.clearSearch} onClick={() => set('search', '')}>×</button>
        )}
      </div>

      {/* Status + Priority + Category */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          {['all', 'active', 'completed'].map(s => (
            <button
              key={s}
              className={`${styles.filterBtn} ${filter.status === s ? styles.active : ''}`}
              onClick={() => set('status', s)}
            >
              {s}
            </button>
          ))}
        </div>

        <select
          className={styles.select}
          value={filter.priority || ''}
          onChange={e => set('priority', e.target.value || null)}
        >
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>

        <select
          className={styles.select}
          value={filter.category || ''}
          onChange={e => set('category', e.target.value ? parseInt(e.target.value) : null)}
        >
          <option value="">All categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Sort — icon buttons instead of select */}
      <div className={styles.sortRow}>
        <span className={styles.sortLabel}>Sort</span>
        <div className={styles.sortGroup}>
          {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              className={`${styles.sortBtn} ${filter.sort === value ? styles.sortActive : ''}`}
              onClick={() => set('sort', value)}
              title={label}
            >
              <Icon size={13} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date filter */}
      <div className={styles.dateRow}>
        <span className={styles.sortLabel}>Deadline</span>
        <div className={styles.dateInputs}>
          <input
            type="date"
            className={`${styles.dateInput} ${filter.dateFrom ? styles.dateActive : ''}`}
            value={filter.dateFrom || ''}
            onChange={e => set('dateFrom', e.target.value || null)}
            title="From date"
          />
          <span className={styles.dateSep}>→</span>
          <input
            type="date"
            className={`${styles.dateInput} ${filter.dateTo ? styles.dateActive : ''}`}
            value={filter.dateTo || ''}
            onChange={e => set('dateTo', e.target.value || null)}
            title="To date"
          />
          {hasDateFilter && (
            <button
              className={styles.clearDate}
              onClick={() => { set('dateFrom', null); set('dateTo', null); }}
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}