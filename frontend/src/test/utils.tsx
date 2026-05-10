import { ReactElement } from 'react';
import { render, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';  // Add this import

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
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

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  pinned: boolean;
  deadline: string | null;
  category: number | null;
  created_at: string;
  [key: string]: any;
}

export const mockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 1,
  title: 'Test Task',
  description: '',
  priority: 'low',
  completed: false,
  pinned: false,
  deadline: null,
  category: null,
  created_at: new Date().toISOString(),
  ...overrides,
});

export interface Category {
  id: number;
  name: string;
  icon: string;
  [key: string]: any;
}

export const mockCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 1,
  name: 'Work',
  icon: '💼',
  ...overrides,
});

export interface ProfileLimits {
  tasks: number;
  categories: number;
  notes: number;
}

export interface ProfileCounts {
  tasks: number;
  categories: number;
  notes: number;
}

export interface Profile {
  username: string;
  xp: number;
  level: number;
  streak: number;
  next_level_xp: number;
  pomodoros_today: number;
  limits: ProfileLimits;
  counts: ProfileCounts;
  [key: string]: any;
}

export const mockProfile = (overrides: Partial<Profile> = {}): Profile => ({
  username: 'testuser',
  xp: 0,
  level: 1,
  streak: 0,
  next_level_xp: 100,
  pomodoros_today: 0,
  limits: { tasks: 5, categories: 2, notes: 0 },
  counts: { tasks: 0, categories: 0, notes: 0 },
  ...overrides,
});