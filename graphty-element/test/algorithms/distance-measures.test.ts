/**
 * @file Distance measures: eccentricity, diameter, radius and average shortest path length, on a
 * graph whose answer networkx gives.
 *
 * The graph: a path a-b-c-d (networkx: eccentricities 3, 2, 2, 3; diameter 3, radius 2, average
 * 5/3), a triangle e-f-g and a lone node h.
 */

import { assert, describe, it } from "vitest";

import { type Harness, makeSession } from "../session/helpers";
import { builtInRuns } from "../session/sets/algorithms";

const NODES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const EDGES = [
    ["a", "b"],
    ["b", "c"],
    ["c", "d"],
    ["e", "f"],
    ["f", "g"],
    ["e", "g"],
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

describe("distance measures", () => {
    it("gives each node its eccentricity, and the largest piece's diameter, radius and average", async () => {
        const result = await fixture().session.runs.start("distance-measures", {}, { scope: "graph", style: false });

        assert.deepEqual(
            NODES.map((id) => result.node(id)?.value),
            [3, 2, 2, 3, 1, 1, 1, 0],
        );
        assert.strictEqual(result.graph.diameter, 3);
        assert.strictEqual(result.graph.radius, 2);
        assert.closeTo(result.graph.averageShortestPathLength as number, 5 / 3, 1e-12);
        assert.strictEqual(result.graph.componentCount, 3);
        assert.deepEqual(
            result.summary().caveats.facts.map((fact) => [fact.code, fact.params]),
            [
                ["distance-measures.exact", {}],
                ["distance-measures.largest-component", { components: 3, nodes: 4 }],
            ],
        );
    });

    it("searches from k sources only when sampled, and leaves the rest unmeasured", async () => {
        const result = await fixture().session.runs.start(
            "distance-measures",
            { k: 2 },
            { scope: "graph", style: false },
        );

        const measured = NODES.filter((id) => result.node(id)?.value !== undefined);
        assert.lengthOf(measured, 2);
        assert.isFalse(result.summary().caveats.exact);
        assert.deepEqual(result.summary().caveats.facts[0], {
            code: "distance-measures.sampled",
            params: { sources: 2, nodes: 8 },
        });
    });
});
