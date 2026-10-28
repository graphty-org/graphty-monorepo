import { fileURLToPath } from "node:url";

import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import { withTestGuards } from "../tools/test-wait-guard.mjs";
import { baseTest, localVerbose } from "../vitest.base.mjs";

const src = fileURLToPath(new URL("./src/", import.meta.url));

// The network sources in a real browser: what Chromium refuses, and how ctx.fetch tells the causes
// apart, against a local server on another origin with and without CORS headers
// (test/sources/browser/cors-server.ts). CI shard graph-io-browser.
const config = defineConfig({
    resolve: {
        alias: [{ find: /^@graphty\/graph-io$/, replacement: `${src}index.ts` }],
    },
    test: {
        ...baseTest({ reporters: [localVerbose()], globalSetup: ["./test/sources/browser/cors-server.ts"] }),
        name: "browser",
        maxWorkers: 1,
        browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
        },
        include: ["test/sources/browser/**/*.test.ts"],
    },
});

// One hang guard for every test, hook and wait (tools/test-wait-guard.mjs).
export default withTestGuards(config);
