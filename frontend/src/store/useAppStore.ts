import { create } from 'zustand';
import type { Task, Limits, Counts, Profile, XpResult, PomodoroResult } from '@/types';

// ── Filter types ───────────────────────────────────────────────
export interface DeadlineDay {
  year:  number;
  month: number;
  day:   number;
}

export interface Filter {
  search:      string;
  category:    number | 'uncategorised' | null;
  priority:    'low' | 'medium' | 'high' | 'critical' | null;
  status:      'all' | 'active' | 'completed';
  sort:        'newest' | 'oldest' | 'priority' | 'deadline' | 'alpha';
  dateFrom:    string | null;
  dateTo:      string | null;
  deadlineDay: DeadlineDay | null;
}

// ── Store types ────────────────────────────────────────────────
interface LevelUpEvent {
  newLevel: number | null;
}

interface AppState {
  username:        string;
  greeting:        string;
  xp:              number;
  level:           number;
  streak:          number;
  nextLevelXp:     number;
  limits:          Limits;
  counts:          Counts;
  pomodoros_today: number;
  levelUpEvent:    LevelUpEvent | null;
  filter:          Filter;
}

interface AppActions {
  setFilter:        (payload: Partial<Filter>) => void;
  setProfile:       (data: Profile) => void;
  updateXp:         (payload: XpResult) => void;
  pomodoroComplete: (payload: PomodoroResult) => void;
  clearLevelUp:     () => void;
  setGreeting:      (greeting: string) => void;
  resetState:       () => void;
  getFilteredTasks: (tasks: Task[]) => Task[];
}

type AppStore = AppState & AppActions;

// ── Persisted filter ───────────────────────────────────────────
const savedFilter = ((): Partial<Filter> => {
  try { return JSON.parse(localStorage.getItem('taskFilter') ?? '{}') as Partial<Filter>; }
  catch { return {}; }
})();

const DEFAULT_FILTER: Filter = {
  priority:    savedFilter.priority    ?? null,
  category:    savedFilter.category    ?? null,
  status:      savedFilter.status      ?? 'all',
  sort:        savedFilter.sort        ?? 'newest',
  dateFrom:    savedFilter.dateFrom    ?? null,
  dateTo:      savedFilter.dateTo      ?? null,
  search:      '',
  deadlineDay: null,
};

const DEFAULT_STATE: AppState = {
  username:        '',
  greeting:        localStorage.getItem('userName') ?? '',
  xp:              0,
  level:           1,
  streak:          0,
  nextLevelXp:     50,
  limits:          { tasks: 5, categories: 2, notes: 0 },
  counts:          { tasks: 0, categories: 0, notes: 0 },
  pomodoros_today: 0,
  levelUpEvent:    null,
  filter:          DEFAULT_FILTER,
};

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

// ── Store ──────────────────────────────────────────────────────
export const useAppStore = create<AppStore>((set, get) => ({
  ...DEFAULT_STATE,

  setFilter: (payload) => set(s => {
    const updated = { ...s.filter, ...payload };
    const { search: _s, deadlineDay: _d, ...toSave } = updated;
    localStorage.setItem('taskFilter', JSON.stringify(toSave));
    return { filter: updated };
  }),

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
    level:        payload.new_level  ?? s.level,
    streak:       payload.streak     ?? s.streak,
    levelUpEvent: payload.leveled_up ? { newLevel: payload.new_level ?? null } : s.levelUpEvent,
  })),

  pomodoroComplete: (payload) => set(s => ({
    xp:              payload.total_xp,
    level:           payload.new_level ?? s.level,
    pomodoros_today: payload.pomodoros_today,
    levelUpEvent:    payload.leveled_up ? { newLevel: payload.new_level ?? null } : s.levelUpEvent,
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
      ...DEFAULT_STATE,
      filter: {
        search: '', category: null, priority: null,
        status: 'all', sort: 'newest', deadlineDay: null,
        dateFrom: null, dateTo: null,
      },
    });
  },

  getFilteredTasks: (tasks) => {
    const { filter } = get();
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
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
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
  },
}));