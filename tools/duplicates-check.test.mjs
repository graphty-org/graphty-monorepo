// Tests of tools/duplicates-check.mjs's filter: which new clones fail the check and which are only reported.
//
//   node --test tools/duplicates-check.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addedLines, isTest, newClones } from "./duplicates-check.mjs";

const clone = (a, b, fragment = "const x = compute(a, b);", kind = "exact", start = 1, end = 6) => ({
    kind,
    fragment,
    lines: end - start + 1,
    firstFile: { name: a, start, end },
    secondFile: { name: b, start: start + 9, end: end + 9 },
});
// Every line of the file is added, as for a new file.
const all = (...files) => new Map(files.map((f) => [f, [[1, Infinity]]]));

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
        const { blocking, report } = newClones(head, [], all("a/src/x.ts"));
        assert.deepEqual(blocking, [head[0]]);
        assert.deepEqual(report, [head[1]]);
    });

    it("ignores clones the base had, even with an edited comment or swapped sides", () => {
        const base = [clone("b/src/y.ts", "a/src/x.ts", "const x = compute(a, b); // old comment: why")];
        const head = [
            clone("a/src/x.ts", "b/src/y.ts", "const x =\n    compute(a, b); // eslint-disable-line r -- why"),
        ];
        assert.deepEqual(newClones(head, base, all("a/src/x.ts")).blocking, []);
    });

    it("counts only exact clones touching an added line", () => {
        const head = [clone("a/src/x.ts", "b/src/y.ts", "f()", "similar"), clone("c/src/p.ts", "d/src/q.ts")];
        assert.deepEqual(newClones(head, [], all("a/src/x.ts")), { blocking: [], report: [] });
    });

    it("keeps a URL in a string as code", () => {
        const base = [clone("a/src/x.ts", "b/src/y.ts", 'get("https://a.example/v1")')];
        const head = [clone("a/src/x.ts", "b/src/y.ts", 'get("https://b.example/v1")')];
        assert.equal(newClones(head, base, all("a/src/x.ts")).blocking.length, 1);
    });

    it("ignores the pieces of an old clone split by an edited line", () => {
        const lines = Array.from({ length: 12 }, (_, i) => `const v${i} = f(${i});`);
        const base = [clone("a/src/x.ts", "b/src/y.ts", lines.join("\n"), "exact", 1, 12)];
        // Line 6 changed in x.ts: jscpd reports lines 1-6 and 6-12, each holding the edited line.
        const edited = lines.with(5, "const v5 = f(500);");
        const head = [
            clone("a/src/x.ts", "b/src/y.ts", edited.slice(0, 6).join("\n"), "exact", 1, 6),
            clone("a/src/x.ts", "b/src/y.ts", edited.slice(5).join("\n"), "exact", 6, 12),
        ];
        assert.deepEqual(newClones(head, base, new Map([["a/src/x.ts", [[6, 6]]]])).blocking, []);
    });

    it("ignores an old clone in a renamed file, since the rename adds no line", () => {
        const diff = [
            "diff --git a/a/src/x.ts b/a/src/x2.ts",
            "similarity index 100%",
            "rename from a/src/x.ts",
            "rename to a/src/x2.ts",
        ].join("\n");
        const head = [clone("a/src/x2.ts", "b/src/y.ts")];
        assert.deepEqual(newClones(head, [clone("a/src/x.ts", "b/src/y.ts")], addedLines(diff)).blocking, []);
    });

    it("fails a clone only where it overlaps an added line", () => {
        const head = [clone("a/src/x.ts", "b/src/y.ts", "g()", "exact", 20, 30)];
        assert.equal(newClones(head, [], new Map([["a/src/x.ts", [[5, 19]]]])).blocking.length, 0);
        assert.equal(newClones(head, [], new Map([["a/src/x.ts", [[30, 31]]]])).blocking.length, 1);
    });

    it("reads each file's added line ranges from git diff -U0", () => {
        const diff = [
            "diff --git a/a.ts b/a.ts",
            "--- a/a.ts",
            "+++ b/a.ts",
            "@@ -3 +3 @@ f()",
            "-old",
            "+new",
            "@@ -9,2 +8,0 @@",
            "-gone",
            "-gone",
            "@@ -20,0 +20,3 @@",
            "+++ an added line that looks like a header",
            "+b",
            "+c",
            "diff --git a/n.ts b/n.ts",
            "new file mode 100644",
            "--- /dev/null",
            "+++ b/n.ts",
            "@@ -0,0 +1,2 @@",
            "+x",
            "+y",
        ].join("\n");
        assert.deepEqual(
            addedLines(diff),
            new Map([
                [
                    "a.ts",
                    [
                        [3, 3],
                        [20, 22],
                    ],
                ],
                ["n.ts", [[1, 2]]],
            ]),
        );
    });
});
