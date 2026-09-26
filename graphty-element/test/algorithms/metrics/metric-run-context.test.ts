import { assert, describe, it, vi } from "vitest";

import { BetweennessCentralityAlgorithm } from "../../../src/algorithms/BetweennessCentralityAlgorithm";
import { DegreeAlgorithm } from "../../../src/algorithms/DegreeAlgorithm";
import { detachedRunContext, METRIC_CHUNK_SIZE, walkInChunks } from "../../../src/algorithms/metrics/context";
import type { MetricRunContext } from "../../../src/algorithms/metrics/types";
import { YIELD_BUDGET_MS } from "../../../src/algorithms/results/types";
import type { RunProgressReport } from "../../../src/session/runs";
import { createMockGraph } from "../../helpers/mockGraph";

/** A context that remembers everything a measurement told it. */
interface Recording {
    context: MetricRunContext;
    reports: RunProgressReport[];
    yields: number;
}

/**
 * Build a context that records progress and counts how often the frame was given back.
 * @param signal - The signal the measurement should watch, defaulting to one never aborted.
 * @returns The context and what it recorded.
 */
function recordingContext(signal?: AbortSignal): Recording {
    const reports: RunProgressReport[] = [];
    const recording: Recording = {
        reports,
        yields: 0,
        context: {
            runId: "test",
            signal: signal ?? new AbortController().signal,
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

describe("walkInChunks", () => {
    it("visits every item in order", async () => {
        const recording = recordingContext();
        const seen: number[] = [];

        await walkInChunks([1, 2, 3], recording.context, "counting", (item) => {
            seen.push(item);
        });

        assert.deepStrictEqual(seen, [1, 2, 3]);
    });

    it("reports where it got to when it finishes", async () => {
        const recording = recordingContext();

        await walkInChunks(["a", "b"], recording.context, "counting", () => undefined);

        const last = recording.reports.at(-1);
        assert.isDefined(last);
        assert.strictEqual(last.phase, "counting");
        assert.strictEqual(last.completed, 2);
        assert.strictEqual(last.total, 2);
    });

    /* The two yield tests fake the clock: the yield is priced in TIME, not in chunks (issue
       #389), because giving the frame back costs the host a whole frame, and a chunk that cost
       microseconds used to be charged one anyway. */
    it("gives the frame back between chunks once a frame's worth of work has built up", async () => {
        vi.useFakeTimers({ toFake: ["performance"] });
        try {
            const recording = recordingContext();
            const items = Array.from({ length: METRIC_CHUNK_SIZE * 3 }, (unused, index) => index);

            // Every chunk costs a whole budget (charged on its last item, so the fake clock moves
            // by whole milliseconds), so both boundaries with work still ahead yield.
            await walkInChunks(items, recording.context, "counting", (unused, index) => {
                if ((index + 1) % METRIC_CHUNK_SIZE === 0) {
                    vi.advanceTimersByTime(YIELD_BUDGET_MS);
                }
            });

            assert.strictEqual(recording.yields, 2, "two yields between three chunks");
            assert.isAtLeast(recording.reports.length, 3);
        } finally {
            vi.useRealTimers();
        }
    });

    it("does not give the frame back when the chunks cost less than a frame", async () => {
        vi.useFakeTimers({ toFake: ["performance"] });
        try {
            const recording = recordingContext();
            const items = Array.from({ length: METRIC_CHUNK_SIZE * 3 }, (unused, index) => index);

            await walkInChunks(items, recording.context, "counting", () => undefined);

            assert.strictEqual(recording.yields, 0);
            assert.isAtLeast(recording.reports.length, 3, "progress is still reported between chunks");
        } finally {
            vi.useRealTimers();
        }
    });

    it("does not give the frame back when there is nothing left to do", async () => {
        vi.useFakeTimers({ toFake: ["performance"] });
        try {
            const recording = recordingContext();
            const items = Array.from({ length: METRIC_CHUNK_SIZE }, (unused, index) => index);

            // The one chunk costs a whole budget, so the only thing keeping the frame is that the
            // chunk boundary is the end of the list.
            await walkInChunks(items, recording.context, "counting", (unused, index) => {
                if (index + 1 === METRIC_CHUNK_SIZE) {
                    vi.advanceTimersByTime(YIELD_BUDGET_MS);
                }
            });

            assert.strictEqual(recording.yields, 0);
        } finally {
            vi.useRealTimers();
        }
    });

    it("stops when the run is cancelled", async () => {
        const controller = new AbortController();
        const recording = recordingContext(controller.signal);
        const seen: number[] = [];

        controller.abort();

        let thrown: unknown;
        try {
            await walkInChunks([1, 2, 3], recording.context, "counting", (item) => {
                seen.push(item);
            });
        } catch (error) {
            thrown = error;
        }

        assert.instanceOf(thrown, Error);
        assert.strictEqual(thrown.name, "AbortError");
        assert.deepStrictEqual(seen, []);
    });
});

describe("detachedRunContext", () => {
    it("names the run and never aborts it", () => {
        const context = detachedRunContext("degree");

        assert.strictEqual(context.runId, "degree");
        assert.isFalse(context.signal.aborted);
    });

    it("gives the frame back for real", async () => {
        await detachedRunContext("degree").yieldNow();
    });
});

describe("a metric run through a run context", () => {
    it("publishes under the run id the context names", async () => {
        const graph = await createMockGraph({ dataPath: "./data4.json" });
        const recording = recordingContext();
        const algorithm = new DegreeAlgorithm(graph);

        const result = await algorithm.measureRun({ ...recording.context, runId: "connections-2" });

        assert.isDefined(result);
        assert.strictEqual(result.runId, "connections-2");
        assert.strictEqual(result.fields[0].path, "results.$.value");
    });

    it("reports what it is doing", async () => {
        const graph = await createMockGraph({ dataPath: "./data4.json" });
        const recording = recordingContext();

        await new BetweennessCentralityAlgorithm(graph).measureRun(recording.context);

        const phases = recording.reports.map((report) => report.phase);
        assert.include(phases, "tracing shortest paths");
        assert.include(phases, "reading scores");
    });

    it("refuses to start once the run has been cancelled", async () => {
        const graph = await createMockGraph({ dataPath: "./data4.json" });
        const controller = new AbortController();
        const recording = recordingContext(controller.signal);
        const algorithm = new DegreeAlgorithm(graph);

        controller.abort();

        let thrown: unknown;
        try {
            await algorithm.measureRun(recording.context);
        } catch (error) {
            thrown = error;
        }

        assert.instanceOf(thrown, Error);
        assert.strictEqual(thrown.name, "AbortError");
        assert.isUndefined(algorithm.result);
    });
});
