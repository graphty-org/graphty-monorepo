/**
 * @file What `styles.proposeEncoding` answers for a number on a channel that takes one of a list
 * (a line pattern, a node shape, an arrow) and on a channel whose bounds exclude the unit interval
 * (a pattern count of at least 2): the same answer for a run's field and a data column, stepped
 * through an ordered set, and a default range the channel draws.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import type { ElementSession } from "../../src/session/types";

const NODES = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
/** A chain of eight edges, each with a distinct load. */
const EDGES = NODES.slice(1).map((target, at) => ({ source: NODES[at], target, load: at + 1 }));

/**
 * A session over the chain whose edge betweenness publishes each edge's load.
 * @returns The session.
 */
async function chain(): Promise<GraphSession> {
    const execute = async (context: RunExecutionContext): Promise<RunOutcome> => {
        await Promise.resolve();
        const edges = session.data.edges();
        return {
            result: createRunResult({
                runId: context.runId,
                shape: "edge-metric",
                fields: [
                    {
                        name: "value",
                        plainName: "Value",
                        technicalName: "value",
                        kind: "edge",
                        type: "number",
                        path: `results.${context.runId}.value`,
                    },
                ],
                measured: { nodes: NODES.length, edges: edges.length },
                edges: edges.map((edge, at) => ({ id: edge.id, values: { value: at + 1 } })),
                caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "x", facts: [], notes: [] },
                durationMs: 1,
            }),
        };
    };
    const session = createGraphSession({ runs: { execute } });
    await session.data.addNodes(NODES.map((id) => ({ id })));
    await session.data.addEdges(EDGES);

    return session;
}

/**
 * A proposal's binding without the path it reads, which is the one part a run and a column differ in.
 * @param proposal - The proposal.
 * @returns The binding without `by`, or the refusal code.
 */
function shapeOf(proposal: ReturnType<GraphSession["styles"]["proposeEncoding"]>): unknown {
    if (!proposal.ok) {
        return proposal.refusal.code;
    }

    const { by: _by, ...rest } = proposal.binding;
    return rest;
}

describe("a number on a channel that takes one of a list", () => {
    it("is stepped through an ordered set, the same for a run and a column", async () => {
        const session = await chain();
        const run = await session.runs.start("edge-betweenness", {}, { style: false });
        const column = { kind: "edge", name: "load" } as const;

        const fromColumn = session.styles.proposeEncoding({ column, channel: "edge.style" });
        const fromRun = session.styles.proposeEncoding({ run: run.runId, channel: "edge.style" });
        assert.deepStrictEqual(shapeOf(fromColumn), {
            scale: "quantile",
            bins: 4,
            choices: ["dot", "dash-dot", "dash", "solid"],
        });
        assert.deepStrictEqual(shapeOf(fromRun), shapeOf(fromColumn), "one answer for runs and columns");
        session.dispose();
    });

    it("paints each edge with the step its load falls in, lightest first", async () => {
        const session = await chain();
        const proposal = session.styles.proposeEncoding({
            column: { kind: "edge", name: "load" },
            channel: "edge.style",
        });
        assert.isTrue(proposal.ok);
        await session.styles.encode({ column: { kind: "edge", name: "load" }, channel: "edge.style" });
        await session.styles.settled();

        const element = session as ElementSession;
        const drawn = EDGES.map((_, index) => element.paint.styleOf("edge", index)["edge.style"]);
        assert.deepStrictEqual(drawn, ["dot", "dot", "dash-dot", "dash-dot", "dash", "dash", "solid", "solid"]);
        session.dispose();
    });
});

describe("a number on a channel whose bounds exclude the unit interval", () => {
    it("gets a default range the channel draws, the same for a run and a column", async () => {
        const session = await chain();
        const run = await session.runs.start("edge-betweenness", {}, { style: false });

        const fromColumn = session.styles.proposeEncoding({
            column: { kind: "edge", name: "load" },
            channel: "edge.patternCount",
        });
        const fromRun = session.styles.proposeEncoding({ run: run.runId, channel: "edge.patternCount" });
        assert.deepInclude(fromColumn.ok ? fromColumn.binding : {}, { scale: "linear", range: [2, 3] });
        assert.deepStrictEqual(shapeOf(fromRun), shapeOf(fromColumn));

        // Opacity's bounds hold the unit interval, so its default stays the element's own 0 to 1.
        const opacity = session.styles.proposeEncoding({
            column: { kind: "edge", name: "load" },
            channel: "edge.opacity",
        });
        assert.notProperty(opacity.ok ? opacity.binding : {}, "range");
        session.dispose();
    });
});
