import { defineConfig } from "vitest/config";

// Standalone rather than vitest.shared.config.ts, like graph-format and graph-io: the shared factory
// runs happy-dom, and this package is plain Node code with no DOM.
export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        pool: "forks",
        testTimeout: 30000,
        include: ["test/**/*.test.ts"],
        reporters: process.env.CI ? ["default"] : ["verbose"],
        // see test/setup/yield-to-event-loop.ts (the vitest 3 birpc 60 s timeout on long synchronous files)
        setupFiles: ["./test/setup/yield-to-event-loop.ts"],
        coverage: {
            all: true,
            provider: "v8",
            reporter: ["text", "json-summary", "json", "lcov", "html"],
            reportsDirectory: "coverage",
            include: ["src/**/*.ts"],
            exclude: ["**/*.d.ts", "**/*.test.ts", "**/index.ts", "src/datasets/*/data.ts"],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 75,
                statements: 80,
            },
        },
    },
});
