import axios from 'axios';

const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {'Content-Type': 'application/json'},
    withCredentials: false,
});

client.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

client.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401){
            localStorage.removeItem('authToken');
            window.location.href = '/login';  // ← redirect to login
        }
        return Promise.reject(err);
    }
);

export default client;