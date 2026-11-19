/**
 * @file Articulation points and bridges on a graph whose answer is known, and the styles they
 * suggest: a mark on their own result only.
 *
 * The graph: a triangle a-b-c, a bridge c-d, a triangle d-e-f, a tail f-g, a pair h-i joined by
 * two parallel edges, and a pair j-k joined by one.
 */

import { assert, describe, it } from "vitest";

import { edgeBetween, type Harness, makeSession } from "../session/helpers";
import { builtInRuns } from "../session/sets/algorithms";

const NODES = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"];
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
    ["h", "i"],
    ["j", "k"],
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

describe("articulation points", () => {
    it("flags the nodes whose removal splits their piece", async () => {
        const h = fixture();
        const result = await h.session.runs.start("articulation-points", {}, { scope: "graph", style: false });

        assert.deepEqual(
            NODES.filter((id) => result.node(id)?.in === true),
            ["c", "d", "f"],
        );
        assert.strictEqual(result.graph.count, 3);
    });
});

describe("bridges", () => {
    it("flags the edges whose removal splits their piece, never a doubled edge", async () => {
        const h = fixture();
        const result = await h.session.runs.start("bridges", {}, { scope: "graph", style: false });

        const flagged = EDGES.filter(([src, dst]) => result.edge(edgeBetween(h, src, dst))?.in === true).map(
            ([src, dst]) => `${src}-${dst}`,
        );
        assert.deepEqual(flagged, ["c-d", "f-g", "j-k"]);
        assert.strictEqual(result.graph.count, 3);
    });
});
