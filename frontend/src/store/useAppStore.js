import { create } from 'zustand';

const savedFilter = (() => {
  try { return JSON.parse(localStorage.getItem('taskFilter')) || {}; }
  catch { return {}; }
})();

export const useAppStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────
  tasks:       [],
  categories:  [],
  stickyNotes: [],
  username:    '',
  greeting:    localStorage.getItem('userName') || '',
  loading:     { tasks: false, categories: false, notes: false },
  error:       null,

  // XP / gamification
  xp:             0,
  level:          1,
  streak:         0,
  nextLevelXp:    50,
  limits:         { tasks: 5, categories: 2, notes: 0 },
  counts:         { tasks: 0, categories: 0, notes: 0 },
  pomodoros_today: 0,
  levelUpEvent:   null,

  // Filters
  filter: {
    search:      '',
    category:    null,
    priority:    null,
    status:      'all',
    sort:        'newest',
    deadlineDay: null,
    dateFrom:    savedFilter.dateFrom || null,
    dateTo:      savedFilter.dateTo   || null,
    ...savedFilter,
    search:      '',
    deadlineDay: null,
  },

  // ── Task actions ───────────────────────────────────────────
  setTasks:      (tasks)   => set({ tasks }),
  addTask:       (task)    => set(s => ({ tasks: [task, ...s.tasks] })),
  updateTask:    (task)    => set(s => ({ tasks: s.tasks.map(t => t.id === task.id ? task : t) })),
  deleteTask:    (id)      => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })),

  // ── Category actions ───────────────────────────────────────
  setCategories:   (categories) => set({ categories }),
  addCategory:     (cat)        => set(s => ({ categories: [...s.categories, cat] })),
  deleteCategory:  (id)         => set(s => ({ categories: s.categories.filter(c => c.id !== id) })),

  // ── Note actions ───────────────────────────────────────────
  setNotes:    (stickyNotes) => set({ stickyNotes }),
  addNote:     (note)        => set(s => ({ stickyNotes: [...s.stickyNotes, note] })),
  updateNote:  (note)        => set(s => ({ stickyNotes: s.stickyNotes.map(n => n.id === note.id ? note : n) })),
  deleteNote:  (id)          => set(s => ({ stickyNotes: s.stickyNotes.filter(n => n.id !== id) })),

  // ── Filter actions ─────────────────────────────────────────
  setFilter: (payload) => set(s => {
    const updated = { ...s.filter, ...payload };
    const { search, deadlineDay, ...toSave } = updated;
    localStorage.setItem('taskFilter', JSON.stringify(toSave));
    return { filter: updated };
  }),

  // ── Profile actions ────────────────────────────────────────
  setProfile: (data) => set({
    username:        data.username,
    xp:              data.xp,
    level:           data.level,
    streak:          data.streak,
    nextLevelXp:     data.next_level_xp,
    limits:          data.limits,
    counts:          data.counts,
    pomodoros_today: data.pomodoros_today ?? 0,
  }),

  updateXp: (payload) => set(s => ({
    xp:           payload.total_xp,
    level:        payload.new_level    ?? s.level,
    streak:       payload.streak       ?? s.streak,
    levelUpEvent: payload.leveled_up   ? { newLevel: payload.new_level } : s.levelUpEvent,
  })),

  pomodoroComplete: (payload) => set(s => ({
    xp:              payload.total_xp,
    level:           payload.new_level ?? s.level,
    pomodoros_today: payload.pomodoros_today,
    levelUpEvent:    payload.leveled_up ? { newLevel: payload.new_level } : s.levelUpEvent,
  })),

  clearLevelUp: () => set({ levelUpEvent: null }),

  setGreeting: (greeting) => set({ greeting }),
  setLoading:  (payload)  => set(s => ({ loading: { ...s.loading, ...payload } })),
  setError:    (error)    => set({ error }),

  resetState: () => {
    localStorage.removeItem('taskFilter');
    localStorage.removeItem('userName');
    set({
      tasks: [], categories: [], stickyNotes: [],
      username: '', greeting: '', xp: 0, level: 1,
      streak: 0, nextLevelXp: 50,
      limits: { tasks: 5, categories: 2, notes: 0 },
      counts: { tasks: 0, categories: 0, notes: 0 },
      pomodoros_today: 0, levelUpEvent: null,
      filter: {
        search: '', category: null, priority: null,
        status: 'all', sort: 'newest', deadlineDay: null,
        dateFrom: null, dateTo: null,
      },
    });
  },

  // ── Derived: filtered + sorted tasks ──────────────────────
  getFilteredTasks: () => {
    const { tasks, filter } = get();
    return tasks
      .filter(task => {
        const { search, category, priority, status, dateFrom, dateTo, deadlineDay } = filter;
        if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
        if (category === 'uncategorised') { if (task.category) return false; }
        else if (category) { if (task.category?.id !== category) return false; }
        if (priority && task.priority !== priority) return false;
        if (status === 'active' && task.completed) return false;
        if (status === 'completed' && !task.completed) return false;
        if (dateFrom && task.deadline && new Date(task.deadline) < new Date(dateFrom)) return false;
        if (dateTo && task.deadline && new Date(task.deadline) > new Date(dateTo)) return false;
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
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        switch (filter.sort) {
          case 'newest':   return new Date(b.created_at) - new Date(a.created_at);
          case 'oldest':   return new Date(a.created_at) - new Date(b.created_at);
          case 'priority': {
            const order = { critical: 0, high: 1, medium: 2, low: 3 };
            return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
          }
          case 'deadline':
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
          case 'alpha': return a.title.localeCompare(b.title);
          default:      return 0;
        }
      });
  },
}));