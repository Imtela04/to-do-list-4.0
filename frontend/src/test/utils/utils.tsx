import { ReactElement } from 'react';
import { render, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries:   { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface RenderWithProvidersOptions {
  queryClient?: QueryClient;
  route?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  { queryClient, route = '/' }: RenderWithProvidersOptions = {}
): RenderResult & { queryClient: QueryClient } {
  const client = queryClient ?? makeQueryClient();
  return {
    ...render(
      <MemoryRouter initialEntries={[route]}>
        <QueryClientProvider client={client}>
          <ThemeProvider>
            {ui}
          </ThemeProvider>
        </QueryClientProvider>
      </MemoryRouter>
    ),
    queryClient: client,
  };
}

// ── Subtask ────────────────────────────────────────────────────
export interface Subtask {
  id:           number;
  title:        string;
  completed:    boolean;
  completed_at: string | null;
  created_at:   string;
}

export const mockSubtask = (overrides: Partial<Subtask> = {}): Subtask => ({
  id:           1,
  title:        'Test Subtask',
  completed:    false,
  completed_at: null,
  created_at:   new Date().toISOString(),
  ...overrides,
});

// ── Task ───────────────────────────────────────────────────────
export interface Task {
  id:           number;
  title:        string;
  description:  string;
  priority:     'low' | 'medium' | 'high' | 'critical';
  completed:    boolean;
  pinned:       boolean;
  deadline:     string | null;
  category:     { id: number; name: string; icon: string } | null;
  created_at:   string;
  completed_at: string | null;
  subtasks:     Subtask[];
  [key: string]: unknown;
}

export const mockTask = (overrides: Partial<Task> = {}): Task => ({
  id:           1,
  title:        'Test Task',
  description:  '',
  priority:     'low',
  completed:    false,
  pinned:       false,
  deadline:     null,
  category:     null,
  created_at:   new Date().toISOString(),
  completed_at: null,
  subtasks:     [],
  ...overrides,
});

// ── Category ───────────────────────────────────────────────────
export interface Category {
  id:   number;
  name: string;
  icon: string;
  [key: string]: unknown;
}

export const mockCategory = (overrides: Partial<Category> = {}): Category => ({
  id:   1,
  name: 'Work',
  icon: '💼',
  ...overrides,
});

// ── Profile ────────────────────────────────────────────────────
export interface ProfileLimits {
  tasks:      number | null;
  categories: number | null;
  notes:      number | null;
}

export interface ProfileCounts {
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
  pomodoros_today: number;
  limits:          ProfileLimits;
  counts:          ProfileCounts;
  [key: string]: unknown;
}

export const mockProfile = (overrides: Partial<Profile> = {}): Profile => ({
  username:        'testuser',
  xp:              0,
  level:           1,
  streak:          0,
  next_level_xp:   100,
  pomodoros_today: 0,
  limits:          { tasks: 5, categories: 2, notes: 0 },
  counts:          { tasks: 0, categories: 0, notes: 0 },
  ...overrides,
});