import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Un único timestamp para todo el build
const BUILD_VERSION = Date.now().toString();

// Plugin que genera dist/version.json al hacer build
function versionPlugin() {
  return {
    name: 'version-json',
    closeBundle() {
      fs.writeFileSync(
        path.resolve(__dirname, 'dist/version.json'),
        JSON.stringify({ version: BUILD_VERSION })
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isStandalone = env.VITE_STANDALONE === 'true';
  const appVersion = BUILD_VERSION;

  return {
    plugins: [react(), versionPlugin()],
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    base: env.VITE_BASE_URL || (isStandalone ? '/mipaginaweb/' : (mode === 'production' ? '/PollaMundial2026/' : '/')),
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
