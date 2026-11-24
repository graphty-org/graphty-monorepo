// The load-time comparison's rules (tools/load-time.mjs): judged against a reference build timed on the same machine
// in ABBA rounds (the history per machine is for trends), and a regression only when the median and the minimum
// both rose past the factor and the floor.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FLOOR_MS, judge, pinned, pool, roundOrder, rowStatus, summarize, THRESHOLD } from "./load-time.mjs";

const row = (medianMs, minMs) => ({ group: "app", name: "graph settled", medianMs, minMs });
const session = (machine, medianMs, minMs) => ({ machine, results: [row(medianMs, minMs)] });

describe("load-time", () => {
    it("summarizes runs as their median and minimum", () => {
        assert.deepEqual(summarize("g", "n", [30, 10, 20]), {
            group: "g",
            name: "n",
            medianMs: 20,
            minMs: 10,
            samplesMs: [30, 10, 20],
        });
        assert.equal(summarize("g", "n", [10, 40, 20, 30]).medianMs, 25);
    });

    it("pins the best median and minimum of the same machine only", () => {
        const rows = pinned([session("a", 1000, 900), session("a", 1100, 800), session("b", 10, 10)], "a");
        assert.deepEqual(rows.get("app/graph settled"), { medianMs: 1000, minMs: 800 });
        assert.equal(pinned([session("b", 10, 10)], "a").size, 0);
    });

    it("needs the median and the minimum above the factor, by more than the floor", () => {
        const base = { medianMs: 1000, minMs: 900 };
        assert.equal(rowStatus(row(1000 * THRESHOLD, 2000), base), "ok");
        assert.equal(rowStatus(row(2000, 900 * THRESHOLD), base), "noisy");
        assert.equal(rowStatus(row(2000, 2000), base), "REGRESSION");
        assert.equal(rowStatus(row(2000, 2000), undefined), "new");
        const tiny = { medianMs: 10, minMs: 10 };
        assert.equal(rowStatus(row(10 + FLOOR_MS - 1, 10 + FLOOR_MS - 1), tiny), "too small");
    });

    it("catches a slowdown of x1.5, the smallest the owner would notice, and passes a machine with no baseline", () => {
        const baseline = [session("a", 3000, 2800)];
        assert.equal(judge([session("a", 4500, 4200)], baseline).regressions, 1);
        assert.equal(judge([session("a", 3100, 2900)], baseline).regressions, 0);
        assert.equal(judge([session("c", 9000, 9000)], baseline).regressions, 0);
    });

    it("alternates which build runs first, round by round (ABBA)", () => {
        assert.deepEqual([0, 1, 2, 3].map(roundOrder), [
            ["base", "candidate"],
            ["candidate", "base"],
            ["base", "candidate"],
            ["candidate", "base"],
        ]);
    });

    it("pools a side's rounds into one median and minimum per row", () => {
        const round = (samplesMs) => ({ machine: "a", results: [summarize("app", "graph settled", samplesMs)] });
        const [row] = pool([round([30, 10, 20]), round([60, 50, 40])]);
        assert.deepEqual(
            { name: row.name, medianMs: row.medianMs, minMs: row.minMs, n: row.samplesMs.length },
            { name: "graph settled", medianMs: 35, minMs: 10, n: 6 },
        );
    });

    // #9876: the same code on a runner x1.38 slower failed against the CPU model's history; paired, both builds ran on
    // that runner, so the pair passes, and a real x1.5 slowdown of the candidate still fails.
    it("judges the candidate against the reference timed on the same runner, never the runner's speed", () => {
        const sides = (slow, reference, candidate) => {
            const s = (ms) => ({ machine: "xeon", results: [row(ms * slow, (ms - 50) * slow)] });
            return [[s(candidate)], [s(reference)]];
        };
        const [history] = sides(1, 526, 526);
        assert.equal(judge(...sides(1.38, 526, 526)).regressions, 0, "a slow runner, same code: passes");
        assert.equal(judge(sides(1.38, 526, 526)[0], history).regressions, 1, "what the history judge said");
        assert.equal(judge(...sides(1.38, 526, 526 * 1.5)).regressions, 1, "a slower candidate on it: fails");
        assert.equal(judge(...sides(0.8, 526, 526 * 1.5)).regressions, 1, "and on a fast runner too");
    });
});
