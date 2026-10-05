import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import { ciJunitReporter } from "../vitest.ci-junit.mjs";

export default defineConfig({
    test: {
        projects: [
            {
                test: {
                    name: "default",
                    globals: true,
                    environment: "happy-dom",
                    pool: "forks",
                    testTimeout: 30000,
                    // see test/setup/yield-to-event-loop.ts -- without it a file of long synchronous
                    // tests holds the worker past vitest's fixed 60 s RPC timeout and fails a green run
                    setupFiles: ["./test/setup/yield-to-event-loop.ts"],
                    exclude: [
                        // Browser-specific tests
                        "test/browser/**/*.test.ts",
                        // Broken on purpose; test/unit/golden-helper.test.ts runs them in a child vitest
                        "test/helpers/golden-cases/**",
                        // Standard vitest excludes
                        "**/node_modules/**",
                        "**/dist/**",
                        "**/.{idea,git,cache,output,temp}/**",
                        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
                    ],
                    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
                },
            },
            {
                test: {
                    name: "browser",
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: playwright(),
                        instances: [{ browser: "chromium" }],
                    },
                    include: ["test/browser/**/*.test.ts"],
                    testTimeout: 60000,
                    hookTimeout: 60000,
                },
            },
        ],
        coverage: {
            provider: "v8",
            reporter: ["text", "json-summary", "json", "lcov", "html"],
            // Allow override via COVERAGE_DIR env var for sharded coverage runs
            reportsDirectory: process.env.COVERAGE_DIR || "coverage",
            include: ["src/**/*.ts"],
            exclude: [
                "**/*.d.ts",
                "**/*.test.ts",
                "**/*.spec.ts",
                "**/types/**",
                "**/index.ts", // Usually just re-exports
            ],
            // Disable thresholds during sharded/partial runs (each shard alone won't meet thresholds)
            // Thresholds are checked at CI level after merging coverage
            // Skip thresholds if:
            // - COVERAGE_DIR is set (sharded local runs)
            // - Running specific project via --project flag (CI shards)
            thresholds:
                process.env.COVERAGE_DIR ||
                process.argv.includes("--project=browser") ||
                process.argv.includes("--project=default")
                    ? undefined
                    : {
                          lines: 80,
                          functions: 80,
                          branches: 75,
                          statements: 80,
                      },
        },
        reporters: ["verbose", ...ciJunitReporter()],
        slowTestThreshold: 5000,
        // Force exit after tests complete to prevent hanging
        teardownTimeout: 10000,
    },
    resolve: {
        alias: {
            "@": "/src",
        },
    },
});
