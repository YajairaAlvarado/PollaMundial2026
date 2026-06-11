import mockApi from './mockApi';
import liveApi from './liveApi';
import supabaseApi from './supabaseApi';

export const isStandalone = import.meta.env.VITE_STANDALONE === 'true';
const hasApiKey = !!import.meta.env.VITE_FOOTBALL_API_KEY;

let api;

if (isStandalone && hasApiKey) {
  api = liveApi;
} else if (isStandalone) {
  api = mockApi;
} else {
  api = supabaseApi;
}

export default api;
