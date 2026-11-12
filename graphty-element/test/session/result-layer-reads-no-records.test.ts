/**
 * A layer over a run's result is checked when it is added, and part of the check is whether
 * every path it reads is one the session can answer. A run moves the input tick the attribute
 * descriptions are cached on, so that check used to describe the attributes again -- a walk of
 * every node and edge record -- just to learn that `results.<run>.group` is a run's field. On the
 * "every airline route on earth" sample (3,214 nodes, 36,906 edges) that walk froze the page for
 * over 200 ms at a 6x CPU throttle. Counted, never timed: the edge records the check reads.
 */

import { assert, describe, it } from "vitest";

import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { makeSession } from "./helpers";

const SIZE = 50;

/**
 * A run that publishes every node of the graph into one of five groups.
 * @param context - The run.
 * @returns Its outcome.
 */
function partition(context: RunExecutionContext): Promise<RunOutcome> {
    return Promise.resolve({
        result: createRunResult({
            runId: context.runId,
            shape: "community",
            fields: [
                {
                    name: "group",
                    plainName: "Group",
                    technicalName: "community",
                    kind: "node",
                    type: "integer",
                    path: `results.${context.runId}.group`,
                },
            ],
            measured: { nodes: SIZE, edges: SIZE - 1 },
            nodes: Array.from({ length: SIZE }, (_, at) => ({ id: `n${String(at)}`, values: { group: at % 5 } })),
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "louvain", facts: [], notes: [] },
            durationMs: 1,
        }),
    });
}

describe("a layer over a run's result", () => {
    it("is checked without reading a single edge record", async () => {
        const harness = makeSession({ runs: { execute: partition } });
        const nodes = Array.from({ length: SIZE }, (_, at) => ({ id: `n${String(at)}`, weight: at }));
        const edges = nodes.slice(1).map((node, at) => ({ src: `n${String(at)}`, dst: node.id, w: at }));
        harness.add(nodes, edges);
        const { session, edgeAttributes } = harness;

        const run = await session.runs.start("louvain", {}, { style: false });

        let reads = 0;
        const get = edgeAttributes.get.bind(edgeAttributes);
        edgeAttributes.get = (index) => {
            reads++;
            return get(index);
        };

        await session.styles.encode({ run: run.runId, channel: "node.color" });
        await session.styles.settled();

        assert.equal(reads, 0, "a node layer over a run's field reads no edge record");
        assert.isAbove(session.data.attributes().length, 0, "the records are still described when asked");
        assert.isAbove(reads, 0, "and describing them does read the edge records");
    });
});
