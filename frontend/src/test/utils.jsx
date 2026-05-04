import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

export function makeQueryClient() {
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

export function renderWithProviders(ui, { queryClient, route = '/' } = {}) {
  const client = queryClient ?? makeQueryClient();
  return {
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]}>
          {ui}
        </MemoryRouter>
      </QueryClientProvider>
    ),
    queryClient: client,
  };
}

export const mockTask = (overrides = {}) => ({
  id:          1,
  title:       'Test Task',
  description: '',
  priority:    'low',
  completed:   false,
  pinned:      false,
  deadline:    null,
  category:    null,
  created_at:  new Date().toISOString(),
  ...overrides,
});

export const mockCategory = (overrides = {}) => ({
  id:   1,
  name: 'Work',
  icon: '💼',
  ...overrides,
});

export const mockProfile = (overrides = {}) => ({
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
