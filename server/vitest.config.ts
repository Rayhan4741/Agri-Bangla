import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    testTimeout: 30000,
    env: { NODE_ENV: 'test', GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'gemini-test-main', GEMINI_FALLBACK_MODEL: 'gemini-test-lite' },
    hookTimeout: 120000,
  },
});
