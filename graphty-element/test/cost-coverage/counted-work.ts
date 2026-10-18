/**
 * Which counted-work test covers each graph-mutating public method (see `method-classes.ts`).
 *
 * A counted-work test runs the method and asserts how much work it did -- a count of visits,
 * searches, repaints or rebuilds, never a time -- so that a cost per call that grows with the size
 * of the graph fails it. New ones use `assertScalesLinearly` from `test/helpers/cost.ts`. Each
 * file named here must be a gating test (`*.test.ts`, not `*.bench.test.ts`).
 *
 * Each test registers itself in a sibling module, `<name>.counted-work.ts` next to `<name>.test.ts`,
 * whose default export names the test file and the methods it covers:
 *
 * ```ts
 * import type { CountedWork } from "../cost-coverage/counted-work";
 *
 * export default {
 *     file: "test/browser/data-path-scaling.test.ts",
 *     methods: ["Graph.addNodes", "Graph.removeNodes"],
 * } satisfies CountedWork;
 * ```
 *
 * A registration is a plain module rather than a call inside the test so that `cost-coverage.test.ts`
 * can read it in the default project without running the browser tests it names; it imports
 * nothing but this type. One module per test means two pull requests that cover different methods
 * in different tests never edit the same file. To add a method to a test whose module another
 * open pull request is also editing, a second module (`<name>.<topic>.counted-work.ts`) naming the
 * same file works too.
 *
 * A mutating method nobody has covered yet has a file of its own in `not-yet-covered/`, named
 * `<Owner.method>.txt` and holding the reason. The pull request that covers it deletes that one file.
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** A counted-work test and the methods (`Owner.method`, as `method-classes.ts` spells them) it covers. */
export interface CountedWork {
    /** The test file, relative to the package, such as `test/browser/data-path-scaling.test.ts`. */
    readonly file: string;
    readonly methods: readonly string[];
}

/** Every registration module under `test/`, by its path. */
export const REGISTRATIONS: Readonly<Record<string, CountedWork>> = Object.fromEntries(
    Object.entries(import.meta.glob<{ default: CountedWork }>("../**/*.counted-work.ts", { eager: true })).map(
        ([module, { default: registration }]) => [module, registration],
    ),
);

/** Method to the test files that count its work, collected from every registration module. */
export const COUNTED_WORK_TESTS: Readonly<Record<string, readonly string[]>> = (() => {
    const tests: Record<string, string[]> = {};
    for (const { file, methods } of Object.values(REGISTRATIONS)) {
        for (const method of methods) {
            tests[method] = [...new Set([...(tests[method] ?? []), file])];
        }
    }

    return tests;
})();

/** The GitHub issue tracking the methods below. */
export const NOT_YET_COVERED_ISSUE = 1643;

/** The directory holding one `<Owner.method>.txt` file per mutating method with no counted-work test yet. */
export const NOT_YET_COVERED_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "not-yet-covered");

/**
 * Mutating methods with no counted-work test yet (issue #1643), one file each in `not-yet-covered/`.
 * The list only shrinks: write the test, register it, and delete the method's file.
 * `cost-coverage.test.ts` fails on a method that is both here and registered, and on one that is no
 * longer a mutating method in the reports.
 */
export const NOT_YET_COVERED: readonly string[] = readdirSync(NOT_YET_COVERED_DIR)
    .map((name) => name.replace(/\.txt$/, ""))
    .sort();
