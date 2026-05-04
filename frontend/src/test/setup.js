import '@testing-library/jest-dom';
import { vi } from 'vitest';

// mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem:   (k)    => store[k] ?? null,
    setItem:   (k, v) => { store[k] = String(v); },
    removeItem:(k)    => { delete store[k]; },
    clear:     ()     => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// mock axios client so tests never hit the network
vi.mock('@/api/client', () => ({
  default: {
    get:    vi.fn(),
    post:   vi.fn(),
    patch:  vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request:  { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

// mock services
vi.mock('@/api/services', () => ({
  getTasks:         vi.fn(),
  createTask:       vi.fn(),
  updateTask:       vi.fn(),
  deleteTask:       vi.fn(),
  toggleTask:       vi.fn(),
  getCategories:    vi.fn(),
  createCategory:   vi.fn(),
  deleteCategory:   vi.fn(),
  getStickyNotes:   vi.fn(),
  createStickyNote: vi.fn(),
  updateStickyNote: vi.fn(),
  deleteStickyNote: vi.fn(),
  getProfile:       vi.fn(),
  getTheme:         vi.fn(),
  saveTheme:        vi.fn(),
  completePomodoro: vi.fn(),
  login:            vi.fn(),
  logout:           vi.fn(),
  register:         vi.fn(),
}));

// mock query hooks so components in tests don't trigger real fetches
vi.mock('@/hooks/useProfileQuery', () => ({
  useProfileQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
}));

vi.mock('@/hooks/useTasksQuery', () => ({
  useTasksQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/hooks/useCategoriesQuery', () => ({
  useCategoriesQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/hooks/useNotesQuery', () => ({
  useNotesQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));