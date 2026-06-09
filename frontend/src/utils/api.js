import axios from 'axios';
import mockApi from './mockApi';

export const isStandalone = import.meta.env.VITE_STANDALONE === 'true';

let api;

if (isStandalone) {
  api = mockApi;
} else {
  const instance = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  });

  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('wc2026_token');
      if (token) config.headers['Authorization'] = `Bearer ${token}`;
      return config;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('wc2026_token');
        localStorage.removeItem('wc2026_user');
        if (!window.location.hash.includes('login')) {
          window.location.hash = '#/login';
        }
      }
      return Promise.reject(error);
    }
  );

  api = instance;
}

export default api;
