import path from "node:path";
import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import { workerShare } from "../tools/test-slots.mjs";
import { ciReporters } from "../vitest.ci-junit.mjs";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    test: {
        // The machine-wide limit on concurrent test runs (tools/test-slots.mjs; off on GitHub Actions).
        globalSetup: ["../tools/test-slots.mjs"],
        // At most this run's share of the cores for the Node projects (tools/test-slots.mjs); browser
        // projects keep their own maxWorkers or fileParallelism.
        maxWorkers: workerShare(),
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html", "lcov"],
            include: ["src/**/*.ts"],
            exclude: ["**/*.d.ts", "**/*.test.ts"],
            thresholds: {
                lines: 65,
                functions: 60,
                branches: 85,
                statements: 65,
            },
        },
        reporters: ["verbose", ...ciReporters()],
        projects: [
            {
                extends: true,
                test: {
                    name: "default",
                    globals: true,
                    environment: "happy-dom",
                    pool: "forks",
                    testTimeout: 30000,
                    include: ["test/**/*.test.ts", "test/**/*.test.js"],
                    // test/types/*.test-d.ts are compile-only: tsc checks them as part of every run
                    typecheck: {
                        enabled: true,
                        include: ["test/types/**/*.test-d.ts"],
                        tsconfig: "./tsconfig.types.json",
                    },
                },
            },
            {
                // Every story's play function, run as a test, so a story that throws or whose play
                // fails is caught here and not only in the visual capture. Its own CI shard,
                // layout-storybook (tools/ci-test-matrix.mjs).
                extends: true,
                plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
                test: {
                    name: "storybook",
                    // The size the visual capture draws every story at.
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: playwright(),
                        instances: [{ browser: "chromium" }],
                        viewport: { width: 1200, height: 900 },
                    },
                    setupFiles: [".storybook/vitest.setup.ts"],
                    testTimeout: 30000,
                    fileParallelism: false,
                },
            },
        ],
    },
    resolve: {
        alias: {
            "@": "/src",
        },
    },
});
