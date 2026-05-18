import { getFilteredTasks } from '@/utils/filterTasks';
import { mockTask } from '../utils';

const base = {
  search: '', category: null, priority: null,
  status: 'all' as const, sort: 'newest' as const,
  dateFrom: null, dateTo: null, deadlineDay: null,
};

describe('getFilteredTasks – edge cases', () => {
  test('uncategorised filter excludes tasks with a category', () => {
    const tasks = [
      mockTask({ id: 1, category: null }),
      mockTask({ id: 2, category: { id: 1, name: 'Work', icon: '💼' } }),
    ];
    const result = getFilteredTasks(tasks, { ...base, category: 'uncategorised' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  test('deadline sort puts tasks without deadline last', () => {
    const tasks = [
      mockTask({ id: 1, deadline: null }),
      mockTask({ id: 2, deadline: new Date(Date.now() + 86400000).toISOString() }),
    ];
    const result = getFilteredTasks(tasks, { ...base, sort: 'deadline' });
    expect(result[0].id).toBe(2);
    expect(result[1].id).toBe(1);
  });

  test('completed tasks always come last regardless of pin', () => {
    const tasks = [
      mockTask({ id: 1, completed: true,  pinned: true  }),
      mockTask({ id: 2, completed: false, pinned: false }),
    ];
    const result = getFilteredTasks(tasks, base);
    expect(result[0].id).toBe(2);
    expect(result[1].id).toBe(1);
  });

  test('dateFrom filter excludes tasks before range', () => {
    const tasks = [
      mockTask({ id: 1, deadline: '2025-01-01T00:00:00Z' }),
      mockTask({ id: 2, deadline: '2026-01-01T00:00:00Z' }),
    ];
    const result = getFilteredTasks(tasks, { ...base, dateFrom: '2025-06-01' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  test('deadlineDay filter matches only exact day', () => {
    const today = new Date();
    const tasks = [
      mockTask({ id: 1, deadline: today.toISOString() }),
      mockTask({ id: 2, deadline: new Date(Date.now() + 86400000 * 3).toISOString() }),
    ];
    const result = getFilteredTasks(tasks, {
      ...base,
      deadlineDay: { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() },
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  test('empty task list returns empty array', () => {
    expect(getFilteredTasks([], base)).toEqual([]);
  });
});