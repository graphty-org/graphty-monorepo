import { defineConfig } from "vitest/config";

import { workerShare } from "../tools/test-slots.mjs";
import { TIMING_FUZZ_SETUP, timingFuzzConfig } from "../tools/timing-fuzzer.mjs";
import { ciReporters } from "../vitest.ci-junit.mjs";

export default defineConfig({
    test: {
        // The JUnit report in CI and the time-budget check (vitest.ci-junit.mjs), like every package.
        reporters: ["default", ...ciReporters()],
        environment: "node",
        include: ["test/**/*.test.mjs"],
        // A machine-wide test slot for the whole run (tools/test-slots.mjs), like every package, and a
        // check that no test wrote to the real ~/.githerd (test/temp-home.setup.mjs prevents it).
        globalSetup: ["../tools/test-slots.mjs", "test/real-home.global.mjs"],
        // At most this run's share of the cores (tools/test-slots.mjs): a Node run would otherwise fork
        // one worker per core, and CPU-bound tests ran past their time limits beside other slots' runs.
        maxWorkers: workerShare(),
        // No test runs git with the developer's own config, including a GIT_CONFIG_COUNT signing override.
        // No test sees the developer's real HOME.
        // Under GRAPHTY_TIMING_FUZZ, every test runs with the clock and timers perturbed (tools/timing-fuzzer.mjs).
        setupFiles: [TIMING_FUZZ_SETUP, "test/isolate-git.setup.mjs", "test/temp-home.setup.mjs"],
        ...timingFuzzConfig(),
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
