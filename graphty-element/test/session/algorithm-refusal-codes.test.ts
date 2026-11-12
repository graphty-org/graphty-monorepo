/**
 * @file Every coded refusal of `@graphty/algorithms` reaches a run's caller with the element's code for it and the
 * run's facts (issue #2335), not as `E_INTERNAL`, "a bug in graphty-element". Each refusal is the real error the
 * algorithms package throws, raised inside a session run.
 */
import {
    bidirectionalDijkstra,
    breadthFirstSearch,
    maximumBipartiteMatching,
    PathCountOverflowError,
    PathWalkError,
    primMST,
    stronglyConnectedComponents,
    teraHAC,
} from "@graphty/algorithms";
import { fromEdgeArrays, GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { createGraphSession, isGraphtyError } from "../../session";

/**
 * A snapshot of `n` nodes and the given edges.
 * @param n - The node count.
 * @param edges - The edges.
 * @param directed - Whether it is directed.
 * @returns The snapshot.
 */
function graph(n: number, edges: readonly (readonly [number, number])[], directed = false): GraphSnapshot {
    return fromEdgeArrays({
        directed,
        nodeCount: n,
        src: Uint32Array.from(edges.map(([u]) => u)),
        dst: Uint32Array.from(edges.map(([, v]) => v)),
    });
}

/**
 * Two nodes joined by an edge of weight -1.
 * @returns The snapshot.
 */
function negative(): GraphSnapshot {
    const b = new GraphBuilder({ directed: false, weighted: true });
    b.addNodes([0, 1]);
    b.addEdge(0, 1, -1);
    return b.freeze();
}

const triangle = graph(3, [
    [0, 1],
    [1, 2],
    [2, 0],
]);

/** What the algorithms package throws, the element code it arrives as, and the original code. */
const cases: readonly (readonly [string, () => unknown, string, string])[] = [
    [
        "bipartite matching on a triangle",
        () => maximumBipartiteMatching(triangle),
        "E_NOT_BIPARTITE",
        "E_NOT_BIPARTITE",
    ],
    ["teraHAC on an empty graph", () => teraHAC(graph(0, [])), "E_EMPTY_GRAPH", "E_EMPTY_GRAPH"],
    ["Prim on a directed graph", () => primMST(graph(2, [[0, 1]], true)), "E_NEEDS_UNDIRECTED", "E_NEEDS_UNDIRECTED"],
    [
        "strong components of an undirected graph",
        () => stronglyConnectedComponents(triangle),
        "E_NEEDS_DIRECTED",
        "E_NEEDS_DIRECTED",
    ],
    ["a search from a node that is not one", () => breadthFirstSearch(triangle, 9), "E_UNKNOWN_ELEMENT", "E_BAD_NODE"],
    [
        "a shortest path over a negative weight",
        () => bidirectionalDijkstra(negative(), 0, 1),
        "E_BAD_WEIGHT",
        "E_BAD_WEIGHT",
    ],
    ["teraHAC asked for no clusters", () => teraHAC(triangle, { numClusters: 0 }), "E_OPTION_RANGE", "E_BAD_OPTION"],
    [
        "a path walk that met a gap",
        () => {
            throw new PathWalkError(0, 2, "gap");
        },
        "E_BAD_PATH",
        "E_BAD_PATH",
    ],
    [
        "path counts that overflowed",
        () => {
            throw new PathCountOverflowError("betweennessCentrality");
        },
        "E_PATH_COUNT_OVERFLOW",
        "E_PATH_COUNT_OVERFLOW",
    ],
];

describe("an algorithm's refusal inside a run", () => {
    for (const [name, refuse, code, sourceCode] of cases) {
        it(`${name} arrives as ${code}`, async () => {
            const session = createGraphSession({
                runs: {
                    execute: async () => {
                        await Promise.resolve();
                        refuse();
                        throw new Error("the algorithm did not refuse");
                    },
                },
            });
            await session.data.addNodes([{ id: "a" }, { id: "b" }]);

            let thrown: unknown;
            try {
                await session.runs.start("degree", undefined, { as: "refused", style: false });
            } catch (error) {
                thrown = error;
            }

            assert.isTrue(isGraphtyError(thrown), "a GraphtyError");
            if (!isGraphtyError(thrown)) {
                return;
            }
            assert.strictEqual(thrown.code, code);
            assert.strictEqual(thrown.source, "run");
            assert.strictEqual(thrown.details.algorithm, "degree");
            assert.strictEqual(thrown.details.runId, "refused");
            if (sourceCode !== code) {
                assert.strictEqual(thrown.details.sourceCode, sourceCode, "the algorithm's own code is kept");
            }
        });
    }
});
