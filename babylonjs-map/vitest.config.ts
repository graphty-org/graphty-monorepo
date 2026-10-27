import { defineConfig } from "vitest/config";

import { workerShare } from "../tools/test-slots.mjs";
import { ciReporters } from "../vitest.ci-junit.mjs";

// Standalone rather than vitest.shared.config.ts, like graph-samples: the shared factory runs
// happy-dom, and these tests are plain math with no DOM.
export default defineConfig({
    test: {
        // The machine-wide limit on concurrent test runs (tools/test-slots.mjs; off on GitHub Actions).
        globalSetup: ["../tools/test-slots.mjs"],
        // At most this run's share of the cores for the Node projects (tools/test-slots.mjs); browser
        // projects keep their own maxWorkers or fileParallelism.
        maxWorkers: workerShare(),
        globals: true,
        environment: "node",
        pool: "forks",
        include: ["test/**/*.test.ts"],
        reporters: [...(process.env.CI ? ["default"] : ["verbose"]), ...ciReporters()],
        coverage: {
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
