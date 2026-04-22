import { useApp } from '../context/AppContext';
import styles from './FilterBar.module.css';

export default function FilterBar() {
  const { state, dispatch } = useApp();
  const { filter, categories } = state;

  const set = (key, val) => dispatch({ type: 'SET_FILTER', payload: { [key]: val } });

  return (
    <div className={styles.bar}>
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
    </div>
  );
}
