import { useAppStore } from '../../store/useAppStore';
import { useState, useEffect } from 'react';
import { useTasksQuery } from '@/hooks/useTasksQuery';
import TaskCard from './taskcard';
import AddTask from './addtask';
import FilterBar from '@/components/layout/filterbar';
import styles from './tasklist.module.css';
import { format } from 'date-fns';
import { Calendar, Lock } from 'lucide-react';
import { getFilteredTasks } from '@/utils/filterTasks';
import { reorderTasks } from '@/api/services';
import { Download } from 'lucide-react';

import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  arrayMove, 
} from '@dnd-kit/sortable';

const PAGE_SIZE = 5;

export default function TaskList() {
  const filter    = useAppStore(s => s.filter);
  const limits    = useAppStore(s => s.limits);
  const level     = useAppStore(s => s.level);
  const setFilter = useAppStore(s => s.setFilter);
  const [localOrder, setLocalOrder] = useState<number[]>([]);
  const { data: tasks = [] } = useTasksQuery();
  const filteredTasks = getFilteredTasks(tasks, filter);
  const [addOpen, setAddOpen] = useState(false);
  const [page, setPage]       = useState(1);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLocalOrder(prev => {
      const oldIdx = prev.indexOf(Number(active.id));
      const newIdx = prev.indexOf(Number(over.id));
      const newOrder = arrayMove(prev, oldIdx, newIdx);

      // Persist — fire and forget, optimistic update already applied
      reorderTasks(newOrder).catch(() => {
        // Rollback on failure
        setLocalOrder(prev);
      });

      return newOrder;
    });
  };
  const totalPages  = Math.ceil(filteredTasks.length / PAGE_SIZE);
  const paginated   = filteredTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setLocalOrder(filteredTasks.map(t => t.id)); }, [tasks]);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 6 }, // prevents accidental drags
  }));



  useEffect(() => { setPage(1); }, [filter]);

// correct — uses the server-side count which excludes onboarding
  const counts = useAppStore(s => s.counts);
  const tasksLocked = limits.tasks !== null && counts.tasks >= limits.tasks;
  const pageItems = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
      acc.push(p);
      return acc;
    }, []);

    const handleExportCsv = () => {
    const headers = ['Title', 'Priority', 'Status', 'Category', 'Deadline', 'Created'];
    const rows = filteredTasks.map(t => [
      `"${t.title.replace(/"/g, '""')}"`,
      t.priority,
      t.completed ? 'completed' : 'active',
      t.category ? t.category.name : '',
      t.deadline ? new Date(t.deadline).toLocaleDateString() : '',
      new Date(t.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'tasks.csv' });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <FilterBar />
      {filter.deadlineDay && (
        <div className={styles.dateChip}>
          <Calendar /> {format(
            new Date(filter.deadlineDay.year, filter.deadlineDay.month, filter.deadlineDay.day),
            'MMMM d, yyyy'
          )}
          <button className={styles.dateChipClear} onClick={() => setFilter({ deadlineDay: null })}>
            -
          </button>
        </div>
      )}

      {filteredTasks.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p className={styles.count}>
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
            {filter.status !== 'all' ? ` ${filter.status}` : ''}
            {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ''}
          </p>
          <button
            className={styles.exportBtn}
            onClick={handleExportCsv}
            title="Export Filtered Tasks As CSV"
          >
            <Download size={13} /> CSV
          </button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={localOrder} strategy={verticalListSortingStrategy}>
        <div className={styles.list}>
          {paginated
            .slice()
            .sort((a, b) => localOrder.indexOf(a.id) - localOrder.indexOf(b.id))
            .map((task, i) => (
              <TaskCard key={task.id} task={task} index={i} />
            ))}
        </div>
      </SortableContext>
    </DndContext>


      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} onClick={() => setPage(1)} disabled={page === 1} title="First page">«</button>
          <button className={styles.pageBtn} onClick={() => setPage(p => p - 1)} disabled={page === 1} title="Previous page">‹</button>

          {pageItems.map((p, i) =>
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

          <button className={styles.pageBtn} onClick={() => setPage(p => p + 1)} disabled={page === totalPages} title="Next page">›</button>
          <button className={styles.pageBtn} onClick={() => setPage(totalPages)} disabled={page === totalPages} title="Last page">»</button>
        </div>
      )}

      <AddTask open={addOpen} setOpen={setAddOpen} />
      <button
        className={`${styles.fab} ${tasksLocked ? styles.fabLocked : ''}`}
        onClick={() => { if (tasksLocked) return; setAddOpen(true); }}
        title={tasksLocked ? `Reach Level ${level + 1} to add more tasks` : 'Add task'}
      >
        {tasksLocked ? <Lock size={20} /> : '+'}
      </button>
    </div>
  );
}