import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['layout.ts', 'dist/**/*.js'],
      exclude: ['**/*.d.ts', '**/*.test.ts', 'dist/**/*.d.ts'],
      all: true,
      thresholds: {
        lines: 65,
        functions: 60,
        branches: 85,
        statements: 65
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