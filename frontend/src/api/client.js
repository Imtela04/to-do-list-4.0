import axios from 'axios';

const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {'Content-Type': 'application/json'},
    withCredentials: false,
});

// decode JWT expiry without a library
const getTokenExpiry = (token) => {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000; // convert to ms
    } catch {
        return null;
    }
};

const isExpiringSoon = (token) => {
    const expiry = getTokenExpiry(token);
    if (!expiry) return true;
    return Date.now() > expiry - 60_000; // refresh if less than 1 min left
};

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
    failedQueue = [];
};

const doRefresh = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');

    const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/refresh/`,
        { refresh: refreshToken }
    );
    localStorage.setItem('authToken', res.data.access);
    localStorage.setItem('refreshToken', res.data.refresh);
    return res.data.access;
};

// proactive refresh before request
client.interceptors.request.use(async (config) => {
    const token = localStorage.getItem('authToken');
    if (!token) return config;

    if (isExpiringSoon(token)) {
        if (!isRefreshing) {
            isRefreshing = true;
            try {
                const newToken = await doRefresh();
                processQueue(null, newToken);
                config.headers.Authorization = `Bearer ${newToken}`;
            } catch (err) {
                processQueue(err, null);
                localStorage.removeItem('authToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
            } finally {
                isRefreshing = false;
            }
        } else {
            // wait for the in-progress refresh
            const newToken = await new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            });
            config.headers.Authorization = `Bearer ${newToken}`;
        }
    } else {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// 401 fallback (in case server and client clocks are out of sync)
client.interceptors.response.use(
    (res) => res,
    async (err) => {
        if (err.response?.status === 401 && !err.config._retry) {
            err.config._retry = true;
            try {
                const newToken = await doRefresh();
                err.config.headers.Authorization = `Bearer ${newToken}`;
                return client(err.config);
            } catch {
                localStorage.removeItem('authToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
            }
        }
        return Promise.reject(err);
    }
);

export default client;