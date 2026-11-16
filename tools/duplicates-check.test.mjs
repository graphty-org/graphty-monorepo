// Tests of tools/duplicates-check.mjs's filter: which new clones fail the check and which are only reported.
//
//   node --test tools/duplicates-check.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isTest, newClones } from "./duplicates-check.mjs";

const clone = (a, b, fragment = "const x = compute(a, b);", kind = "exact") => ({
    kind,
    fragment,
    lines: 6,
    firstFile: { name: a, start: 1 },
    secondFile: { name: b, start: 10 },
});

describe("duplicates check", () => {
    it("tells tests, stories, fixtures and benchmarks from code", () => {
        for (const f of [
            "a/test/x.ts",
            "a/src/x.test.ts",
            "a/stories/X.stories.tsx",
            "a/src/__tests__/y.ts",
            "benchmarks/b.js",
        ]) {
            assert.ok(isTest(f), f);
        }
        for (const f of ["a/src/x.ts", "tools/test-changed.mjs", "graphty/src/latest.tsx"]) assert.ok(!isTest(f), f);
    });

    it("fails a new code clone in a changed file and only reports one that touches a test", () => {
        const head = [clone("a/src/x.ts", "b/src/y.ts"), clone("a/src/x.ts", "a/test/x.test.ts")];
        const { blocking, report } = newClones(head, [], ["a/src/x.ts"]);
        assert.deepEqual(blocking, [head[0]]);
        assert.deepEqual(report, [head[1]]);
    });

    it("ignores clones the base had, even with an edited comment or swapped sides", () => {
        const base = [clone("b/src/y.ts", "a/src/x.ts", "const x = compute(a, b); // NOSONAR(S1): why")];
        const head = [
            clone("a/src/x.ts", "b/src/y.ts", "const x =\n    compute(a, b); // eslint-disable-line r -- why"),
        ];
        assert.deepEqual(newClones(head, base, ["a/src/x.ts"]).blocking, []);
    });

    it("counts only exact clones touching a changed file", () => {
        const head = [clone("a/src/x.ts", "b/src/y.ts", "f()", "similar"), clone("c/src/p.ts", "d/src/q.ts")];
        assert.deepEqual(newClones(head, [], ["a/src/x.ts"]), { blocking: [], report: [] });
    });

    it("keeps a URL in a string as code", () => {
        const base = [clone("a/src/x.ts", "b/src/y.ts", 'get("https://a.example/v1")')];
        const head = [clone("a/src/x.ts", "b/src/y.ts", 'get("https://b.example/v1")')];
        assert.equal(newClones(head, base, ["a/src/x.ts"]).blocking.length, 1);
    });
});
