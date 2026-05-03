// import { useAppStore } from '../../store/useAppStore';

import { useAppStore } from '../../store/useAppStore';
import { useState, useEffect } from 'react';
import TaskCard from './taskcard';
import AddTask from './addtask';
import FilterBar from '@/components/layout/filterbar';
import styles from './tasklist.module.css';
import { format } from 'date-fns';
import { Calendar, Lock, Plus } from 'lucide-react'
const PAGE_SIZE = 8;

export default function TaskList() {
  const filter     = useAppStore(s => s.filter);
  const loading    = useAppStore(s => s.loading);
  const tasks      = useAppStore(s => s.tasks);
  const limits     = useAppStore(s => s.limits);
  const level      = useAppStore(s => s.level);
  const setFilter  = useAppStore(s => s.setFilter);
  const getFilteredTasks = useAppStore(s => s.getFilteredTasks);
  const filteredTasks = getFilteredTasks();  const [addOpen, setAddOpen] = useState(false);
  const [page, setPage] = useState(1);
  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [filter]);

  const totalPages = Math.ceil(filteredTasks.length / PAGE_SIZE);
  const paginated  = filteredTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const tasksLocked = limits.tasks !== null &&
    tasks.length >= limits.tasks;

  return (
    <div className={styles.container}>
      <FilterBar />
      {filter.deadlineDay && (
        <div className={styles.dateChip}>
          <Calendar/> {format(
            new Date(
              filter.deadlineDay.year,
              filter.deadlineDay.month,
              filter.deadlineDay.day
            ),
            'MMMM d, yyyy'
          )}
          <button
            className={styles.dateChipClear}
            onClick={() => setFilter({ deadlineDay: null })}
          >
            -
          </button>
        </div>
      )}
      {filteredTasks.length > 0 && (
        <p className={styles.count}>
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
          {filter.status !== 'all' ? ` ${filter.status}` : ''}
          {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ''}
        </p>
      )}

      <div className={styles.list}>
        {loading.tasks ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Loading tasks...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>✓</span>
            <p className={styles.emptyTitle}>
              {filter.search || filter.category || filter.priority
                ? 'No tasks match your filters'
                : filter.status === 'completed'
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
      <button
        className={`${styles.fab} ${tasksLocked ? styles.fabLocked : ''}`}
        onClick={() => {
          if (tasksLocked) return; // AddTask's handleSubmit will show the error
          setAddOpen(true);
        }}
        title={tasksLocked ? `Reach Level ${level + 1} to add more tasks` : 'Add task'}
      >
        {tasksLocked ? <Lock size={20} /> : '+'}
      </button>
    </div>
  );
}