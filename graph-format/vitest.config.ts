import { defineConfig } from "vitest/config";

import { withTestGuards } from "../tools/test-wait-guard.mjs";
import { baseTest, localVerbose } from "../vitest.base.mjs";

const config = defineConfig({
    test: {
        ...baseTest({ reporters: [localVerbose()] }),
        globals: true,
        environment: "node",
        pool: "forks",
        include: ["test/**/*.test.ts"],
        // verbose prints a line per test: useful locally, needless noise in CI.
        // see test/setup/yield-to-event-loop.ts -- without it one audit file holds the worker
        // past birpc's hardcoded 60 s RPC timeout on a CI runner and fails a green run
        setupFiles: ["./test/setup/yield-to-event-loop.ts"],
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

// One hang guard for every test, hook and wait (tools/test-wait-guard.mjs).
export default withTestGuards(config);
