import type { AxiosResponse } from 'axios';
import client from './client';
import type {
  Task, Category, StickyNote, Profile,
  Theme, PomodoroResult, AuthTokens,
  LoginCredentials, RegisterData,
  TaskPayload, CategoryPayload, NotePayload, ThemePayload,
  Subtask,
  XpResult,
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
export const deleteAccount = (password: string): Promise<AxiosResponse> =>
  client.post('/account/delete/', { password });

export const requestPasswordReset = (email: string): Promise<AxiosResponse> =>
  client.post('/auth/password-reset/', { email }, silent);

export const confirmPasswordReset = (
  uid: string, token: string, password: string,
): Promise<AxiosResponse> =>
  client.post('/auth/password-reset/confirm/', { uid, token, password }, silent);

export const getAdminStats = (): Promise<AxiosResponse> => client.get('/admin/stats/');
export const getAdminUsers = (): Promise<AxiosResponse> => client.get('/admin/users/');
export const adminUnlockUser = (id: number): Promise<AxiosResponse> =>
  client.post(`/admin/unlock/${id}/`);
export const updateEmail = (email: string): Promise<AxiosResponse> =>
  client.post('/auth/update-email/', { email });
export const adminDeleteUser = (id: number): Promise<AxiosResponse> =>
  client.delete(`/admin/users/${id}/delete/`);
export const adminEditUser = (id: number, data: { xp?: number; streak?: number; email?: string }): Promise<AxiosResponse> =>
  client.patch(`/admin/users/${id}/edit/`, data);
export const adminAuditLog = (params: { action?: string; user_id?: number; search?: string } = {}): Promise<AxiosResponse> =>
  client.get('/admin/audit-log/', { params });
export const adminForceLogout     = (id: number):                            Promise<AxiosResponse> => client.post(`/admin/users/${id}/force-logout/`);
export const adminToggleStaff     = (id: number):                            Promise<AxiosResponse> => client.post(`/admin/users/${id}/toggle-staff/`);
export const adminUserDetail      = (id: number):                            Promise<AxiosResponse> => client.get(`/admin/users/${id}/detail/`);
export const adminAwardXp         = (id: number, amount: number):            Promise<AxiosResponse> => client.post(`/admin/users/${id}/award-xp/`, { amount });
export const adminBulkAction      = (action: string, user_ids: number[]):    Promise<AxiosResponse> => client.post('/admin/bulk-action/', { action, user_ids });
export const adminClearOnboarding = (id: number):                            Promise<AxiosResponse> => client.post(`/admin/users/${id}/clear-onboarding/`);
export const adminDeleteNote      = (note_id: number):                       Promise<AxiosResponse> => client.delete(`/admin/notes/${note_id}/delete/`);
export const adminExportCsv       = ():                                      Promise<AxiosResponse> =>
  client.get('/admin/export/users.csv', { responseType: 'blob' } as Record<string, unknown>);
export const adminResetXp = (id: number): Promise<AxiosResponse> =>
  client.post(`/admin/users/${id}/reset-xp/`);
export const adminViewNote = (note_id: number): Promise<AxiosResponse> =>
  client.get(`/admin/notes/${note_id}/view/`);
// ── Tasks ─────────────────────────────────────────────────────
interface PaginatedResponse<T> {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  T[];
}

export const getTasks = (
  params: Record<string, unknown> = {},
): Promise<AxiosResponse<PaginatedResponse<Task>>> =>
  client.get('/tasks/', { params });

export const createTask = (data: TaskPayload):                        Promise<AxiosResponse<Task>> => client.post('/tasks/', data, silent);
export const updateTask = (id: number, data: Partial<TaskPayload>):  Promise<AxiosResponse<Task>> => client.patch(`/tasks/${id}/`, data);
export const deleteTask = (id: number):                               Promise<AxiosResponse>       => client.delete(`/tasks/${id}/`);

interface TaskResponse {
  task:       Task;
  xp_result:  XpResult | null;
}

export const toggleTask = (
  id: number,
  completed: boolean,
  pinned?: boolean,
): Promise<AxiosResponse<TaskResponse>> =>
  client.patch(`/tasks/${id}/`, { completed, ...(pinned !== undefined && { pinned }) });

export const reorderTasks = (order: number[]): Promise<AxiosResponse> =>
  client.post('/tasks/reorder/', { order });
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
): Promise<AxiosResponse<TaskResponse>> =>
  client.patch(`/tasks/${taskId}/subtasks/${subtaskId}/`, data);

export const deleteSubtask = (
  taskId: number,
  subtaskId: number,
): Promise<AxiosResponse<Task>> =>
  client.delete(`/tasks/${taskId}/subtasks/${subtaskId}/`);