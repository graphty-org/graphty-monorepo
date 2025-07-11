import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['layout.ts'],
      exclude: ['**/*.d.ts', '**/*.test.ts'],
      all: true,
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    },
    include: ['test/**/*.test.ts'],
    reporters: ['verbose']
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});