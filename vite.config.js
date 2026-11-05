import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // On this Windows machine "localhost" made Vite listen on IPv6 (::1) only, so browsers that
  // tried 127.0.0.1 showed "can't be reached". A fixed IPv4 address works for both URLs.
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    // Each jsdom worker is memory-hungry; on the 4-core / 8 GB dev machine more workers caused
    // "Timeout waiting for worker to respond" and 5 s test timeouts under load.
    maxWorkers: 2,
    testTimeout: 15_000,
  },
});
