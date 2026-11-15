// Tests of tools/bisect-core.mjs: recorded verifications replay to verify.mjs's answers, and the rules alone.
//
//   node tools/bisect-core.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { bisectStep, classify, nextPoints, parentFails, replay } from "./bisect-core.mjs";

const { recordings } = JSON.parse(readFileSync(new URL("./bisect-core.recordings.json", import.meta.url), "utf8"));

describe("recorded verifications", () => {
    for (const rec of recordings)
        it(rec.name, () => {
            const { answer, left } = replay(rec);
            assert.deepEqual(answer, rec.answer);
            assert.deepEqual(left, {}, "every recorded run is read, so the replay ran the points verify.mjs ran");
        });

    it("covers a culprit, a flaky-before and a no-culprit answer", () => {
        const answers = recordings.map((r) => r.answer);
        assert.ok(answers.some((a) => a.culprit));
        assert.ok(answers.some((a) => a.status === "flaky"));
        assert.ok(answers.some((a) => !a.culprit && a.noLanding));
    });

    it("refuses a recording that lacks a run the rules ask for", () => {
        const rec = structuredClone(recordings[0]);
        rec.runs[rec.target].pop();
        assert.throws(() => replay(rec), /has no run 5 of/);
    });
});

describe("the rules", () => {
    const t = (id, extra = {}) => ({ id, shard: "s", file: `${id}.test.ts`, name: id, ...extra });

    it("sorts a confirming run into consistent, newly intermittent and flaky before the range", () => {
        const targets = [t("a"), t("b"), t("c")];
        const r = { runs: 5, failed: { a: 5, b: 2, c: 1 } };
        const c = classify(targets, r, (ts) => ts.filter((x) => x.id === "b"));
        assert.deepEqual(c.consistent, ["a"]);
        assert.deepEqual(c.regressed, ["b"]);
        assert.deepEqual(
            c.flaky.map((x) => x.id),
            ["c"],
        );
    });

    it("names no landing with no candidates, or when the newest passes", () => {
        assert.match(bisectStep({ candidates: [], points: {} }, 2).noLanding, /no landing since/);
        assert.match(bisectStep({ candidates: ["x", "y"], points: { y: "good" } }, 2).noLanding, /newest landing y/);
    });

    it("tests the newest first, then spreads points, then blames next to the last good one", () => {
        const candidates = ["a", "b", "c", "d", "e"];
        assert.deepEqual(bisectStep({ candidates, points: {} }, 2).points, [4, 2]);
        assert.deepEqual(nextPoints({ candidates, points: { e: "bad", c: "good" } }, 2), [3]);
        assert.deepEqual(bisectStep({ candidates, points: { e: "bad", c: "good", d: "bad" } }, 2), { blame: "d" });
    });

    it("clears a parent only when it passes every run", () => {
        assert.equal(parentFails("abc", "def", { runs: 5, failed: {} }), null);
        assert.match(parentFails("abc", "def", { runs: 5, failed: { x: 0, y: 2 } }), /fails it too \(in 2 of 5 runs\)/);
    });
});
