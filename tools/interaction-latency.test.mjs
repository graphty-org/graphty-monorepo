// The input latency history's rules (tools/interaction-latency.mjs): cells keyed by their conditions, the newest run
// judged against the run before it on the same tier and machine, a slowdown only when the median and the 95th
// percentile both rose past the factor and one frame, and the 150 and 300 ms bands.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    band,
    cellStatus,
    compareRuns,
    FLOOR_MS,
    lastTwo,
    overBudget,
    THRESHOLD,
    toHistory,
    whereOf,
} from "./interaction-latency.mjs";

const elementRow = (interaction, median, p95) => ({
    surface: "graphty-element",
    path: "objects",
    dim: "3d",
    mode: "default",
    dpr: 1,
    n: 10000,
    interaction,
    median_ms: median,
    p95_ms: p95,
    samples: 3,
    timeouts: 0,
    noVisible: 0,
});
const line = (run, cell, medianMs, p95Ms, extra = {}) => ({
    run,
    commit: "abc1234",
    tier: "quick",
    machine: "cpu",
    cell,
    medianMs,
    p95Ms,
    ...extra,
});

describe("interaction-latency", () => {
    it("keys a cell by its surface and conditions", () => {
        assert.equal(whereOf(elementRow("x", 1, 1)), "element objects 3d default dpr1 10k");
        assert.equal(
            whereOf({ surface: "graphty app", graph: "generated 10k (file)", features: "default", dim: "3d" }),
            "app generated 10k (file) default 3d",
        );
    });

    it("keeps measured cells and drops page failures and wall times", () => {
        const rows = [
            elementRow("hover-node", 20, 30),
            { surface: "graphty-element", failure: "load failed" },
            { surface: "graphty-element", wall: true, wallMs: 60000 },
        ];
        const lines = toHistory(rows, { run: "r1", commit: "abc", tier: "quick" });
        assert.equal(lines.length, 1);
        assert.equal(lines[0].cell, "element objects 3d default dpr1 10k | hover-node");
        assert.equal(lines[0].p95Ms, 30);
        assert.equal(lines[0].commit, "abc");
    });

    it("bands at 150 and 300 ms", () => {
        assert.equal(band(150), "good");
        assert.equal(band(151), "acceptable");
        assert.equal(band(300), "acceptable");
        assert.equal(band(301), "fails");
        assert.equal(band(null), "none");
    });

    it("compares the newest run with the one before it on the same tier and machine", () => {
        const lines = [
            line("r1", "a", 10, 10),
            line("r2", "a", 11, 11, { machine: "other" }),
            line("r3", "a", 12, 12, { tier: "full" }),
            line("r4", "a", 13, 13),
        ];
        const { now, before } = lastTwo(lines, "quick");
        assert.equal(now[0].run, "r4");
        assert.equal(before[0].run, "r1");
        assert.deepEqual(lastTwo([line("r1", "a", 1, 1)], "quick").before, []);
    });

    it("calls a cell slower only when median and p95 both rose past the factor and one frame", () => {
        const before = line("r1", "a", 100, 120);
        assert.equal(cellStatus(line("r2", "a", 130, 150), before), "slower");
        // p95 alone rose: noise in one repetition
        assert.equal(cellStatus(line("r2", "a", 105, 200), before), "ok");
        // past the factor but under a frame
        assert.equal(
            cellStatus(line("r2", "a", 10 * THRESHOLD + 1, 12 * THRESHOLD + 1), line("r1", "a", 10, 12)),
            "ok",
        );
        assert.ok(FLOOR_MS > 16 && FLOOR_MS < 17);
        assert.equal(cellStatus(line("r2", "a", 50, 60), before), "faster");
        assert.equal(cellStatus(line("r2", "a", 50, 60), undefined), "new");
        assert.equal(cellStatus(line("r2", "a", null, null), before), "unmeasured");
    });

    it("lets an accepted slowdown pass only within its ratio", () => {
        const before = line("r1", "a", 100, 120);
        assert.equal(cellStatus(line("r2", "a", 130, 150), before, { ratio: 1.3 }), "accepted");
        assert.equal(cellStatus(line("r2", "a", 300, 400), before, { ratio: 1.3 }), "slower");
    });

    it("counts slowdowns and marks a move into a worse band", () => {
        const { cells, slower } = compareRuns(
            [line("r2", "a", 200, 320), line("r2", "b", 100, 140), line("r2", "c", 10, 10)],
            [line("r1", "a", 100, 120), line("r1", "b", 100, 140)],
        );
        assert.equal(slower, 1);
        const a = cells.find((c) => c.cell === "a");
        assert.equal(a.status, "slower");
        assert.equal(a.crossed, true);
        assert.equal(cells.find((c) => c.cell === "b").crossed, false);
        assert.equal(cells.find((c) => c.cell === "c").status, "new");
    });

    it("lists the cells over 300 ms and between 150 and 300 ms, slowest first", () => {
        const { over300, over150, unmeasured } = overBudget([
            line("r", "a", 1, 400),
            line("r", "b", 1, 200),
            line("r", "c", 1, 350),
            line("r", "d", 1, 20),
            line("r", "e", null, null),
        ]);
        assert.deepEqual(
            over300.map((l) => l.cell),
            ["a", "c"],
        );
        assert.deepEqual(
            over150.map((l) => l.cell),
            ["b"],
        );
        assert.deepEqual(
            unmeasured.map((l) => l.cell),
            ["e"],
        );
    });
});
