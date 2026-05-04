import { create } from 'zustand';

const savedFilter = (() => {
  try { return JSON.parse(localStorage.getItem('taskFilter')) || {}; }
  catch { return {}; }
})();

export const useAppStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────
  username:    '',
  greeting:    localStorage.getItem('userName') || '',

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
  priority:    savedFilter.priority    || null,
  category:    savedFilter.category    || null,
  status:      savedFilter.status      || 'all',
  sort:        savedFilter.sort        || 'newest',
  dateFrom:    savedFilter.dateFrom    || null,
  dateTo:      savedFilter.dateTo      || null,
  search:      '',
  deadlineDay: null,
},


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

  setGreeting: (greeting) => {
    localStorage.setItem('userName', greeting);
    set({ greeting });
  },

  resetState: () => {
    localStorage.removeItem('taskFilter');
    localStorage.removeItem('userName');
    set({
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

  
}));