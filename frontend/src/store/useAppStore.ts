import { create } from 'zustand';
import type { Limits, Counts, Profile, XpResult, PomodoroResult } from '@/types';

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
  isStaff:         boolean;
  email:           string;
  isGuest:         boolean;
  focusTaskId:     number | null;
  pomodoroQueue:   number[];
  pomodoroOpen:    boolean;
  pomodoro:        {
                    modeIndex: number;
                    timeLeft:  number;
                    running:   boolean;
                    sessions:  number;
                    xpToast:   string | null;
                  }; 
  view: 'list' | 'calendar' | 'kanban' | 'pomodoro';
  lastView: 'list' | 'calendar' | 'kanban';
}


interface AppActions {
  setFilter:               (payload: Partial<Filter>) => void;
  setProfile:              (data: Profile) => void;
  updateXp:                (payload: XpResult) => void;
  pomodoroComplete:        (payload: PomodoroResult) => void;
  clearLevelUp:            () => void;
  setGreeting:             (greeting: string) => void;
  resetState:              () => void;
  setFocusTask:            (id: number|null) => void;
  addToPomodoroQueue:      (taskId: number) => void;
  removeFromPomodoroQueue: (taskId: number) => void;
  clearPomodoroQueue:      () => void;
  setPomodoroOpen:         (open: boolean) => void;
  setPomodoroTimer:        (partial: Partial<AppState['pomodoro']>) => void;
  tickPomodoro:            () => void;
  setView:                 (view: AppState['view']) => void;

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
  isStaff:         false,
  email:           '',
  isGuest:         false,
  focusTaskId:     null,
  pomodoroQueue:   [],
  pomodoroOpen:    false,
  pomodoro:        { modeIndex: 0, timeLeft: 25 * 60, running: false, sessions: 0, xpToast: null },
  view:            'list',
  lastView: 'list',


};

// ── Store ──────────────────────────────────────────────────────
export const useAppStore = create<AppStore>((set) => ({
  ...DEFAULT_STATE,

  setFilter: (payload) => set(s => {
    const updated = { ...s.filter, ...payload };
    const { search: _s, deadlineDay: _d, ...toSave } = updated;
    localStorage.setItem('taskFilter', JSON.stringify(toSave));
    return { filter: updated };
  }),

  setProfile: (data) => set({
    username:        data.is_guest ? data.username.replace(/_\d+$/, '').replace(/_/g, ' '): data.username,
    xp:              data.xp,
    level:           data.level,
    streak:          data.streak,
    nextLevelXp:     data.next_level_xp,
    limits:          data.limits,
    counts:          data.counts,
    pomodoros_today: data.pomodoros_today ?? 0,
    isStaff:         data.is_staff ?? false,
    email:           data.email ?? '',
    isGuest:         data.is_guest ?? false,

  }),

  setView: (view) => set(s => ({
    view,
    lastView: view === 'pomodoro' ? s.lastView : view,
  })),

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

  setPomodoroTimer: (partial) => set(s => ({ 
    pomodoro:        { ...s.pomodoro, ...partial } 
  })),
  tickPomodoro:     () => set(s => ({ 
    pomodoro:        { ...s.pomodoro, timeLeft: Math.max(0, s.pomodoro.timeLeft - 1) } 
  })),


  clearLevelUp: () => set({ levelUpEvent: null }),

  setGreeting: (greeting) => {
    localStorage.setItem('userName', greeting);
    set({ greeting });
  },

  setFocusTask: (id) => set({ focusTaskId: id }),

  addToPomodoroQueue: (taskId) => set(s =>
    s.pomodoroQueue.includes(taskId) ? s : { pomodoroQueue: [...s.pomodoroQueue, taskId] }
  ),
  removeFromPomodoroQueue: (taskId) => set(s => ({
    pomodoroQueue: s.pomodoroQueue.filter(id => id !== taskId),
  })),
  clearPomodoroQueue: () => set({ pomodoroQueue: [] }),
  setPomodoroOpen:    (open) => set({ pomodoroOpen: open }),

  resetState: () => {    localStorage.removeItem('taskFilter');
    localStorage.removeItem('userName');
    localStorage.removeItem('rememberMe');
    set({
      ...DEFAULT_STATE,
      filter: {
        search: '', category: null, priority: null,
        status: 'all', sort: 'newest', deadlineDay: null,
        dateFrom: null, dateTo: null,
      },
    });
  },
}));