import { useAppStore } from '../../store/useAppStore';
import { useState, useEffect } from 'react';
import { useTasksQuery } from '@/hooks/useTasksQuery';
import TaskCard from './taskcard';
import FilterBar from '@/components/layout/filterbar';
import styles from './tasklist.module.css';
import { format } from 'date-fns';
import { Calendar, List, ListCheck, PencilRuler, Trash, X } from 'lucide-react';
import { getFilteredTasks } from '@/utils/filterTasks';
import { reorderTasks } from '@/api/services';
import { Download } from 'lucide-react';
import { toggleTask, deleteTask } from '@/api/services';
import { useQueryClient } from '@tanstack/react-query';
import { CheckSquare } from 'lucide-react';

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
  const filter                                = useAppStore(s => s.filter);
  const limits                                = useAppStore(s => s.limits);
  const setFilter                             = useAppStore(s => s.setFilter);
  const [localOrder, setLocalOrder]           = useState<number[]>([]);
  const { data: tasks = [] }                  = useTasksQuery();
  const filteredTasks                         = getFilteredTasks(tasks, filter);
  const [page, setPage]                       = useState(1);
  const queryClient                           = useQueryClient();
  const [selectMode, setSelectMode]           = useState(false);
  const [selected, setSelected]               = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading]         = useState(false);
  const focusTaskId                           = useAppStore(s => s.focusTaskId);

  useEffect(() => {
    if (focusTaskId == null) return;
    const idx = filteredTasks.findIndex(t => t.id === focusTaskId);
    if (idx === -1) return;
    setPage(Math.floor(idx / PAGE_SIZE) + 1);
  }, [focusTaskId, filteredTasks]);

  const toggleSelect = (id: number) =>
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const selectAll = () =>
    setSelected(selected.size === paginated.length
      ? new Set()
      : new Set(paginated.map(t => t.id)));

  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()); };

  const bulkComplete = async () => {
    setBulkLoading(true);
    const incomplete = [...selected].filter(id => tasks.find(t => t.id === id && !t.completed));
    await Promise.allSettled(incomplete.map(id => toggleTask(id, true)));
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    exitSelectMode();
    setBulkLoading(false);
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} task(s)?`)) return;
    setBulkLoading(true);
    await Promise.allSettled([...selected].map(id => deleteTask(id)));
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    await queryClient.invalidateQueries({ queryKey: ['attachments'] });
    exitSelectMode();
    setBulkLoading(false);
  };

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

  useEffect(() => { setLocalOrder(filteredTasks.map(t => t.id)); }, [tasks, filter]);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 6 }, // prevents accidental drags
  }));



  useEffect(() => { setPage(1); }, [filter]);

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
    const headers = ['Title', 'Description', 'Priority', 'Status', 'Category', 'Deadline', 'Created'];
    const rows = filteredTasks.map(t => [
      `"${t.title.replace(/"/g, '""')}"`,
      t.description,
      t.priority,
      t.completed ? 'completed' : 'active',
      t.category ? t.category.name : '',
      t.deadline ? new Date(t.deadline).toLocaleDateString() : 'null',
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
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <FilterBar />
        <button
          className={`${styles.selectToggle} ${selectMode ? styles.selectToggleActive : ''}`}
          onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
          title="Bulk Actions"
        >
          <PencilRuler size={14} />
        </button>
      </div>
      {selectMode && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkCount}>
            {selected.size} of {paginated.length} selected
          </span>
          <button className={styles.bulkBtn} onClick={selectAll} title={selected.size === paginated.length ? 'Deselect All' : 'Select All'}>
            {selected.size === paginated.length ? <List size={15}/> : <ListCheck size={15}/>}
          </button>
          <button
            className={`${styles.bulkBtn} ${styles.bulkBtnDone}`}
            onClick={bulkComplete}
            title='Mark All As Complete'
            disabled={bulkLoading || selected.size === 0}
          >
            <CheckSquare size={15}/>
          </button>
          <button
            className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`}
            onClick={bulkDelete}
            title='Delete All'
            disabled={bulkLoading || selected.size === 0}
          >
            <Trash size={15}/>
          </button>
          <button className={styles.bulkBtn} onClick={exitSelectMode} title='Cancel'><X size={15}/></button>
        </div>
      )}
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
              <TaskCard
                key={task.id}
                task={task}
                index={i}
                selectMode={selectMode}
                isSelected={selected.has(task.id)}
                onToggleSelect={toggleSelect}
              />
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

    </div>
  );
}