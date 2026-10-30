import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { withTestGuards } from "../tools/test-wait-guard.mjs";
import { baseTest, localVerbose } from "../vitest.base.mjs";

const src = fileURLToPath(new URL("./src/", import.meta.url));

const config = defineConfig({
    // the documentation examples (docs/examples/) import the package by its published name, as a reader does
    resolve: {
        alias: [
            { find: /^@graphty\/graph-io\/sources\/([a-z0-9]+)$/, replacement: `${src}sources/$1/index.ts` },
            { find: /^@graphty\/graph-io\/styles$/, replacement: `${src}styles/index.ts` },
            { find: /^@graphty\/graph-io\/positions$/, replacement: `${src}positions/index.ts` },
            { find: /^@graphty\/graph-io\/([a-z0-9]+)$/, replacement: `${src}formats/$1/index.ts` },
            { find: /^@graphty\/graph-io$/, replacement: `${src}index.ts` },
            // the notebook examples import it from a CDN, as a page without a bundler does
            { find: /^https:\/\/esm\.sh\/@graphty\/graph-io$/, replacement: `${src}index.ts` },
            // the React example imports React's hooks, which it only defines a hook with
            { find: /^react$/, replacement: fileURLToPath(new URL("./test/setup/react-stub.ts", import.meta.url)) },
        ],
    },
    test: {
        ...baseTest({ reporters: [localVerbose()] }),
        globals: true,
        environment: "node",
        pool: "forks",
        include: ["test/**/*.test.ts"],
        // the browser tests run in Chromium under vitest.browser.config.ts (shard graph-io-browser)
        exclude: ["test/sources/browser/**", "**/node_modules/**"],
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
