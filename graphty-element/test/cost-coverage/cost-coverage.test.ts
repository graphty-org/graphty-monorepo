/**
 * @file Every graph-mutating public method has a counted-work test (issue #1591).
 *
 * Several one-item operations -- dispose a node, remove a node, check a key into a draft, add a
 * note -- cost the size of the whole graph, so the bulk paths that run them n times went
 * quadratic, and each was found late, by a freeze or a profile. This reads the public API from
 * the api-extractor reports (`api/*.api.md`, current on every pull request), and fails on a
 * method nobody classified, and on a mutating method with neither a registered counted-work test
 * nor a place on the shrinking not-yet-covered list.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { assert, describe, it } from "vitest";

import { DOOR_ROOTS } from "../../src/session/commands/doors";
import { assertScalesLinearly } from "../helpers/cost";
import { API_DIR, publicMethods } from "./api-methods";
import { COUNTED_WORK_TESTS, NOT_YET_COVERED, NOT_YET_COVERED_ISSUE } from "./counted-work";
import { MUTATING, READ_ONLY } from "./method-classes";

const PACKAGE_DIR = path.resolve(API_DIR, "..");
const methods = publicMethods();
const inReports = new Set(methods);
const mutating = new Set(MUTATING);
const readOnly = new Set(READ_ONLY);
const notYetCovered = new Set(NOT_YET_COVERED);

describe("assertScalesLinearly", () => {
    const sizes = [100, 400] as const;

    it("passes linear work as linear and fixed work as constant", async () => {
        await assertScalesLinearly((n) => 3 * n, { sizes });
        await assertScalesLinearly(() => 7, { sizes, growth: "constant" });
    });

    it("fails quadratic work as linear, linear work as constant, and a counter that saw nothing", async () => {
        await expectFailure(() => assertScalesLinearly((n) => n * n, { sizes }));
        await expectFailure(() => assertScalesLinearly((n) => n, { sizes, growth: "constant" }));
        await expectFailure(() => assertScalesLinearly(() => 0, { sizes }));
    });
});

/**
 * Assert that a scaling check fails.
 * @param check - The check.
 */
async function expectFailure(check: () => Promise<unknown>): Promise<void> {
    let failed = false;
    try {
        await check();
    } catch {
        failed = true;
    }

    assert.isTrue(failed, "the check failed");
}

describe("cost coverage", () => {
    it("reads a plausible number of methods from the reports", () => {
        // A parser that stopped matching would pass everything below vacuously.
        assert.isAbove(methods.length, 500);
        assert.include(methods, "SessionDataApi.addNodes");
        assert.include(methods, "LayoutEngine.removeNode", "protected members count");
        assert.include(methods, "Node.dispose", "a renamed declaration (Node_2) counts under its public name");
    });

    it("classifies every public method as mutating or read-only, once", () => {
        const unclassified = methods.filter((m) => !mutating.has(m) && !readOnly.has(m));
        assert.deepEqual(unclassified, [], "add each to MUTATING or READ_ONLY in test/cost-coverage/method-classes.ts");
        assert.deepEqual(
            MUTATING.filter((m) => readOnly.has(m)),
            [],
            "a method is in one list only",
        );
        assert.deepEqual(
            [...MUTATING, ...READ_ONLY].filter((m) => !inReports.has(m)),
            [],
            "no longer in the reports: delete it from method-classes.ts",
        );
    });

    it("classifies a method that dispatches a command as mutating", () => {
        const dispatching = DOOR_ROOTS.flatMap((root) =>
            Object.entries(root.doors ?? {})
                .filter(([, door]) => door.kind !== "readOnly" && door.kind !== "exempt")
                .map(([member]) => `${root.name}.${member}`),
        );
        assert.deepEqual(
            dispatching.filter((m) => readOnly.has(m)),
            [],
            "it changes project state (src/session/commands/doors.ts)",
        );
    });

    it("has a counted-work test, or a not-yet-covered entry, for every mutating method", () => {
        const uncovered = MUTATING.filter((m) => COUNTED_WORK_TESTS[m] === undefined && !notYetCovered.has(m));
        assert.deepEqual(
            uncovered,
            [],
            "write a counted-work test with assertScalesLinearly (test/helpers/cost.ts) and register it in " +
                "test/cost-coverage/counted-work.ts",
        );
    });

    it("registers only mutating methods, in gating test files that exist", () => {
        for (const [method, files] of Object.entries(COUNTED_WORK_TESTS)) {
            assert.isTrue(mutating.has(method), `${method} is a mutating method in the reports`);
            assert.isNotEmpty(files, method);
            for (const file of files) {
                assert.isTrue(existsSync(path.join(PACKAGE_DIR, file)), `${method}: ${file} exists`);
                assert.match(file, /^test\/.*\.test\.ts$/, `${method}: ${file} is a test file`);
                assert.notMatch(file, /\.bench\./, `${method}: ${file} gates a push (a bench file does not)`);
            }
        }
    });

    it("keeps the not-yet-covered list shrinking", () => {
        assert.isAbove(NOT_YET_COVERED_ISSUE, 0, "the list names its tracking issue");
        assert.deepEqual(
            NOT_YET_COVERED.filter((m) => COUNTED_WORK_TESTS[m] !== undefined),
            [],
            "covered now: delete it from NOT_YET_COVERED",
        );
        assert.deepEqual(
            NOT_YET_COVERED.filter((m) => !mutating.has(m)),
            [],
            "not a mutating method in the reports: delete it from NOT_YET_COVERED",
        );
        assert.strictEqual(new Set(NOT_YET_COVERED).size, NOT_YET_COVERED.length, "no duplicates");
    });
});
