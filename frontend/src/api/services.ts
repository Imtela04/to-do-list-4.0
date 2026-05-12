import type { AxiosResponse } from 'axios';
import client from './client';
import type {
  Task, Category, StickyNote, Profile,
  Theme, PomodoroResult, AuthTokens,
  LoginCredentials, RegisterData,
  TaskPayload, CategoryPayload, NotePayload, ThemePayload,
  Subtask,
} from '@/types';

// ── Shared config helpers ─────────────────────────────────────
// The axios client accepts _silent on config — this helper avoids
// the repeated `as never` cast throughout the file.
const silent = { _silent: true } as Record<string, unknown>;

// ── Auth ──────────────────────────────────────────────────────
export const register = (data: RegisterData): Promise<AxiosResponse> =>
  client.post('/auth/register/', data);

export const login = async (credentials: LoginCredentials): Promise<AxiosResponse<AuthTokens>> => {
  const res = await client.post<AuthTokens>('/auth/login/', credentials);
  localStorage.setItem('authToken',    res.data.access);
  localStorage.setItem('refreshToken', res.data.refresh);
  return res;
};

export const logout            = ():                    Promise<AxiosResponse>         => client.post('/auth/logout/');
export const getProfile        = ():                    Promise<AxiosResponse<Profile>> => client.get('/me/');
export const deleteAccount     = (password: string):   Promise<AxiosResponse>         => client.delete('/auth/account/', { data: { password } });

export const requestPasswordReset = (email: string): Promise<AxiosResponse> =>
  client.post('/auth/password-reset/', { email }, silent);

export const confirmPasswordReset = (
  uid: string, token: string, password: string,
): Promise<AxiosResponse> =>
  client.post('/auth/password-reset/confirm/', { uid, token, password }, silent);

export const getAdminStats = (): Promise<AxiosResponse> => client.get('/dashboard/stats/');
export const getAdminUsers = (): Promise<AxiosResponse> => client.get('/dashboard/users/');
export const adminUnlockUser = (id: number): Promise<AxiosResponse> =>
  client.post(`/dashboard/unlock/${id}/`);
// ── Tasks ─────────────────────────────────────────────────────
export const getTasks = (
  params: Record<string, unknown> = {},
): Promise<AxiosResponse<Task[] | { results: Task[] }>> =>
  client.get('/tasks/', { params });

export const createTask = (data: TaskPayload):                        Promise<AxiosResponse<Task>> => client.post('/tasks/', data, silent);
export const updateTask = (id: number, data: Partial<TaskPayload>):  Promise<AxiosResponse<Task>> => client.patch(`/tasks/${id}/`, data);
export const deleteTask = (id: number):                               Promise<AxiosResponse>       => client.delete(`/tasks/${id}/`);

export const toggleTask = (
  id: number,
  completed: boolean,
  pinned?: boolean,
): Promise<AxiosResponse<Task>> =>
  client.patch(`/tasks/${id}/`, { completed, ...(pinned !== undefined && { pinned }) });

// ── Categories ────────────────────────────────────────────────
export const getCategories  = ():                                        Promise<AxiosResponse<Category[]>> => client.get('/categories/');
export const createCategory = (data: CategoryPayload):                  Promise<AxiosResponse<Category>>   => client.post('/categories/', data, silent);
export const updateCategory = (id: number, data: Partial<CategoryPayload>): Promise<AxiosResponse<Category>> => client.patch(`/categories/${id}/`, data);
export const deleteCategory = (id: number):                              Promise<AxiosResponse>             => client.delete(`/categories/${id}/`);

// ── Sticky notes ──────────────────────────────────────────────
export const getStickyNotes   = ():                                       Promise<AxiosResponse<StickyNote[]>> => client.get('/sticky-notes/');
export const createStickyNote = (data: NotePayload):                     Promise<AxiosResponse<StickyNote>>   => client.post('/sticky-notes/', data, silent);
export const updateStickyNote = (id: number, data: Partial<NotePayload>): Promise<AxiosResponse<StickyNote>>  => client.patch(`/sticky-notes/${id}/`, data);
export const deleteStickyNote = (id: number):                             Promise<AxiosResponse>               => client.delete(`/sticky-notes/${id}/`);

// ── Theme ─────────────────────────────────────────────────────
export const getTheme  = ():                       Promise<AxiosResponse<Theme>>  => client.get('/user/theme/');
export const saveTheme = (payload: ThemePayload):  Promise<AxiosResponse<Theme>>  => client.post('/user/theme/', payload);

// ── Pomodoro ──────────────────────────────────────────────────
export const completePomodoro = (): Promise<AxiosResponse<PomodoroResult>> => client.post('/auth/pomodoro/complete/');

// ── Subtasks ──────────────────────────────────────────────────
export const getSubtasks = (taskId: number): Promise<AxiosResponse<Subtask[]>> =>
  client.get(`/tasks/${taskId}/subtasks/`);

export const createSubtask = (
  taskId: number,
  data: { title: string },
): Promise<AxiosResponse<Subtask>> =>
  client.post(`/tasks/${taskId}/subtasks/`, data);

export const updateSubtask = (
  taskId: number,
  subtaskId: number,
  data: Partial<{ title: string; completed: boolean }>,
): Promise<AxiosResponse<Task>> =>
  client.patch(`/tasks/${taskId}/subtasks/${subtaskId}/`, data);

export const deleteSubtask = (
  taskId: number,
  subtaskId: number,
): Promise<AxiosResponse<Task>> =>
  client.delete(`/tasks/${taskId}/subtasks/${subtaskId}/`);