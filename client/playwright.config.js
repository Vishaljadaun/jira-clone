import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', workers: 1, retries: 0, timeout: 60000,
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: [
    { command: 'node ../server/test/serve.cjs', url: 'http://127.0.0.1:5000/health', reuseExistingServer: false, timeout: 120000 },
    { command: 'npm run dev -- --host localhost --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: false }
  ]
});
