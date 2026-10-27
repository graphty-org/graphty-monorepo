import { defineConfig } from "vitest/config";

import { baseTest, localVerbose } from "../vitest.base.mjs";

// Standalone rather than vitest.shared.config.ts, like graph-format and graph-io: the shared factory
// runs happy-dom, and this package is plain Node code with no DOM.
export default defineConfig({
    test: {
        ...baseTest({ reporters: [localVerbose()] }),
        globals: true,
        environment: "node",
        pool: "forks",
        testTimeout: 30000,
        include: ["test/**/*.test.ts"],
        // see test/setup/yield-to-event-loop.ts (the vitest 3 birpc 60 s timeout on long synchronous files)
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
