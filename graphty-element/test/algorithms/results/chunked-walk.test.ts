import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { type AlgorithmRunContext, forEachChunked, YIELD_BUDGET_MS } from "../../../src/algorithms/results/types";
import type { RunProgressReport } from "../../../src/session/runs";

/** A context that counts how often the frame was given back. */
interface Recording {
    context: AlgorithmRunContext;
    reports: RunProgressReport[];
    yields: number;
}

/**
 * Build a context that records progress and counts yields.
 * @returns The context and what it recorded.
 */
function recordingContext(): Recording {
    const reports: RunProgressReport[] = [];
    const recording: Recording = {
        reports,
        yields: 0,
        context: {
            signal: new AbortController().signal,
            report: (progress: RunProgressReport): void => {
                reports.push(progress);
            },
            yieldNow: async (): Promise<void> => {
                recording.yields++;
                await Promise.resolve();
            },
        },
    };

    return recording;
}

/* The yield is priced in TIME, not in elements (issue #389): giving the frame back costs the host
   a whole frame, so a pass that finishes inside a frame's budget must never pay for one. The clock
   is faked so the test states how much work each step cost rather than measuring it. */
describe("forEachChunked", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["performance"] });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("never gives the frame back when the whole pass costs less than a frame", async () => {
        const recording = recordingContext();
        const items = Array.from({ length: 10_000 }, (unused, index) => index);
        const seen: number[] = [];

        // Ten thousand steps that cost nothing between them: every element is walked and reported,
        // and the frame is never handed back, because there is nothing to hand it back for.
        await forEachChunked(recording.context, "marking", items, (item) => {
            seen.push(item);
        });

        assert.strictEqual(seen.length, items.length);
        assert.strictEqual(recording.yields, 0, "no yield inside one frame's budget");
        assert.isAtLeast(recording.reports.length, 3, "progress is still reported between chunks");
        assert.deepStrictEqual(recording.reports.at(-1), { phase: "marking", completed: 10_000, total: 10_000 });
    });

    it("gives the frame back once a frame's worth of work has built up", async () => {
        const recording = recordingContext();
        const items = Array.from({ length: 4096 }, (unused, index) => index);

        // Each chunk of 1,024 steps costs exactly half a budget (charged on its last item, so the
        // fake clock moves by whole milliseconds), so the frame is due at every second chunk
        // boundary: after chunks 2 and 4 -- but the fourth boundary is the end of the list, where
        // nothing is left to yield for.
        await forEachChunked(recording.context, "marking", items, (unused, index) => {
            if ((index + 1) % 1024 === 0) {
                vi.advanceTimersByTime(YIELD_BUDGET_MS / 2);
            }
        });

        assert.strictEqual(recording.yields, 1);
    });

    it("counts the work since the last yield, not since the start", async () => {
        const recording = recordingContext();
        const items = Array.from({ length: 1024 * 6 }, (unused, index) => index);

        // Every chunk costs a whole budget, so every boundary with work still ahead yields.
        await forEachChunked(recording.context, "marking", items, (unused, index) => {
            if ((index + 1) % 1024 === 0) {
                vi.advanceTimersByTime(YIELD_BUDGET_MS);
            }
        });

        assert.strictEqual(recording.yields, 5);
    });
});
