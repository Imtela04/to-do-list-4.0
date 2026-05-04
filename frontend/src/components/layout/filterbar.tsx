import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useCategoriesQuery } from '@/hooks/useCategoriesQuery';
import type { Filter } from '@/store/useAppStore';
import styles from './filterbar.module.css';
import { ArrowUpDown, CalendarArrowDown, CalendarArrowUp, CircleAlert, CalendarClock, ArrowDownAZ, SlidersHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface SortOption {
  value: Filter['sort'];
  label: string;
  icon:  LucideIcon;
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'newest',   label: 'Newest',   icon: CalendarArrowDown },
  { value: 'oldest',   label: 'Oldest',   icon: CalendarArrowUp   },
  { value: 'priority', label: 'Priority', icon: CircleAlert        },
  { value: 'deadline', label: 'Deadline', icon: CalendarClock      },
  { value: 'alpha',    label: 'A→Z',      icon: ArrowDownAZ        },
];

const STATUSES  = ['all', 'active', 'completed'] as const;
const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

export default function FilterBar() {
  const filter    = useAppStore(s => s.filter);
  const setFilter = useAppStore(s => s.setFilter);
  const { data: categories = [] } = useCategoriesQuery();

  const set = <K extends keyof Filter>(key: K, val: Filter[K]): void => setFilter({ [key]: val });

  const [filtersPos, setFiltersPos]   = useState({ top: 0, right: 0 });
  const [sortOpen, setSortOpen]       = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtersBtnRef = useRef<HTMLButtonElement>(null);
  const sortRef       = useRef<HTMLDivElement>(null);
  const filtersRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen) return;
    const handler = (e: MouseEvent) => {
      if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sortOpen]);

  useEffect(() => {
    if (filtersOpen && filtersBtnRef.current) {
      const rect = filtersBtnRef.current.getBoundingClientRect();
      setFiltersPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
  }, [filtersOpen]);

  const currentSort      = SORT_OPTIONS.find(o => o.value === filter.sort);
  const activeFilterCount = [
    filter.priority,
    filter.category,
    filter.status !== 'all' ? filter.status : null,
    filter.dateFrom,
    filter.dateTo,
  ].filter(Boolean).length;

  const clearAll     = (): void => setFilter({ priority: null, category: null, status: 'all', dateFrom: null, dateTo: null });
  const hasDateFilter = filter.dateFrom ?? filter.dateTo;

  return (
    <div className={styles.bar}>
      <div className={styles.topRow}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6.5" cy="6.5" r="4.5" />
            <path d="M10 10l3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            className={styles.search}
            placeholder="Search..."
            value={filter.search}
            onChange={e => set('search', e.target.value)}
          />
          {filter.search && (
            <button className={styles.clearSearch} onClick={() => set('search', '')}>×</button>
          )}
        </div>

        <button
          className={`${styles.todayBtn} ${filter.deadlineDay ? styles.todayActive : ''}`}
          onClick={() => {
            if (filter.deadlineDay) {
              setFilter({ deadlineDay: null });
            } else {
              const today = new Date();
              setFilter({
                deadlineDay: { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() },
              });
            }
          }}
        >
          today
        </button>

        <div className={styles.sortWrap} ref={sortRef}>
          <button
            className={`${styles.sortTrigger} ${sortOpen ? styles.sortTriggerOpen : ''}`}
            onClick={() => setSortOpen(o => !o)}
          >
            {currentSort && <currentSort.icon size={13} />}
            <ArrowUpDown size={12} className={styles.sortChevron} />
          </button>
          {sortOpen && (
            <div className={styles.sortDropdown}>
              {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  className={`${styles.sortOption} ${filter.sort === value ? styles.sortOptionActive : ''}`}
                  onClick={() => { set('sort', value); setSortOpen(false); }}
                >
                  <Icon size={13} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.filtersWrap} ref={filtersRef}>
          <button
            ref={filtersBtnRef}
            className={`${styles.filtersTrigger} ${filtersOpen ? styles.filtersTriggerOpen : ''} ${activeFilterCount > 0 ? styles.filtersActive : ''}`}
            onClick={() => setFiltersOpen(o => !o)}
          >
            <SlidersHorizontal size={13} />
            {activeFilterCount > 0 && (
              <span className={styles.filtersBadge}>{activeFilterCount}</span>
            )}
          </button>

          {filtersOpen && (
            <div className={styles.filtersDropdown} style={{ top: filtersPos.top, right: filtersPos.right }}>
              <div className={styles.filtersDropdownHeader}>
                <span className={styles.filtersDropdownTitle}>Filters</span>
                {activeFilterCount > 0 && (
                  <button className={styles.clearAllBtn} onClick={clearAll}>Clear all</button>
                )}
              </div>

              <div className={styles.filterSection}>
                <span className={styles.filterSectionLabel}>Status</span>
                <div className={styles.filterGroup}>
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      className={`${styles.filterBtn} ${filter.status === s ? styles.active : ''}`}
                      onClick={() => set('status', s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterSection}>
                <span className={styles.filterSectionLabel}>Priority</span>
                <div className={styles.filterGroup}>
                  {PRIORITIES.map(p => (
                    <button
                      key={p}
                      className={`${styles.filterBtn} ${filter.priority === p ? styles.active : ''}`}
                      onClick={() => set('priority', filter.priority === p ? null : p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterSection}>
                <span className={styles.filterSectionLabel}>Category</span>
                <select
                  className={styles.select}
                  value={filter.category ?? ''}
                  onChange={e => set('category', e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">All categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.filterSection}>
                <span className={styles.filterSectionLabel}>Deadline range</span>
                <div className={styles.dateInputs}>
                  <input
                    type="date"
                    className={`${styles.dateInput} ${filter.dateFrom ? styles.dateActive : ''}`}
                    value={filter.dateFrom ?? ''}
                    onChange={e => set('dateFrom', e.target.value || null)}
                  />
                  <span className={styles.dateSep}>→</span>
                  <input
                    type="date"
                    className={`${styles.dateInput} ${filter.dateTo ? styles.dateActive : ''}`}
                    value={filter.dateTo ?? ''}
                    onChange={e => set('dateTo', e.target.value || null)}
                  />
                  {hasDateFilter && (
                    <button className={styles.clearDate} onClick={() => { set('dateFrom', null); set('dateTo', null); }}>×</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}