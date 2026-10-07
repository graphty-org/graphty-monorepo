import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["test/**/*.test.mjs"],
        // No test runs git with the developer's own config, including a GIT_CONFIG_COUNT signing override.
        setupFiles: ["test/isolate-git.setup.mjs"],
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
