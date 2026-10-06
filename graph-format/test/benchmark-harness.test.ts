import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { appendSession, type BenchResult, benchTimed } from "../benchmarks/harness.js";

// The benchmark harness is shared with graphty-element's benchmarks (graphty-element/benchmarks/run.ts),
// which time asynchronous bodies and write their results into their own package.
describe("benchmark harness", () => {
    it("benchTimed drops the warm-up run and reports the median of the measured runs", async () => {
        const reported = [100, 3, 1, 2];
        let call = 0;
        const result = await benchTimed("sets", "timed", () => Promise.resolve(reported[call++]), 3);
        expect(call).toBe(4);
        expect(result).toMatchObject({ group: "sets", name: "timed", runs: 3, medianMs: 2, minMs: 1, maxMs: 3 });
        expect(result.memoryDeltaBytes).toBe(0);
    });

    it("appendSession writes into the results directory it is given, appending sessions", () => {
        const dir = mkdtempSync(join(tmpdir(), "bench-results-"));
        try {
            const results: BenchResult[] = [
                {
                    group: "g",
                    name: "n",
                    medianMs: 1,
                    minMs: 1,
                    maxMs: 1,
                    runs: 1,
                    memoryDeltaBytes: 0,
                    rate: null,
                    rateUnit: null,
                },
            ];
            const file = appendSession(results, dir);
            expect(appendSession(results, dir)).toBe(file);
            expect(file.startsWith(dir)).toBe(true);
            const sessions = JSON.parse(readFileSync(file, "utf8")) as { results: BenchResult[] }[];
            expect(sessions).toHaveLength(2);
            expect(sessions[1].results).toEqual(results);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
