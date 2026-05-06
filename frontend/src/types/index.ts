export interface Category {
  id:   number;
  name: string;
  icon: string;
}

export interface Task {
  id:          number;
  title:       string;
  description: string;
  priority:    'low' | 'medium' | 'high' | 'critical';
  category:    Category | null;
  deadline:    string | null;
  completed:   boolean;
  pinned:      boolean;
  created_at:  string;
  completed_at: string | null;
  subtasks: Subtask[];
}

export interface Subtask {
  id:           number;
  title:        string;
  completed:    boolean;
  completed_at: string | null;
  created_at:   string;
}

export interface StickyNote {
  id:    number;
  note:  string;
  color: string;
}

export interface Limits {
  tasks:      number | null;
  categories: number | null;
  notes:      number | null;
}

export interface Counts {
  tasks:      number;
  categories: number;
  notes:      number;
}

export interface Profile {
  username:        string;
  xp:              number;
  level:           number;
  streak:          number;
  next_level_xp:   number;
  limits:          Limits;
  counts:          Counts;
  pomodoros_today: number;
}

export interface XpResult {
  total_xp:   number;
  new_level:  number | null;
  streak:     number | null;
  leveled_up: boolean;
}

export interface PomodoroResult {
  total_xp:        number;
  new_level:       number | null;
  pomodoros_today: number;
  leveled_up:      boolean;
}

export interface Theme {
  mode:          string;
  custom_colors: Record<string, string> | null;
}

export interface AuthTokens {
  access:  string;
  refresh: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  confirm:  string;
}

export interface TaskPayload {
  title:       string;
  description?: string;
  priority?:   'low' | 'medium' | 'high' | 'critical';
  category?:   number | string;
  deadline?:   string;
  completed?:  boolean;
  pinned?:     boolean;
}

export interface CategoryPayload {
  name: string;
  icon: string;
}

export interface NotePayload {
  note:  string;
  color: string;
}

export interface ThemePayload {
  mode:          string;
  custom_colors?: Record<string, string>;
}