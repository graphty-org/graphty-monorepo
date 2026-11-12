import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import { withTestGuards } from "../tools/test-wait-guard.mjs";
import { baseTest } from "../vitest.base.mjs";

const config = defineConfig({
    test: {
        ...baseTest({ reporters: ["verbose"] }),
        projects: [
            {
                test: {
                    name: "default",
                    globals: true,
                    environment: "happy-dom",
                    pool: "forks",
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
                    // Three pages at a time, as on a 4-core CI runner (Vitest's default is
                    // min(12, cores - 1); a --maxWorkers flag does not reach a browser project).
                    maxWorkers: 3,
                    // Vitest refuses two projects with different maxWorkers in one group order.
                    sequence: { groupOrder: 1 },
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: playwright(),
                        instances: [{ browser: "chromium" }],
                    },
                    include: ["test/browser/**/*.test.ts"],
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
        slowTestThreshold: 5000,
    },
    resolve: {
        alias: {
            "@": "/src",
        },
    },
});

// One hang guard for every test, hook and wait (tools/test-wait-guard.mjs).
export default withTestGuards(config);
