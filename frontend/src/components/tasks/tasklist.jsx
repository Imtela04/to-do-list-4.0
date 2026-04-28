import { useApp } from '@/context/AppContext';
import { useState, useEffect } from 'react';
import TaskCard from './taskcard';
import AddTask from './addtask';
import FilterBar from '@/components/layout/filterbar';
import styles from './tasklist.module.css';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react'
const PAGE_SIZE = 8;

export default function TaskList() {
  const { filteredTasks, state, dispatch } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [page, setPage] = useState(1);
  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [state.filter]);

  const totalPages = Math.ceil(filteredTasks.length / PAGE_SIZE);
  const paginated  = filteredTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className={styles.container}>
      <FilterBar />
      {state.filter.deadlineDay && (
        <div className={styles.dateChip}>
          <Calendar/> {format(
            new Date(
              state.filter.deadlineDay.year,
              state.filter.deadlineDay.month,
              state.filter.deadlineDay.day
            ),
            'MMMM d, yyyy'
          )}
          <button
            className={styles.dateChipClear}
            onClick={() => dispatch({ type: 'SET_FILTER', payload: { deadlineDay: null } })}
          >
            -
          </button>
        </div>
      )}
      {filteredTasks.length > 0 && (
        <p className={styles.count}>
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
          {state.filter.status !== 'all' ? ` ${state.filter.status}` : ''}
          {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ''}
        </p>
      )}

      <div className={styles.list}>
        {state.loading.tasks ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Loading tasks...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>✓</span>
            <p className={styles.emptyTitle}>
              {state.filter.search || state.filter.category || state.filter.priority
                ? 'No tasks match your filters'
                : state.filter.status === 'completed'
                ? 'No completed tasks yet'
                : 'All clear!'}
            </p>
          </div>
        ) : (
          paginated.map((task, i) => (
            <TaskCard key={task.id} task={task} index={i} />
          ))
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setPage(1)}
            disabled={page === 1}
            title="First page"
          >
            «
          </button>
          <button
            className={styles.pageBtn}
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
            title="Previous page"
          >
            ‹
          </button>

          {/* Page number pills */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce((acc, p, idx, arr) => {
              // insert ellipsis where there are gaps
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className={styles.ellipsis}>…</span>
              ) : (
                <button
                  key={p}
                  className={`${styles.pageBtn} ${page === p ? styles.pageActive : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              )
            )}

          <button
            className={styles.pageBtn}
            onClick={() => setPage(p => p + 1)}
            disabled={page === totalPages}
            title="Next page"
          >
            ›
          </button>
          <button
            className={styles.pageBtn}
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            title="Last page"
          >
            »
          </button>
        </div>
      )}

      <AddTask open={addOpen} setOpen={setAddOpen} />
      <button className={styles.fab} onClick={() => setAddOpen(true)}>+</button>
    </div>
  );
}