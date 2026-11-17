/**
 * @file Removal impact: what removing nodes or edges would cut off, on a graph whose answer is
 * known, and proof that running it leaves the graph as it was.
 *
 * The graph: a triangle a-b-c, a bridge c-d, a triangle d-e-f, a tail f-g, and a pair h-i.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../src/errors";
import { edgeBetween, type Harness, makeSession } from "../session/helpers";
import { builtInRuns } from "../session/sets/algorithms";

const NODES = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
const EDGES = [
    ["a", "b"],
    ["b", "c"],
    ["a", "c"],
    ["c", "d"],
    ["d", "e"],
    ["e", "f"],
    ["d", "f"],
    ["f", "g"],
    ["h", "i"],
] as const;

/**
 * A session over the graph, running built-in algorithms.
 * @returns The harness.
 */
function fixture(): Harness {
    let harness: Harness | null = null;
    const made = makeSession({ directed: false, runs: { execute: builtInRuns(() => harness as Harness) } });
    harness = made;
    made.add(
        NODES.map((id) => ({ id })),
        EDGES.map(([src, dst]) => ({ src, dst })),
    );
    return made;
}

/**
 * Run removal impact and read its result.
 * @param h - The harness.
 * @param params - What to remove.
 * @returns The graph facts and the cut-off nodes.
 */
async function impact(
    h: Harness,
    params: Record<string, unknown>,
): Promise<{ graph: Record<string, unknown>; cutOff: string[] }> {
    const result = await h.session.runs.start("removal-impact", params, { scope: "graph", style: false });
    const cutOff = NODES.filter((id) => result.node(id)?.in === true);
    return { graph: { ...result.graph }, cutOff };
}

describe("removal impact", () => {
    it("removing the bridge's end cuts the far triangle and its tail off", async () => {
        const { graph, cutOff } = await impact(fixture(), { nodes: ["c"] });

        assert.deepEqual(cutOff, ["a", "b"]);
        assert.deepInclude(graph, {
            componentsBefore: 2,
            componentsAfter: 3,
            largestBefore: 7,
            largestAfter: 4,
            removedNodes: 1,
            removedEdges: 3,
            count: 2,
        });
        assert.closeTo(graph.cutOffShare as number, 2 / 8, 1e-9);
    });

    it("removing the bridge edge splits the piece without removing a node", async () => {
        const h = fixture();
        const { graph, cutOff } = await impact(h, { edges: [edgeBetween(h, "c", "d")] });

        assert.deepEqual(cutOff, ["a", "b", "c"]);
        assert.deepInclude(graph, { componentsBefore: 2, componentsAfter: 3, removedNodes: 0, removedEdges: 1 });
    });

    it("removing a leaf cuts nothing off", async () => {
        const { graph, cutOff } = await impact(fixture(), { nodes: ["g"] });

        assert.deepEqual(cutOff, []);
        assert.deepInclude(graph, { componentsBefore: 2, componentsAfter: 2, cutOffShare: 0 });
    });

    it("refuses an edge the graph does not have", async () => {
        const error: unknown = await impact(fixture(), { edges: ["no-such-edge"] }).then(
            () => null,
            (e: unknown) => e,
        );

        assert.isTrue(isGraphtyError(error) && error.code === "E_OPTION_RANGE", String(error));
    });

    it("leaves the graph unchanged", async () => {
        const h = fixture();
        const nodesBefore = h.session.data.snapshot().nodeCount;
        const edgesBefore = h.session.data.edges().map((edge) => edge.id);

        await impact(h, { nodes: ["c", "d"], edges: [edgeBetween(h, "h", "i")] });

        assert.strictEqual(h.session.data.snapshot().nodeCount, nodesBefore);
        assert.deepEqual(
            h.session.data.edges().map((edge) => edge.id),
            edgesBefore,
        );
    });
});
