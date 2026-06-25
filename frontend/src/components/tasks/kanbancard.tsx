import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format, isPast, isToday } from 'date-fns';
import { Paperclip, Hourglass, RotateCcw } from 'lucide-react';
import type { Task } from '@/types';
import styles from './kanban.module.css';

const PRIORITY_COLORS: Record<string, string> = {
  low:      'var(--priority-low)',
  medium:   'var(--priority-medium)',
  high:     'var(--priority-high)',
  critical: 'var(--priority-critical)',
};

// ── Shared card content (no drag hooks) ──────────────────────
export function KanbanCardInner({ task }: { task: Task }) {
  const subtasks   = task.subtasks ?? [];
  const doneCount  = subtasks.filter(s => s.completed).length;
  const dueDate    = task.deadline ? new Date(task.deadline) : null;
  const isTimed    = dueDate ? !(dueDate.getHours() === 23 && dueDate.getMinutes() === 59) : false;
  const isOverdue  = dueDate && !task.completed
    ? (isTimed ? isPast(dueDate) : isPast(dueDate) && !isToday(dueDate))
    : false;

  return (
    <>
      <div className={styles.priorityBar} style={{ background: PRIORITY_COLORS[task.priority] ?? 'var(--text-muted)' }} />

      <p className={`${styles.cardTitle} ${task.completed ? styles.cardCompleted : ''}`}>
        {task.title}
      </p>

      <div className={styles.cardMeta}>
        {task.category && (
          <span className={styles.chip}>{task.category.icon} {task.category.name}</span>
        )}
        {dueDate && (
          <span className={`${styles.chip} ${isOverdue ? styles.chipOverdue : ''}`}>
            <Hourglass size={9} />
            {isOverdue ? 'Overdue' : format(dueDate, 'MMM d')}
          </span>
        )}
        {(task.attachments?.length ?? 0) > 0 && (
          <span className={styles.chip}>
            <Paperclip size={9} /> {task.attachments.length}
          </span>
        )}
        {task.recurrence && !task.completed && (
          <span className={styles.chip}><RotateCcw size={9} /> {task.recurrence}</span>
        )}
      </div>

      {subtasks.length > 0 && (
        <div className={styles.progressWrap}>
          <div className={styles.progressTrack}>
            <div
              className={`${styles.progressFill} ${doneCount === subtasks.length ? styles.progressDone : ''}`}
              style={{ width: `${(doneCount / subtasks.length) * 100}%` }}
            />
          </div>
          <span className={styles.progressText}>{doneCount}/{subtasks.length}</span>
        </div>
      )}
    </>
  );
}

// ── Draggable card ────────────────────────────────────────────
interface Props {
  task:    Task;
  onClick: () => void;
}

export default function KanbanCard({ task, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''}`}
      onClick={() => { if (!isDragging) onClick(); }}
      {...attributes}
      {...listeners}
    >
      <KanbanCardInner task={task} />
    </div>
  );
}