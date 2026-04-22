import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:8000/api';
const client = axios.create({
    baseURL: BASE_URL,
    headers: {'Content-Type': 'application/json'},
    withCredentials: true,
});

client.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) config.headers.Authorization = `Token ${token}`;
    return config;
})

client.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status===401){
            localStorage.removeItem(`authToken`);
        }
        return Promise.reject(err);
    }
)

export default client;