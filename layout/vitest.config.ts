import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    pool: 'forks',
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.d.ts', '**/*.test.ts'],
      all: true,
      thresholds: {
        lines: 65,
        functions: 60,
        branches: 85,
        statements: 65
      }
    },
    include: ['test/**/*.test.ts', 'test/**/*.test.js'],
    reporters: ['verbose']
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});