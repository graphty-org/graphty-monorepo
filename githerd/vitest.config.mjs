import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["test/**/*.test.mjs"],
        // A machine-wide test slot for the whole run (tools/test-slots.mjs), like every package, and a
        // check that no test wrote to the real ~/.githerd (test/temp-home.setup.mjs prevents it).
        globalSetup: ["../tools/test-slots.mjs", "test/real-home.global.mjs"],
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
