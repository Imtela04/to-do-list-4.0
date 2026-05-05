import type { AxiosResponse } from 'axios';
import client from './client';
import type {
  Task, Category, StickyNote, Profile,
  Theme, PomodoroResult, AuthTokens,
  LoginCredentials, RegisterData,
  TaskPayload, CategoryPayload, NotePayload, ThemePayload,
} from '@/types';

// ── Auth ──────────────────────────────────────────────────────
export const register = (data: RegisterData): Promise<AxiosResponse> =>
  client.post('/auth/register/', data);

export const login = async (credentials: LoginCredentials): Promise<AxiosResponse<AuthTokens>> => {
  const res = await client.post<AuthTokens>('/auth/login/', credentials);
  localStorage.setItem('authToken',   res.data.access);
  localStorage.setItem('refreshToken', res.data.refresh);
  return res;
};

export const logout     = ():                   Promise<AxiosResponse> => client.post('/auth/logout/');
export const getProfile = (): Promise<AxiosResponse<Profile>>          => client.get('/me/');

// ── Tasks ─────────────────────────────────────────────────────
export const getTasks    = (params: Record<string, unknown> = {}): Promise<AxiosResponse<Task[] | { results: Task[] }>> =>
  client.get('/tasks/', { params });

export const createTask  = (data: TaskPayload):           Promise<AxiosResponse<Task>> => client.post('/tasks/', data);
export const updateTask  = (id: number, data: Partial<TaskPayload>): Promise<AxiosResponse<Task>> => client.patch(`/tasks/${id}/`, data);
export const deleteTask  = (id: number):                  Promise<AxiosResponse> =>       client.delete(`/tasks/${id}/`);
export const toggleTask = (id: number, completed: boolean, pinned?: boolean) => 
  client.patch(`/tasks/${id}/`, { completed, ...(pinned !== undefined && { pinned }) });

// ── Categories ────────────────────────────────────────────────
export const getCategories  = ():                       Promise<AxiosResponse<Category[]>> => client.get('/categories/');
export const createCategory = (data: CategoryPayload):  Promise<AxiosResponse<Category>>  => client.post('/categories/', data);
export const updateCategory = (id: number, data: Partial<CategoryPayload>): Promise<AxiosResponse<Category>> => client.patch(`/categories/${id}/`, data);
export const deleteCategory = (id: number):             Promise<AxiosResponse>             => client.delete(`/categories/${id}/`);

// ── Sticky notes ──────────────────────────────────────────────
export const getStickyNotes  = ():                          Promise<AxiosResponse<StickyNote[]>> => client.get('/sticky-notes/');
export const createStickyNote = (data: NotePayload):        Promise<AxiosResponse<StickyNote>>   => client.post('/sticky-notes/', data);
export const updateStickyNote = (id: number, data: Partial<NotePayload>): Promise<AxiosResponse<StickyNote>> => client.patch(`/sticky-notes/${id}/`, data);
export const deleteStickyNote = (id: number):               Promise<AxiosResponse>                => client.delete(`/sticky-notes/${id}/`);

// ── Theme ─────────────────────────────────────────────────────
export const getTheme  = ():                    Promise<AxiosResponse<Theme>>  => client.get('/user/theme/');
export const saveTheme = (payload: ThemePayload): Promise<AxiosResponse<Theme>> => client.post('/user/theme/', payload);

// ── Pomodoro ──────────────────────────────────────────────────
export const completePomodoro = (): Promise<AxiosResponse<PomodoroResult>> => client.post('/auth/pomodoro/complete/');