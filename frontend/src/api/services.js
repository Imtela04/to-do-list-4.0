import client from "./client";

// auth
export const register = (data) => client.post(`/auth/register/`, data)
export const login = async (credentials) => {
    const res = await client.post('/auth/login/', credentials);
    localStorage.setItem('authToken', res.data.access);
    localStorage.setItem('refreshToken', res.data.refresh);
    return res;
};export const logout = () => client.post(`/auth/logout/`)
export const getProfile = () => client.get('/me/');

// tasks
export const getTasks = (params={}) => client.get(`/tasks/`, {params });
export const createTask = (data) => client.post(`/tasks/`, data);
export const updateTask = (id, data) => client.patch(`/tasks/${id}/`, data);
export const deleteTask = (id) => client.delete(`/tasks/${id}/`);
export const toggleTask = (id,completed) => client.patch(`/tasks/${id}/`, { completed });

// categories
export const getCategories = () => client.get(`/categories/`);
export const createCategory = (data) => client.post(`/categories/`, data);
export const deleteCategory = (id) => client.delete(`/categories/${id}/`);

// sticky notes
export const getStickyNotes = () => client.get(`/sticky-notes/`);
export const createStickyNote = (data) => client.post(`/sticky-notes/`, data);
export const updateStickyNote = (id, data) => client.patch(`/sticky-notes/${id}/`, data);
export const deleteStickyNote = (id) => client.delete(`/sticky-notes/${id}/`);

// themes
export const getTheme  = ()           => client.get('/user/theme/');
export const saveTheme = (payload)    => client.post('/user/theme/', payload);

// pomodoro
export const completePomodoro = () => client.post('/auth/pomodoro/complete/');