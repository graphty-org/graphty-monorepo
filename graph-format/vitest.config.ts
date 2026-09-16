import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        pool: "forks",
        testTimeout: 30000,
        include: ["test/**/*.test.ts"],
        // verbose prints a line per test, which is what you want locally and cannot afford in CI.
        // The CI shard runs `nx run graph-format:coverage` -> `npm run coverage` -> vitest, so the
        // reporter's output crosses two extra pipes before the Actions runner drains it. At this
        // suite's size that fills the pipe buffers, vitest's main process blocks in write() to
        // stdout, and while it is blocked it cannot answer a worker's onTaskUpdate RPC -- which
        // gives up after a hardcoded 60 s and fails the run as an unhandled error with every test
        // passing. The default reporter prints per file instead of per test.
        reporters: process.env.CI ? ["default"] : ["verbose"],
        coverage: {
            all: true,
            provider: "v8",
            reporter: ["text", "json-summary", "json", "lcov", "html"],
            reportsDirectory: "coverage",
            include: ["src/**/*.ts"],
            exclude: ["**/*.d.ts", "**/*.test.ts", "**/index.ts"],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 75,
                statements: 80,
            },
        },
    },
});
