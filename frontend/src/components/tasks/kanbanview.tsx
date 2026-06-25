import { useState, useMemo } from 'react';
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, useDroppable,
  type DragEndEvent, type DragStartEvent, type DragOverEvent,
} from '@dnd-kit/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTasksQuery } from '@/hooks/useTasksQuery';
import { updateTask, toggleTask, createTask } from '@/api/services';
import { getFilteredTasks } from '@/utils/filterTasks';
import { useAppStore } from '@/store/useAppStore';
import type { Task } from '@/types';
import KanbanCard, { KanbanCardInner } from './kanbancard';
import styles from './kanban.module.css'
import { Plus } from 'lucide-react';
import FilterBar from '../layout/filterbar';


// ── Column config ─────────────────────────────────────────────
const COLUMNS = [
  { id: 'todo',        label: 'To Do',       dot: '#6b6b8a',  color: 'var(--text-secondary)' },
  { id: 'in-progress', label: 'In Progress', dot: '#7c6aff',  color: 'var(--accent-primary)' },
  { id: 'done',        label: 'Done',        dot: '#6affdc',  color: 'var(--accent-tertiary)' },
] as const;

type ColId = 'todo' | 'in-progress' | 'done';

function getTaskColumn(task: Task): ColId {
  if (task.completed) return 'done';
  if (task.pinned)    return 'in-progress';
  return 'todo';
}

// ── Droppable column wrapper ──────────────────────────────────
function DroppableColumn({ id, isOver, children }: { id: ColId; isOver: boolean; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${styles.columnBody} ${isOver ? styles.columnDropOver : ''}`}>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
interface Props {
  onViewTask?: (taskId: number) => void;
}

export default function KanbanView({ onViewTask }: Props) {
  const queryClient = useQueryClient();
  const filter      = useAppStore(s => s.filter);
  const updateXp    = useAppStore(s => s.updateXp);
  const limits      = useAppStore(s => s.limits);
  const counts      = useAppStore(s => s.counts);
  const { data: tasks = [] } = useTasksQuery();

  const [activeTask,     setActiveTask]     = useState<Task | null>(null);
  const [overId,         setOverId]         = useState<ColId | null>(null);
  const [addingInCol,    setAddingInCol]    = useState<ColId | null>(null);
  const [newTitle,       setNewTitle]       = useState('');

  const tasksLocked = limits.tasks !== null && counts.tasks >= limits.tasks;

  // Apply existing filters, then split by column
  const filtered = useMemo(() => getFilteredTasks(tasks, filter), [tasks, filter]);

  const columns = useMemo(() => ({
    'todo':        filtered.filter(t => getTaskColumn(t) === 'todo'),
    'in-progress': filtered.filter(t => getTaskColumn(t) === 'in-progress'),
    'done':        filtered.filter(t => getTaskColumn(t) === 'done'),
  }), [filtered]);

  // ── Drag sensors ──────────────────────────────────────────
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // ── Move mutation (handles XP via toggleTask for done) ────
  const moveMutation = useMutation({
    mutationFn: async ({ task, to }: { task: Task; to: ColId }) => {
      if (to === 'done' && !task.completed)
        return toggleTask(task.id, true);
      if (task.completed && to !== 'done')
        return toggleTask(task.id, false);
      return updateTask(task.id, { pinned: to === 'in-progress', completed: false });
    },
    onMutate: async ({ task, to }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData<Task[]>(['tasks']);
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => t.id === task.id
          ? { ...t, completed: to === 'done', pinned: to === 'in-progress' }
          : t) ?? []
      );
      return { previous };
    },
    onSuccess: (res: any) => {
      const xpResult = res?.data?.xp_result;
      const updatedTask = res?.data?.task;
      if (xpResult)    updateXp(xpResult);
      if (updatedTask) {
        queryClient.setQueryData<Task[]>(['tasks'], old =>
          old?.map(t => t.id === updatedTask.id ? updatedTask : t) ?? []
        );
      }
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.previous) queryClient.setQueryData(['tasks'], ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  // ── Add task in a column ──────────────────────────────────
  const addMutation = useMutation({
    mutationFn: async ({ title, col }: { title: string; col: ColId }) => {
      const res = await createTask({ title, priority: 'medium' });
      if (col === 'in-progress') await updateTask(res.data.id, { pinned: true });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setNewTitle('');
      setAddingInCol(null);
    },
  });

  // ── DnD handlers ─────────────────────────────────────────
  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTask(tasks.find(t => t.id === active.id) ?? null);
  };

  const handleDragOver = ({ over }: DragOverEvent) => {
    setOverId((over?.id as ColId) ?? null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    setOverId(null);
    if (!over) return;
    const task = tasks.find(t => t.id === active.id);
    const to   = over.id as ColId;
    if (!task || getTaskColumn(task) === to) return;
    moveMutation.mutate({ task, to });
  };

  // ── Add task handler ──────────────────────────────────────
  const handleAdd = (col: ColId) => {
    if (!newTitle.trim() || tasksLocked) return;
    addMutation.mutate({ title: newTitle.trim(), col });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
    <FilterBar/>
      <div className={styles.board}>
        {COLUMNS.map(col => (
          <div key={col.id} className={styles.column}>

            {/* Header */}
            <div className={styles.columnHeader}>
              <span className={styles.columnDot} style={{ background: col.dot }} />
              <span className={styles.columnTitle} style={{ color: col.color }}>{col.label}</span>
              <span className={styles.columnCount}>{columns[col.id].length}</span>
            </div>

            {/* Droppable body */}
            <DroppableColumn id={col.id} isOver={overId === col.id}>
              {columns[col.id].length === 0 && !addingInCol && (
                <p className={styles.empty}>No tasks here</p>
              )}
              {columns[col.id].map(task => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  onClick={() => onViewTask?.(task.id)}
                />
              ))}

              {/* Inline add form */}
              {addingInCol === col.id && (
                <div className={styles.addForm}>
                  <input
                    autoFocus
                    className={styles.addInput}
                    placeholder="Task title..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter')  handleAdd(col.id);
                      if (e.key === 'Escape') { setAddingInCol(null); setNewTitle(''); }
                    }}
                  />
                  <div className={styles.addFormActions}>
                    <button className={styles.addFormCancel} onClick={() => { setAddingInCol(null); setNewTitle(''); }}>
                      Cancel
                    </button>
                    <button
                      className={styles.addFormConfirm}
                      onClick={() => handleAdd(col.id)}
                      disabled={addMutation.isPending || !newTitle.trim()}
                    >
                      {addMutation.isPending ? '...' : 'Add'}
                    </button>
                  </div>
                </div>
              )}
            </DroppableColumn>

            {/* Add button (not in Done column) */}
            {col.id !== 'done' && addingInCol !== col.id && (
              <button
                className={styles.addBtn}
                onClick={() => { if (!tasksLocked) { setAddingInCol(col.id); setNewTitle(''); } }}
                disabled={tasksLocked}
                title={tasksLocked ? 'Task limit reached' : `Add to ${col.label}`}
              >
                <Plus size={13} />
                Add task
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Drag overlay — renders above everything while dragging */}
      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <div className={`${styles.card} ${styles.cardOverlay}`}>
            <KanbanCardInner task={activeTask} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}