import axios from 'axios';
import mockApi from './mockApi';
import liveApi from './liveApi';

export const isStandalone = import.meta.env.VITE_STANDALONE === 'true';
const hasApiKey = !!import.meta.env.VITE_FOOTBALL_API_KEY;
const apiUrl = import.meta.env.VITE_API_URL || '/api';

let api;

if (isStandalone && hasApiKey) {
  // Datos en tiempo real desde football-data.org
  api = liveApi;
} else if (isStandalone) {
  // Datos de demostración locales (sin API key)
  api = mockApi;
} else {
  // Backend propio (Node.js + SQLite / Render)
  const instance = axios.create({
    baseURL: apiUrl,
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
