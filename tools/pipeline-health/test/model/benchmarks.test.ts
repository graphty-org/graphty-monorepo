import { describe, expect, it } from "vitest";

import { BENCH_KEEP, BENCH_KEEP_ALL, type BenchPoint, trend, withPoint } from "../../src/model/benchmarks.js";

const pts = (vs: number[]): BenchPoint[] => vs.map((v, i) => ({ at: i, v, run: 100 + i }));

describe("benchmark regressions", () => {
    it("flags the median of the last 3 over 1.2x the median of the 10 before", () => {
        const steady = [40, 41, 42, 41, 43, 40, 41, 42, 41, 40];
        expect(trend(pts([...steady, 52, 53, 51]))).toMatchObject({ recent: 52, before: 41, regressed: true });
        expect(trend(pts([...steady, 48, 49, 47])).regressed).toBe(false); // 48 / 41 = 1.17
    });

    it("never flags one slow run, or fewer than 13 results", () => {
        expect(trend(pts([40, 41, 42, 41, 43, 40, 41, 42, 41, 40, 41, 90, 41])).regressed).toBe(false);
        expect(trend(pts([40, 41, 42, 90, 90, 90]))).toEqual({ regressed: false });
    });

    it("compares results only with results of the newest one's machine", () => {
        // Min-Cut n=50 as GitHub's hosted runners measured it (ms): EPYC 9V45 and 9V74 near 0.17, EPYC 7763 and
        // Xeon 8370C near 0.37, with nothing in the code changed. Across machines it reads as a 2.2x regression.
        const runs: [number, string][] = [
            [0.36, "7763"],
            [0.17, "9V45"],
            [0.17, "9V45"],
            [0.16, "9V45"],
            [0.37, "7763"],
            [0.17, "9V74"],
            [0.16, "9V45"],
            [0.38, "7763"],
            [0.16, "9V45"],
            [0.21, "9V74"],
            [0.36, "7763"],
            [0.39, "8370C"],
            [0.38, "8370C"],
        ];
        const mixed = runs.map(([v, machine], i) => ({ at: i, v, run: 100 + i, machine }));
        expect(trend(mixed.map(({ machine: _, ...p }) => p)).regressed).toBe(true);
        expect(trend(mixed)).toEqual({ regressed: false });
        // a real slowdown on one machine is still found among that machine's results
        const one = pts([40, 41, 42, 41, 43, 40, 41, 42, 41, 40, 52, 53, 51]).map((p) => ({ ...p, machine: "a" }));
        const other = pts(Array.from({ length: 13 }, () => 20)).map((p) => ({ ...p, at: p.at - 0.5, machine: "b" }));
        expect(trend([...other, ...one].sort((a, b) => a.at - b.at))).toMatchObject({
            ratio: 52 / 41,
            regressed: true,
        });
    });

    it("keeps the newest results of each machine", () => {
        let item = withPoint(undefined, "b", "ms", { at: 0, v: 1, run: 1, machine: "a" }, 0);
        for (let i = 1; i <= BENCH_KEEP * 3; i++) {
            item = withPoint(item, "b", "ms", { at: i, v: i, run: i + 1, machine: i % 3 ? "b" : "a" }, i);
        }
        expect(item.points.filter((p) => p.machine === "a")).toHaveLength(BENCH_KEEP);
        expect(item.points.filter((p) => p.machine === "b")).toHaveLength(BENCH_KEEP);
        for (let i = 0; i < BENCH_KEEP_ALL; i++) {
            item = withPoint(item, "b", "ms", { at: 1000 + i, v: i, run: 1000 + i, machine: `m${i}` }, i);
        }
        expect(item.points).toHaveLength(BENCH_KEEP_ALL);
    });

    it("keeps the newest results, one per run", () => {
        let item = withPoint(undefined, "b", "ms", { at: 0, v: 1, run: 1 }, 0);
        for (let i = 1; i <= BENCH_KEEP + 5; i++) {
            item = withPoint(item, "b", "ms", { at: i, v: i, run: i + 1 }, i);
        }
        expect(item.points).toHaveLength(BENCH_KEEP);
        expect(item.points.at(-1)).toEqual({ at: BENCH_KEEP + 5, v: BENCH_KEEP + 5, run: BENCH_KEEP + 6 });
        item = withPoint(item, "b", "ms", { at: 99, v: 7, run: BENCH_KEEP + 6 }, 99);
        expect(item.points.filter((p) => p.run === BENCH_KEEP + 6)).toEqual([{ at: 99, v: 7, run: BENCH_KEEP + 6 }]);
    });
});
