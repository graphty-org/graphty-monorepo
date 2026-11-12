import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { withTestGuards } from "../tools/test-wait-guard.mjs";
import { baseTest, localVerbose } from "../vitest.base.mjs";

// Standalone rather than vitest.shared.config.ts, like graph-format and graph-io: the shared factory
// runs happy-dom, and this package is plain Node code with no DOM.
const src = fileURLToPath(new URL("./src/", import.meta.url));

const config = defineConfig({
    // the documentation examples (docs/examples/) import the package by its published name, as a reader does
    resolve: {
        alias: [
            { find: /^@graphty\/graph-samples$/, replacement: `${src}index.ts` },
            { find: /^@graphty\/graph-samples\/generators$/, replacement: `${src}generators/index.ts` },
            { find: /^@graphty\/graph-samples\/datasets\/([a-z0-9-]+)$/, replacement: `${src}datasets/$1/index.ts` },
        ],
    },
    test: {
        ...baseTest({ reporters: [localVerbose()] }),
        globals: true,
        environment: "node",
        pool: "forks",
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
                lines: 90,
                functions: 90,
                branches: 90,
                statements: 90,
            },
        },
    },
});

// One hang guard for every test, hook and wait (tools/test-wait-guard.mjs).
export default withTestGuards(config);
