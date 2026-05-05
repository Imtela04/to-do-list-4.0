import type { Task } from '@/types';
import type { Filter } from '@/store/useAppStore';

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

export function getFilteredTasks(tasks: Task[], filter: Filter): Task[] {
  return tasks
    .filter(task => {
      const { search, category, priority, status, dateFrom, dateTo, deadlineDay } = filter;
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (category === 'uncategorised') { if (task.category) return false; }
      else if (category)               { if (task.category?.id !== category) return false; }
      if (priority && task.priority !== priority) return false;
      if (status === 'active'    && task.completed)  return false;
      if (status === 'completed' && !task.completed) return false;
      if (dateFrom && task.deadline && new Date(task.deadline) < new Date(dateFrom)) return false;
      if (dateTo   && task.deadline && new Date(task.deadline) > new Date(dateTo))   return false;
      if (deadlineDay) {
        if (!task.deadline) return false;
        const d = new Date(task.deadline);
        if (d.getFullYear() !== deadlineDay.year ||
            d.getMonth()    !== deadlineDay.month ||
            d.getDate()     !== deadlineDay.day) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // pinned always first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      // completed always last(even pinned)
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      

      switch (filter.sort) {
        case 'newest':   return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':   return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'priority': return (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4);
        case 'deadline':
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'alpha': return a.title.localeCompare(b.title);
        default:      return 0;
      }
      
    });
}