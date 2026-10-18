import path from "node:path";
import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import { workerShare } from "../tools/test-slots.mjs";
import { ciReporters } from "../vitest.ci-junit.mjs";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Standalone rather than vitest.shared.config.ts, like graph-format: the shared factory runs happy-dom, and
// headless Cytoscape needs no DOM. @graphty/* resolve through their dist/, so build them first (nx does).
export default defineConfig({
    test: {
        // The machine-wide limit on concurrent test runs (tools/test-slots.mjs; off on GitHub Actions).
        globalSetup: ["../tools/test-slots.mjs"],
        // At most this run's share of the cores for the Node projects (tools/test-slots.mjs); browser
        // projects keep their own maxWorkers or fileParallelism.
        maxWorkers: workerShare(),
        reporters: [...(process.env.CI ? ["default"] : ["verbose"]), ...ciReporters()],
        coverage: {
            provider: "v8",
            reporter: ["text", "json-summary", "json", "lcov", "html"],
            reportsDirectory: "coverage",
            include: ["src/**/*.ts"],
            exclude: ["**/*.d.ts", "**/index.ts"],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 75,
                statements: 80,
            },
        },
        projects: [
            {
                resolve: {
                    alias: {
                        // the package's `imports` field maps "#gpu-platform" to dist/; the tests run the source
                        "#gpu-platform": fileURLToPath(new URL("src/gpu-platform-node.ts", import.meta.url)),
                        // CYTOSCAPE_DIR runs the suite against another Cytoscape 3.x (CI tests the oldest and newest the
                        // peer range admits); the type check in test/consumer-types.test.ts follows it too
                        ...(process.env.CYTOSCAPE_DIR ? { cytoscape: process.env.CYTOSCAPE_DIR } : {}),
                    },
                },
                test: {
                    name: "default",
                    // dataset downloads read graph-samples' build output instead of graphty.app (test/setup/local-datasets.mjs)
                    setupFiles: ["./test/setup/local-datasets.mjs"],
                    globals: true,
                    // The workspace packages resolve to their built dist/ outside node_modules, so vitest would transform
                    // them (graph-io's 13 MB took 2 s on its first import); load them as plain Node modules like any
                    // dependency.
                    server: {
                        deps: {
                            external: [
                                /\/(graph-format|graph-io|graph-samples|algorithms|layout|webgpu-graph-algorithms)\/dist\//,
                            ],
                        },
                    },
                    environment: "node",
                    include: ["test/**/*.test.ts"],
                    // The monorepo's suite limit (vitest.shared.config.ts): the slowest tests spawn tsc, a Vite build or
                    // a child Node and wait for it to exit (6 s for the strict-consumer tsc run on an idle machine).
                    testTimeout: 30000,
                    hookTimeout: 30000,
                },
            },
            {
                // Every story's play function, run as a test, so a story that throws or fails is caught here and not
                // only in the visual capture. Its own CI shard, cytoscape-extensions-storybook
                // (tools/ci-test-matrix.mjs). The stories' Vite settings (the browser "#gpu-platform", the datasets
                // served beside the Storybook) come from .storybook/main.ts.
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
                    fileParallelism: false,
                    testTimeout: 30000,
                },
            },
        ],
    },
});
