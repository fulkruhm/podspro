import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const devHost = env.VITE_DEV_HOST || '127.0.0.1';
    const devPort = Number(env.VITE_DEV_PORT || 3000);
    return {
      server: {
        port: Number.isFinite(devPort) ? devPort : 3000,
        host: devHost,
        cors: false,
      },
      plugins: [react(), tailwindcss()],
      define: {
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || 'http://localhost:3001/api')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
