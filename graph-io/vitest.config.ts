import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        pool: "forks",
        testTimeout: 30000,
        include: ["test/**/*.test.ts"],
        // verbose prints a line per test: useful locally, needless noise in CI.
        reporters: process.env.CI ? ["default"] : ["verbose"],
        // see test/setup/yield-to-event-loop.ts -- without it one audit file holds the worker
        // past birpc's hardcoded 60 s RPC timeout on a CI runner and fails a green run
        setupFiles: ["./test/setup/yield-to-event-loop.ts"],
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
