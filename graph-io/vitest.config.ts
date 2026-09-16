import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        pool: "forks",
        testTimeout: 30000,
        include: ["test/**/*.test.ts"],
        // verbose prints a line per test, and this suite has over 4000 of them. The CI shard runs
        // `nx run graph-io:coverage` -> `npm run coverage` -> vitest, so that output crosses two
        // extra pipes before the Actions runner drains it; the buffers fill, vitest's main process
        // blocks in write() to stdout, and while blocked it cannot answer a worker's onTaskUpdate
        // RPC -- which gives up after a hardcoded 60 s and fails the run as an unhandled error
        // with every test passing. The default reporter prints per file instead of per test.
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
