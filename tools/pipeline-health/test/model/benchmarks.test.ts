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

    it("never flags a change of one timer tick", () => {
        // layout-exact ms/iteration (profiler) n=1024 on the T4 lane: the GPU profiler reads in 65.536 us ticks, so
        // every result is 2 or 3 ticks and a one-tick step reads as 1.5x.
        const tick = 0.065536;
        const oneTick = trend(pts([2, 3, 2, 2, 3, 2, 2, 3, 2, 2, 3, 3, 3].map((n) => n * tick)));
        expect(oneTick.ratio).toBeCloseTo(1.5);
        expect(oneTick.regressed).toBe(false);
        // two ticks above is a real change
        const twoTicks = [2, 2, 3, 2, 2, 3, 2, 2, 2, 2, 4, 4, 4].map((n) => n * tick);
        expect(trend(pts(twoTicks)).regressed).toBe(true);
        // a clean step between two levels is judged by the earlier results' resolution, never by the step itself
        const step = [...Array.from({ length: 10 }, () => 2), 6, 6, 6].map((n) => n * tick);
        expect(trend(pts(step))).toMatchObject({ ratio: 3, regressed: true });
        expect(trend(pts([...Array.from({ length: 10 }, () => 100), 300, 300, 300])).regressed).toBe(true);
        // one earlier outlier is not a tick, so it never hides a later step to its level
        expect(trend(pts([...Array.from({ length: 9 }, () => 100), 300, 300, 300, 300])).regressed).toBe(true);
        expect(trend(pts([...Array.from({ length: 9 }, () => 2), 6, 6, 6, 6].map((n) => n * tick))).regressed).toBe(
            true,
        );
    });

    it("never flags a rise inside the scatter the series shows with no code change", () => {
        // algorithms MCL n=10 as the dashboard held it on 2026-11-07 (ms, #6220): the same code moved between 0.085
        // and 0.148, and its newest 3 read 1.33x the earlier median, a rise under 3 median absolute deviations.
        const mcl10 = [0.094, 0.111, 0.09, 0.085, 0.127, 0.119, 0.125, 0.099, 0.086, 0.134];
        const subMs = trend(pts([...mcl10, 0.148, 0.13, 0.14]));
        expect(subMs.ratio).toBeCloseTo(1.33, 2);
        expect(subMs.regressed).toBe(false);
        // a step clear of that scatter still counts
        expect(trend(pts([...mcl10, 0.2, 0.21, 0.19])).regressed).toBe(true);
        // and so does a 1.22x step of a steady sub-millisecond series: algorithms MCL n=15 on the same day, when its
        // benchmark graph changed from a random one to a fixed seeded one
        const mcl15 = [0.195, 0.189, 0.178, 0.196, 0.192, 0.186, 0.223, 0.204, 0.182, 0.23, 0.244, 0.221, 0.237];
        expect(trend(pts(mcl15)).regressed).toBe(true);
    });

    it("still flags a real 1.3x slowdown of a large benchmark", () => {
        // Leiden n=500 near 25 ms, scattering a few percent, then 1.3x slower
        const steady = [25.1, 24.6, 25.4, 24.9, 25.8, 24.4, 25.2, 25.0, 24.7, 25.5];
        expect(trend(pts([...steady, 32.6, 32.9, 32.3]))).toMatchObject({ regressed: true });
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

    it("compares results only with results of the newest one's input", () => {
        // Leiden n=20 on the dashboard (issue #6220): random graphs near 0.40 ms until the benchmark graph was seeded,
        // then the fixed seed-1 graph, a heavier graph near 0.50 ms, with no code change. A new input is a new series.
        const all = pts([0.4, 0.39, 0.41, 0.38, 0.42, 0.4, 0.37, 0.41, 0.39, 0.4, 0.5, 0.49, 0.51]);
        expect(trend(all).regressed).toBe(true);
        expect(trend(all.map((p, i) => (i < 10 ? p : { ...p, input: "seed1" }))).regressed).toBe(false);
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
