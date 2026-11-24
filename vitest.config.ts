import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  esbuild: { jsx: 'automatic' },
  // Les tests ne lisent jamais les identifiants admin du .env de la machine (vide = absent).
  test: { environment: 'node', env: { ADMIN_EMAIL: '', ADMIN_PASSWORD: '', ADMIN_NAME: '' }, include: ['tests/**/*.test.{ts,tsx}'], testTimeout: 20_000 },
});
