import { defineConfig } from "vitest/config";

import { withTestGuards } from "../tools/test-wait-guard.mjs";
import { baseTest } from "../vitest.base.mjs";

// Node environment: these tests read files and bytes with no DOM. The Babylon.js half (src/load/,
// src/readers/, src/decoders/) draws in a browser and is covered by graphty-element's browser
// tests, which load every model variant here.
// One hang guard for every test, hook and wait (tools/test-wait-guard.mjs).
export default withTestGuards(
    defineConfig({
        test: {
            ...baseTest({ reporters: [process.env.CI ? "default" : "verbose"] }),
            environment: "node",
            pool: "forks",
            include: ["test/**/*.test.ts"],
            coverage: {
                provider: "v8",
                reporter: ["text", "json-summary", "json", "lcov", "html"],
                reportsDirectory: "coverage",
                include: ["src/files/**/*.ts", "src/detect/**/*.ts", "src/decoders/config.ts"],
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
