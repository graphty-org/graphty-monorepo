// The reporters every vitest run adds in CI: the JUnit report for Mergify Test Insights (flaky-test
// detection) and the time-budget check (tools/vitest-time-budget.mjs).
//
// Each package's vitest config spreads ciReporters() into its `reporters`. In CI (CI set) every
// vitest run then writes test-results/junit-<package>-<pid>.xml at the repository root -- one file
// per run, because one CI shard can run vitest several times -- and ci.yml's test job uploads
// test-results/junit-*.xml to Mergify. With VITEST_BUDGET_CHECK=1 (ci.yml's test job sets it; set
// it locally to check before pushing) the run also warns about any passing test that used more than a
// quarter of its time limit, and fails for one over half in a file the pull request changed (with
// VITEST_BUDGET_BASE set). Otherwise it returns nothing, so local output is unchanged.
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
        const name = `test-results/junit-${basename(process.cwd())}-${process.pid}.xml`;
        reporters.push(["junit", { outputFile: fileURLToPath(new URL(name, import.meta.url)), ...options }]);
    }
    if (process.env.VITEST_BUDGET_CHECK === "1") {
        reporters.push([fileURLToPath(new URL("tools/vitest-time-budget.mjs", import.meta.url)), {}]);
    }
    return reporters;
}
