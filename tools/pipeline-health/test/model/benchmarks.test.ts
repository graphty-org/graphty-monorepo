import { describe, expect, it } from "vitest";

import { BENCH_KEEP, trend, withPoint, type BenchPoint } from "../../src/model/benchmarks.js";

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

    it("keeps the newest results, one per run", () => {
        let item = withPoint(undefined, "b", "ms", { at: 0, v: 1, run: 1 }, 0);
        for (let i = 1; i <= BENCH_KEEP + 5; i++) item = withPoint(item, "b", "ms", { at: i, v: i, run: i + 1 }, i);
        expect(item.points).toHaveLength(BENCH_KEEP);
        expect(item.points.at(-1)).toEqual({ at: BENCH_KEEP + 5, v: BENCH_KEEP + 5, run: BENCH_KEEP + 6 });
        item = withPoint(item, "b", "ms", { at: 99, v: 7, run: BENCH_KEEP + 6 }, 99);
        expect(item.points.filter((p) => p.run === BENCH_KEEP + 6)).toEqual([{ at: 99, v: 7, run: BENCH_KEEP + 6 }]);
    });
});
