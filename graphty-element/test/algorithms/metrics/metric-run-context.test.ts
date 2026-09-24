import { assert, describe, it } from "vitest";

import { BetweennessCentralityAlgorithm } from "../../../src/algorithms/BetweennessCentralityAlgorithm";
import { DegreeAlgorithm } from "../../../src/algorithms/DegreeAlgorithm";
import { detachedRunContext, METRIC_CHUNK_SIZE, walkInChunks } from "../../../src/algorithms/metrics/context";
import type { MetricRunContext } from "../../../src/algorithms/metrics/types";
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

    it("gives the frame back between chunks", async () => {
        const recording = recordingContext();
        const items = Array.from({ length: METRIC_CHUNK_SIZE * 3 }, (unused, index) => index);

        await walkInChunks(items, recording.context, "counting", () => undefined);

        assert.strictEqual(recording.yields, 2, "two yields between three chunks");
        assert.isAtLeast(recording.reports.length, 3);
    });

    it("does not give the frame back when there is nothing left to do", async () => {
        const recording = recordingContext();
        const items = Array.from({ length: METRIC_CHUNK_SIZE }, (unused, index) => index);

        await walkInChunks(items, recording.context, "counting", () => undefined);

        assert.strictEqual(recording.yields, 0);
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
