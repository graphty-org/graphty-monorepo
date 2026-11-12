/**
 * A legend counts, for every layer, the elements it selects among those drawn and what it paints.
 * Each of those reads resolved the whole graph to sets of ids -- one id per node and per edge --
 * and then looked every id up again to get back the index it started from. A Louvain run on the
 * "every airline route on earth" sample (3,214 nodes, 36,906 edges) adds a layer per group, a
 * consumer reads the legend on each `style:changed`, and that round trip held the page for over
 * a minute. Counted, never timed: the id sets built while the legend and the counts are read.
 */

import { assert, describe, it } from "vitest";

import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { resolveCounters } from "../../src/session/sets/resolve";
import { makeSession } from "./helpers";

const SIZE = 60;

/**
 * A run that puts every node of the graph into one of six groups.
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
            nodes: Array.from({ length: SIZE }, (_, at) => ({ id: `n${String(at)}`, values: { group: at % 6 } })),
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "louvain", facts: [], notes: [] },
            durationMs: 1,
        }),
    });
}

describe("a legend over a run's group layers", () => {
    it("is read from the scopes' bitmaps, with no id set built", async () => {
        const harness = makeSession({ runs: { execute: partition } });
        const nodes = Array.from({ length: SIZE }, (_, at) => ({ id: `n${String(at)}` }));
        const edges = nodes.slice(1).map((node, at) => ({ src: `n${String(at)}`, dst: node.id }));
        harness.add(nodes, edges);
        const { session } = harness;

        const run = await session.runs.start("louvain", {}, { style: false });
        await session.styles.encode({ run: run.runId, channel: "node.color" });
        await session.styles.settled();
        const layers = session.styles.list();

        const before = resolveCounters.idSetBuilds;
        const blocks = session.styles.legend();
        for (const layer of layers) {
            session.styles.counts(layer.id);
        }

        assert.isAbove(blocks.length, 0, "the legend has the run's block");
        assert.strictEqual(resolveCounters.idSetBuilds - before, 0, "and reading it spelled no element as an id");
    });
});
