/**
 * The package's kernel-test rule (CLAUDE.md, Testing): every kernel test runs its kernel twice and asserts the two
 * outputs bitwise equal before the oracle, which is what catches races and uninitialised memory. This is the
 * structural check that keeps a new file from slipping past the rule: every test file under test/primitives,
 * test/layouts and test/algorithms either calls expectBitwiseEqual (from test/helpers/matchers.ts) or states in its
 * header why it cannot, with a "run-twice exempt:" line.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(".");
const DIRS = ["test/primitives", "test/layouts", "test/algorithms"];

/**
 * Files that neither run twice nor carry an exemption, each with the reason it is allowed to stay that way for now.
 * Keep this list short: the fix is a run-twice check or a header exemption in the file itself.
 */
const ALLOWED: Readonly<Record<string, string>> = {
    // Averages many seeded grid iterations and is bounded by per-process native memory; doubling the runs is not
    // possible until issue #162 (Dawn keeps native memory per grid iteration) is fixed.
    "test/layouts/grid-unbiased.test.ts": "issue #162",
};

describe("every kernel test runs its kernel twice or says why not", () => {
    for (const dir of DIRS) {
        for (const name of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".test.ts"))) {
            const file = `${dir}/${name}`;
            it(file, () => {
                const source = readFileSync(join(ROOT, file), "utf8");
                const covered = source.includes("expectBitwiseEqual(") || source.includes("run-twice exempt:");
                if (file in ALLOWED) {
                    expect(covered, `${file} is covered now: remove it from ALLOWED`).toBe(false);
                    return;
                }
                expect(
                    covered,
                    `${file}: call expectBitwiseEqual on two runs of the kernel, or add a "run-twice exempt:" line`,
                ).toBe(true);
            });
        }
    }
});
