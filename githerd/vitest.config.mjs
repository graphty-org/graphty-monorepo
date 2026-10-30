import { defineConfig } from "vitest/config";

import { baseTest } from "../vitest.base.mjs";
import { withTestGuards } from "../tools/test-wait-guard.mjs";

const config = defineConfig({
    test: {
        // The monorepo's test slot, core share and CI reporters (vitest.base.mjs), and a check that no test
        // wrote to the real ~/.githerd (test/temp-home.setup.mjs prevents it).
        ...baseTest({ globalSetup: ["test/real-home.global.mjs"] }),
        environment: "node",
        include: ["test/**/*.test.mjs"],
        // No test runs git with the developer's own config, including a GIT_CONFIG_COUNT signing override.
        // No test sees the developer's real HOME.
        setupFiles: ["test/isolate-git.setup.mjs", "test/temp-home.setup.mjs"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json-summary", "json", "lcov", "html"],
            reportsDirectory: "coverage",
            // The library. bin/ is argument parsing around it, run as subprocesses, which v8 does
            // not count.
            include: ["lib/**/*.mjs"],
            thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
        },
    },
});

// One hang guard for every test, hook and wait (tools/test-wait-guard.mjs).
export default withTestGuards(config);
