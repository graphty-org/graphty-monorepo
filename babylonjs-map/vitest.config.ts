import { defineConfig } from "vitest/config";

import { withTestGuards } from "../tools/test-wait-guard.mjs";
import { baseTest } from "../vitest.base.mjs";

// Standalone rather than vitest.shared.config.ts, like graph-samples: the shared factory runs
// happy-dom, and these tests are plain math with no DOM.
// One hang guard for every test, hook and wait (tools/test-wait-guard.mjs).
export default withTestGuards(
    defineConfig({
        test: {
            ...baseTest({ reporters: [process.env.CI ? "default" : "verbose"] }),
            globals: true,
            environment: "node",
            pool: "forks",
            include: ["test/**/*.test.ts"],
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
    }),
);
