import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { mockTask } from '../utils';
import { getFilteredTasks } from '@/utils/filterTasks';

// reset store between tests
beforeEach(() => {
  useAppStore.getState().resetState();
});

describe('useAppStore - profile', () => {
  it('sets profile data correctly', () => {
    useAppStore.getState().setProfile({
      username:        'testuser',
      xp:              50,
      level:           2,
      streak:          3,
      next_level_xp:   150,
      pomodoros_today: 1,
      limits:          { tasks: 10, categories: 5, notes: 3 },
      counts:          { tasks: 2, categories: 1, notes: 0 },
    });

    const state = useAppStore.getState();
    expect(state.username).toBe('testuser');
    expect(state.xp).toBe(50);
    expect(state.level).toBe(2);
    expect(state.streak).toBe(3);
    expect(state.nextLevelXp).toBe(150);
    expect(state.limits.tasks).toBe(10);
  });

  it('updates xp correctly', () => {
    useAppStore.getState().updateXp({
      total_xp:   100,
      new_level:  2,
      streak:     5,
      leveled_up: true,
    });

    const state = useAppStore.getState();
    expect(state.xp).toBe(100);
    expect(state.level).toBe(2);
    expect(state.streak).toBe(5);
    expect(state.levelUpEvent).toEqual({ newLevel: 2 });
  });

  it('clears levelUpEvent', () => {
    useAppStore.getState().updateXp({ total_xp: 100, leveled_up: true, new_level: 2 });
    useAppStore.getState().clearLevelUp();
    expect(useAppStore.getState().levelUpEvent).toBeNull();
  });

  it('resets state correctly', () => {
    useAppStore.getState().setProfile({
      username: 'testuser', xp: 50, level: 2, streak: 3,
      next_level_xp: 150, pomodoros_today: 0,
      limits: { tasks: 10, categories: 5, notes: 3 },
      counts: { tasks: 2, categories: 1, notes: 0 },
    });

    useAppStore.getState().resetState();

    const state = useAppStore.getState();
    expect(state.username).toBe('');
    expect(state.xp).toBe(0);
    expect(state.level).toBe(1);
    expect(state.streak).toBe(0);
  });
});

describe('useAppStore - filters', () => {
  it('sets filter values', () => {
    useAppStore.getState().setFilter({ search: 'hello', priority: 'high' });
    const { filter } = useAppStore.getState();
    expect(filter.search).toBe('hello');
    expect(filter.priority).toBe('high');
  });

  it('merges filter values without overwriting others', () => {
    useAppStore.getState().setFilter({ priority: 'high' });
    useAppStore.getState().setFilter({ status: 'completed' });
    const { filter } = useAppStore.getState();
    expect(filter.priority).toBe('high');
    expect(filter.status).toBe('completed');
  });

  it('resets filter on resetState', () => {
    useAppStore.getState().setFilter({ priority: 'high', status: 'completed' });
    useAppStore.getState().resetState();
    const { filter } = useAppStore.getState();
    expect(filter.priority).toBeNull();
    expect(filter.status).toBe('all');
  });
});

describe('getFilteredTasks utility', () => {  // ← renamed
  const tasks = [
    mockTask({ id: 1, title: 'Buy groceries', priority: 'low',      completed: false }),
    mockTask({ id: 2, title: 'Write report',  priority: 'high',     completed: false }),
    mockTask({ id: 3, title: 'Old task',      priority: 'medium',   completed: true  }),
    mockTask({ id: 4, title: 'Critical bug',  priority: 'critical', completed: false,
      deadline: new Date(Date.now() + 86400000).toISOString() }),
  ];

  const defaultFilter = {
    search: '', category: null, priority: null,
    status: 'all', sort: 'newest', deadlineDay: null,
    dateFrom: null, dateTo: null,
  };

  it('returns all tasks with default filter', () => {
    const result = getFilteredTasks(tasks, defaultFilter);
    expect(result).toHaveLength(4);
  });

  it('filters by search term', () => {
    const result = getFilteredTasks(tasks, { ...defaultFilter, search: 'report' });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Write report');
  });

  it('filters by priority', () => {
    const result = getFilteredTasks(tasks, { ...defaultFilter, priority: 'high' });
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('high');
  });

  it('filters active tasks only', () => {
    const result = getFilteredTasks(tasks, { ...defaultFilter, status: 'active' });
    expect(result.every(t => !t.completed)).toBe(true);
  });

  it('filters completed tasks only', () => {
    const result = getFilteredTasks(tasks, { ...defaultFilter, status: 'completed' });
    expect(result.every(t => t.completed)).toBe(true);
  });

  it('sorts by priority', () => {
    const result = getFilteredTasks(tasks, { ...defaultFilter, sort: 'priority' });
    expect(result[0].priority).toBe('critical');
  });

  it('sorts alphabetically', () => {
    const result = getFilteredTasks(tasks, { ...defaultFilter, sort: 'alpha' });
    expect(result[0].title).toBe('Buy groceries');
  });

  it('pinned tasks always appear first', () => {
    const withPinned = [
      ...tasks,
      mockTask({ id: 5, title: 'Pinned', pinned: true }),
    ];
    const result = getFilteredTasks(withPinned, defaultFilter);
    expect(result[0].pinned).toBe(true);
  });
});

