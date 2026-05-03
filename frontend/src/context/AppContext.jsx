import { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { getTasks, getCategories, getStickyNotes, getProfile } from '../api/services';

export const AppContext = createContext(null);

const savedFilter = (() => {
  try { return JSON.parse(localStorage.getItem('taskFilter')) || {}; }
  catch { return {}; }
})();

const initialState = {
  tasks:       [],
  categories:  [],
  stickyNotes: [],
  username:    '',
  theme:       localStorage.getItem('theme'),
  loading:     { tasks: false, categories: false, notes: false },
  error:       null,
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
    pomodoros_today: 0
  },
  greeting: localStorage.getItem('userName') || '',

  // XP / gamification
  xp:           0,
  level:        1,
  streak:       0,
  nextLevelXp:  50,
  limits:       { tasks: 5, categories: 2, notes: 0 },
  counts:       { tasks: 0, categories: 0, notes: 0 },
  levelUpEvent: null, // { newLevel } — consumed by LevelUpToast
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TASKS':      return { ...state, tasks: action.payload };
    case 'ADD_TASK':       return { ...state, tasks: [action.payload, ...state.tasks] };
    case 'UPDATE_TASK':    return { ...state, tasks: state.tasks.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TASK':    return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) };
    case 'SET_CATEGORIES': return { ...state, categories: action.payload };
    case 'ADD_CATEGORY':   return { ...state, categories: [...state.categories, action.payload] };
    case 'DELETE_CATEGORY':return { ...state, categories: state.categories.filter(c => c.id !== action.payload) };
    case 'SET_NOTES':      return { ...state, stickyNotes: action.payload };
    case 'ADD_NOTE':       return { ...state, stickyNotes: [...state.stickyNotes, action.payload] };
    case 'UPDATE_NOTE':    return { ...state, stickyNotes: state.stickyNotes.map(n => n.id === action.payload.id ? action.payload : n) };
    case 'DELETE_NOTE':    return { ...state, stickyNotes: state.stickyNotes.filter(n => n.id !== action.payload) };

    case 'SET_FILTER': {
      const updated = { ...state.filter, ...action.payload };
      const { search, deadlineDay, ...toSave } = updated;
      localStorage.setItem('taskFilter', JSON.stringify(toSave));
      return { ...state, filter: updated };
    }

    case 'SET_LOADING':  return { ...state, loading: { ...state.loading, ...action.payload } };
    case 'SET_ERROR':    return { ...state, error: action.payload };
    case 'SET_GREETING': return { ...state, greeting: action.payload };
    case 'SET_USERNAME': return { ...state, username: action.payload };
    case 'SET_THEME':
      localStorage.setItem('theme', action.payload);
      return { ...state, theme: action.payload };

    case 'SET_PROFILE':
      return {
        ...state,
        username:    action.payload.username,
        xp:          action.payload.xp,
        level:       action.payload.level,
        streak:      action.payload.streak,
        nextLevelXp: action.payload.next_level_xp,
        limits:      action.payload.limits,
        counts:      action.payload.counts,
        pomodoros_today: action.payload.pomodoros_today ?? 0,
      };

    case 'UPDATE_XP': {
      // Called after toggling a task — merges xp_result from the API
      const { xp_gained, total_xp, leveled_up, new_level, streak } = action.payload;
      return {
        ...state,
        xp:           total_xp,
        level:        new_level ?? state.level,
        streak:       streak    ?? state.streak,
        levelUpEvent: leveled_up ? { newLevel: new_level } : state.levelUpEvent,
      };
    }

    case 'CLEAR_LEVEL_UP':
      return { ...state, levelUpEvent: null };

    case 'RESET':
      return {
        ...initialState,
        theme:    'dark',
        greeting: '',
      };
    
    case 'POMODORO_COMPLETE': {
      const { xp_gained, total_xp, leveled_up, new_level, pomodoros_today } = action.payload;
      return {
        ...state,
        xp:              total_xp,
        level:           new_level ?? state.level,
        pomodoros_today: pomodoros_today,
        levelUpEvent:    leveled_up ? { newLevel: new_level } : state.levelUpEvent,
      };
    }

    default: return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const resetState = () => {
    dispatch({ type: 'RESET' });
    localStorage.removeItem('theme');
    localStorage.removeItem('userName');
  };

  const loadTasks = async () => {
    dispatch({ type: 'SET_LOADING', payload: { tasks: true } });
    try {
      const res = await getTasks();
      dispatch({ type: 'SET_TASKS', payload: res.data.results || res.data });
    } catch {
      dispatch({ type: 'SET_TASKS', payload: [] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { tasks: false } });
    }
  };

  const loadCategories = async () => {
    try {
      const res = await getCategories();
      dispatch({ type: 'SET_CATEGORIES', payload: res.data });
    } catch {}
  };

  const loadNotes = async () => {
    try {
      const res = await getStickyNotes();
      dispatch({ type: 'SET_NOTES', payload: res.data });
    } catch {}
  };

  const loadUsername = async () => {
    try {
      const res = await getProfile();
      dispatch({ type: 'SET_PROFILE', payload: res.data });
    } catch {}
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    loadTasks();
    loadCategories();
    loadNotes();
    loadUsername();
  }, []);

  const filteredTasks = state.tasks
    .filter(task => {
      const { search, category, priority, status, dateFrom, dateTo } = state.filter;
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (category === 'uncategorised') {
        if (task.category) return false;
      } else if (category) {
        if (task.category?.id !== category) return false;
      }
      if (priority && task.priority !== priority) return false;
      if (status === 'active' && task.completed) return false;
      if (status === 'completed' && !task.completed) return false;
      if (dateFrom && task.deadline && new Date(task.deadline) < new Date(dateFrom)) return false;
      if (dateTo && task.deadline && new Date(task.deadline) > new Date(dateTo)) return false;
      if (state.filter.deadlineDay) {
        const { year, month, day } = state.filter.deadlineDay;
        if (!task.deadline) return false;
        const d = new Date(task.deadline);
        if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.pinned && b.pinned) return new Date(a.created_at) - new Date(b.created_at);
      switch (state.filter.sort) {
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

  return (
    <AppContext.Provider value={{
      state, dispatch, filteredTasks,
      loadTasks, loadCategories, loadNotes, loadUsername,
      resetState,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};