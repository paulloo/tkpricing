import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['tests/helpers/global-setup.ts'],
    setupFiles: ['tests/helpers/setup-env.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/server/**'],
    },
  },
});
