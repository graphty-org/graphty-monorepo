// The JUnit report every vitest run writes in CI, for Mergify Test Insights (flaky-test detection).
//
// Each package's vitest config spreads ciJunitReporter() into its `reporters`. In CI (CI set) every
// vitest run then writes test-results/junit-<package>-<pid>.xml at the repository root -- one file
// per run, because one CI shard can run vitest several times -- and ci.yml's test job uploads
// test-results/junit-*.xml to Mergify. Locally it returns nothing, so local output is unchanged.
//
// A shard command that passes its own --reporter flags replaces the config's reporters, so it adds
// --reporter=junit itself when CI is set (tools/ci-test-matrix.mjs); vitest then takes the junit
// options, the output file included, from the config.
//
// Plain JavaScript beside a .d.mts, not part of vitest.shared.config.ts: graphty and layout type-check
// their vitest config inside a composite TypeScript project, which refuses a .ts source file outside
// the package.

import { basename } from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

/**
 * In CI, the JUnit reporter entry to spread into a vitest config's `reporters`; locally, none.
 * @param [options] - extra junit reporter options, e.g. a classnameTemplate
 * that tells apart two passes of the same tests under different settings
 * @returns the reporter entries
 */
export function ciJunitReporter(options = {}) {
    if (!process.env.CI) {
        return [];
    }
    const name = `test-results/junit-${basename(process.cwd())}-${process.pid}.xml`;
    return [["junit", { outputFile: fileURLToPath(new URL(name, import.meta.url)), ...options }]];
}
