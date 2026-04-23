import client from "./client";

// auth
export const register = (data) => client.post(`/auth/register/`, data)
export const login = (data) => client.post(`/auth/login/`, data)
export const logout = () => client.post(`/auth/logout/`)
export const getProfile = () => client.get(`/auth/profile/`)

// tasks
export const getTasks = (params={}) => client.get(`/tasks/`, {params });
export const createTasks = (data) => client.post(`/tasks/`, data);
export const updateTasks = (id, data) => client.patch(`/tasks/${id}/`, data);
export const deleteTasks = (id) => client.delete(`/tasks/${id}/`);
export const toggleTasks = (id,completed) => client.patch(`/tasks/${id}/`, { completed });

// categories
export const getCategories = () => client.get(`/categories/`);
export const createCategory = (data) => client.post(`/categories/`, data);
export const deleteCategory = (id) => client.delete(`/categories/${id}`);

// sticky notes
export const getStickyNotes = () => client.get(`/sticky-notes/`);
export const createStickyNote = (data) => client.post(`/sticky-notes/`, data);
export const updateStickyNote = (id, data) => client.patch(`/sticky-notes/${id}/`, data);
export const deleteStickyNote = (id) => client.delete(`/sticky-notes/${id}/`);