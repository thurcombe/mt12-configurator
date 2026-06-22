import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'));
let commitHash = 'dev';
try { commitHash = execSync('git rev-parse --short HEAD').toString().trim(); } catch { /* no git in Docker build context */ }

// Prefer APP_VERSION injected at build time (set from git tag in CI), then fall back to
// package.json version in production or the commit hash in dev.
const appVersion = process.env.APP_VERSION
  ? process.env.APP_VERSION.replace(/^v/, '')
  : process.env.NODE_ENV === 'production' ? version : commitHash;

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __REPO_URL__: JSON.stringify('https://github.com/thurcombe/mt12-configurator'),
  },
  test: {
    environment: 'node',
  },
});
