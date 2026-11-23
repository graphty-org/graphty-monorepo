// Checks of parity-vs-reference.mjs that need no browser or GPU: what each stage reports as a difference.
//   node --test benchmarks/compare/parity-vs-reference.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";

import {
    classifyPictures,
    compareFrames,
    diffOutcomes,
    FRAME_SCENARIOS,
    outcomes,
    removedAssertions,
} from "./parity-vs-reference.mjs";

test("a changed picture of an unchanged story is a regression; of a changed story, listed apart", () => {
    const items = [
        { id: "a--one", file: "a--one.png", status: "changed" },
        { id: "b--two", file: "b--two.png", status: "changed" },
        { id: "c--three", file: "c--three.png", status: "unchanged" },
        { id: "d--four", file: "d--four.png", status: "new" },
    ];
    const paths = new Map([
        ["a--one", "./stories/A.stories.ts"],
        ["b--two", "./stories/B.stories.ts"],
    ]);
    const c = classifyPictures(items, paths, new Set(["graphty-element/stories/B.stories.ts"]));
    assert.deepEqual(
        c.regressions.map((r) => r.id),
        ["a--one"],
    );
    assert.deepEqual(
        c.storyChanged.map((r) => r.id),
        ["b--two"],
    );
    assert.equal(c.unchanged, 1);
    assert.deepEqual(
        c.other.map((r) => r.id),
        ["d--four"],
    );
});

test("a test that passed on the reference and fails on HEAD is a regression", () => {
    const report = (statuses) => ({
        testResults: [
            {
                name: "/x/graphty-element/test/a.test.ts",
                assertionResults: Object.entries(statuses).map(([fullName, status]) => ({
                    fullName,
                    status,
                    failureMessages: status === "failed" ? ["boom"] : [],
                })),
            },
        ],
    });
    const ref = outcomes(report({ one: "passed", two: "failed", three: "failed" }), "/x/graphty-element");
    const head = outcomes(
        report({ one: "failed", two: "failed", three: "passed", four: "passed" }),
        "/x/graphty-element",
    );
    const d = diffOutcomes(ref, head);
    assert.deepEqual(
        d.regressed.map((r) => r.name),
        ["test/a.test.ts > one"],
    );
    assert.deepEqual(
        d.failBoth.map((r) => r.name),
        ["test/a.test.ts > two"],
    );
    assert.deepEqual(
        d.fixedOrNew.map((r) => r.name),
        ["test/a.test.ts > three", "test/a.test.ts > four"],
    );
});

test("a file that fails to load is one failed outcome, not silence", () => {
    const m = outcomes({ testResults: [{ name: "/r/t.test.ts", assertionResults: [], message: "no export" }] }, "/r");
    assert.equal(m.get("t.test.ts > (file)").status, "failed");
});

test("removed assertion lines are found in a diff; added ones and context are not", () => {
    const diff = [
        "--- a/x",
        "+++ b/x",
        "-    expect(a).toBe(1);",
        "+    expect(a).toBeGreaterThan(0);",
        "     expect(b).toBe(2);",
    ].join("\n");
    assert.equal(removedAssertions(diff).length, 1);
});

test("edges a frame behind their nodes on HEAD fail; the reference's margin passes; few moving frames check nothing", () => {
    const [s] = FRAME_SCENARIOS[0];
    const row = (build, path, cur, prev, moving = 20) => ({
        refdiff: { scenario: s, build, path },
        frameCheck: {
            frames: 3,
            edgeInkRate: [0.5, 0.5, 0.5],
            ctrlInkRate: [0.1, 0.1, 0.1],
            nodeInkRate: [1, 1, 1],
            movingEdges: [moving, moving, moving],
            curInkRate: [cur, cur, cur],
            prevInkRate: [prev, prev, prev],
        },
    });
    const f = compareFrames([
        row("ref", "objects", 0.8, 0.2),
        row("head", "objects", 0.75, 0.2),
        row("head", "batched", 0.3, 0.6),
    ]);
    const by = (p) => f.find((x) => x.scenario === s && x.path === p).verdict;
    assert.equal(by("objects"), "same");
    assert.match(by("batched"), /^edges drawn where their nodes were frames before/);
    // the scratch break (edges updated every 15th frame) measured at 1,000 nodes: follow 0.17 against 0.48
    const worse = compareFrames([row("ref", "objects", 0.657, 0.338), row("head", "objects", 0.222, 0.185)]);
    assert.match(worse.find((x) => x.scenario === s && x.path === "objects").verdict, /^edges behind/);
    const still = compareFrames([row("ref", "objects", 0.8, 0.2), row("head", "objects", 0.8, 0.2, 0)]);
    assert.match(still.find((x) => x.scenario === s && x.path === "objects").verdict, /nothing checked/);
    const buried = compareFrames([row("ref", "objects", 0.8, 0.2), row("head", "objects", 0.01, 0.01)]);
    assert.match(buried.find((x) => x.scenario === s && x.path === "objects").verdict, /hidden under other rows/);
});
