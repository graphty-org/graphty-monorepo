// The reporters every vitest run adds in CI: the JUnit report (read by the flaky-test quarantine and
// tools/restricted-cpu-stress.mjs) and the slow-test report (tools/vitest-time-budget.mjs).
//
// Each package's vitest config spreads ciReporters() into its `reporters`. In CI (CI set) every
// vitest run then writes test-results/junit-<package>-[<TEST_LEDGER_RUN>-]<pid>.xml at the repository root -- one file
// per run, because one CI shard can run vitest several times. With VITEST_BUDGET_CHECK=1 (ci.yml's test job sets it; set
// it locally to see it) the run also reports every passing test over 10 s or over 3 times its recorded
// median, and never fails for one. Otherwise it returns nothing, so local output is unchanged.
//
// A shard command that passes its own --reporter flags replaces the config's reporters, so it adds
// --reporter=junit and the time-budget reporter itself (tools/ci-test-matrix.mjs); vitest then takes
// the junit options, the output file included, from the config.
//
// Plain JavaScript beside a .d.mts, not part of vitest.shared.config.ts: graphty and layout type-check
// their vitest config inside a composite TypeScript project, which refuses a .ts source file outside
// the package.

import { basename } from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

/**
 * The CI reporter entries to spread into a vitest config's `reporters`; locally, none.
 * @param [options] - extra junit reporter options, e.g. a classnameTemplate
 * that tells apart two passes of the same tests under different settings
 * @returns the reporter entries
 */
export function ciReporters(options = {}) {
    const reporters = [];
    if (process.env.CI) {
        // TEST_LEDGER_RUN (set per shard by the gate) lets tools/test-ledger.mjs find exactly this run's files.
        const run = process.env.TEST_LEDGER_RUN ? `${process.env.TEST_LEDGER_RUN}-` : "";
        const name = `test-results/junit-${basename(process.cwd())}-${run}${process.pid}.xml`;
        reporters.push(["junit", { outputFile: fileURLToPath(new URL(name, import.meta.url)), ...options }]);
    }
    if (process.env.VITEST_BUDGET_CHECK === "1") {
        reporters.push([fileURLToPath(new URL("tools/vitest-time-budget.mjs", import.meta.url)), {}]);
    }
    if (process.env.GRAPHTY_RESULTS_INVOCATION) {
        // tools/results/run-group.mjs sets it: each failed test goes to the results store as it happens.
        reporters.push([fileURLToPath(new URL("tools/results/reporter.mjs", import.meta.url)), {}]);
    }
    return reporters;
}
