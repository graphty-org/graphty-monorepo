/**
 * @file `styles.legend()` keeps what it walked while nothing it reads moves (issue #10227): the
 * graphty app reads it on every run and style event, and each read walked every drawn element
 * through each layer's selector.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { drawnCounters } from "../../../src/session/styles/StylesApi";

const NODES = 3000;
/** How many progress reports the run makes: a 10,000-node shortest path makes about this many. */
const REPORTS = 24;

/**
 * A run that reports progress many times, as a chunked algorithm does, then marks every node.
 * @param context - The run being executed.
 * @returns The outcome.
 */
async function marked(context: RunExecutionContext): Promise<RunOutcome> {
    for (let at = 1; at <= REPORTS; at++) {
        await Promise.resolve();
        context.report({ completed: at, total: REPORTS });
    }

    return {
        result: createRunResult({
            runId: context.runId,
            shape: "node-metric",
            fields: [
                {
                    name: "score",
                    plainName: "Score",
                    technicalName: "score",
                    kind: "node",
                    type: "number",
                    path: `results.${context.runId}.score`,
                },
            ],
            measured: { nodes: NODES, edges: 0 },
            nodes: Array.from({ length: NODES }, (_unused, i) => ({ id: `n${String(i)}`, values: { score: i } })),
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "test", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

/**
 * A chain of nodes with two category layers, so the legend counts what each selects.
 * @returns The session.
 */
async function chain(): Promise<GraphSession> {
    const session = createGraphSession({ runs: { execute: marked } });
    await session.config.set({ startingRows: true });
    const nodes = Array.from({ length: NODES }, (_unused, i) => ({ id: `n${String(i)}`, kind: `k${String(i % 4)}` }));
    const edges = Array.from({ length: NODES - 1 }, (_unused, i) => ({
        source: `n${String(i)}`,
        target: `n${String(i + 1)}`,
    }));
    await session.data.import({ type: "json", config: { data: JSON.stringify({ nodes, edges }) } });
    await session.styles.add({
        name: "Kind one",
        target: "node",
        selector: { match: "rule", where: { kind: "categories", attribute: "data.kind", values: ["k1"] } },
        set: { "node.color": "#d55e00" },
    });
    await session.styles.add({
        name: "Kind two",
        target: "node",
        selector: { match: "rule", where: { kind: "categories", attribute: "data.kind", values: ["k2"] } },
        set: { "node.color": "#0072b2" },
    });
    await session.styles.settled();
    return session;
}

describe("styles.legend() keeps its walks", () => {
    it("walks the drawn elements once per layer while nothing moves, and again after a change", async () => {
        const session = await chain();
        const first = session.styles.legend();
        const before = drawnCounters.walks;
        for (let read = 0; read < 10; read++) {
            assert.deepEqual(session.styles.legend(), first, "an unchanged stack answers the same legend");
        }
        assert.strictEqual(drawnCounters.walks - before, 0, "ten more reads walk nothing");

        await session.selection.apply({ ids: ["n1"] });
        session.styles.legend();
        const after = drawnCounters.walks;
        session.styles.legend();
        assert.strictEqual(drawnCounters.walks, after, "the read after a change is kept too");
        session.dispose();
    });

    it("reads the legend fresh after a change that moves a count", async () => {
        const session = await chain();
        const id = session.styles.list().find((layer) => layer.name === "Kind one")?.id;
        const counted = (): number | undefined =>
            session.styles.legend().find((block) => block.layerId === id)?.scope?.count;
        assert.strictEqual(counted(), NODES / 4);
        await session.data.updateNodes([{ id: "n0", values: { kind: "k1" } }]);
        await session.styles.settled();
        assert.strictEqual(counted(), NODES / 4 + 1, "a data change is counted");
        session.dispose();
    });

    it("walks a bounded number of times when a reader reads it on every event of a run", async () => {
        const session = await chain();
        session.styles.legend();
        let events = 0;
        const off = [
            session.on("run:changed", () => {
                events++;
                session.styles.legend();
            }),
            session.on("style:batch-changed", () => {
                events++;
                session.styles.legend();
            }),
        ];
        const before = drawnCounters.walks;
        await session.runs.start("pagerank");
        await session.styles.settled();
        const walks = drawnCounters.walks - before;
        for (const stop of off) {
            stop();
        }
        assert.isAtLeast(events, REPORTS, "every progress report told the reader");
        // Two layers walked once each per moment the stack or the data moved: the run's start, its
        // result and its repaint. Read uncached, every one of the reports walked both layers again.
        assert.isBelow(walks, REPORTS, `${String(walks)} walks for ${String(events)} reads`);
        session.dispose();
    });
});
