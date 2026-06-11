import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isStandalone = env.VITE_STANDALONE === 'true';

  return {
    plugins: [react()],
    base: env.VITE_BASE_URL || (isStandalone ? '/mipaginaweb/' : '/'),
    server: {
      port: 5173,
      proxy: isStandalone ? {} : {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
