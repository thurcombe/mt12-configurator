import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'));
let commitHash = 'dev';
try { commitHash = execSync('git rev-parse --short HEAD').toString().trim(); } catch { /* no git in Docker build context */ }

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(
      process.env.NODE_ENV === 'production' ? version : commitHash
    ),
  },
  test: {
    environment: 'node',
  },
});
