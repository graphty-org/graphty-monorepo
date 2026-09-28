/**
 * `kCoreDecomposition` (with `getKCore` through it) and `girvanNewman` delegate to their `indexed.*`
 * ports. Each is run through its facade and against the pre-migration implementation, which must
 * agree exactly -- Girvan-Newman's modularity within 1e-9 relative -- including the graphs the
 * facades hand back to the old code.
 */

import { describe, expect, it } from "vitest";

import { girvanNewman } from "../../../src/algorithms/community/girvan-newman.js";
import { getKCore, kCoreDecomposition } from "../../../src/clustering/k-core.js";
import { Graph } from "../../../src/core/graph.js";
import type { GirvanNewmanOptions } from "../../../src/types/index.js";
import { expectFacadeMatchesLegacy, type FacadeFixture } from "../../helpers/facade-differential.js";
import { legacyResult } from "../../helpers/golden.js";
import { numericIdsFromZero } from "./multigraph-fixtures.js";
import { directedFixtures, offGridWeights, undirectedFixtures } from "./port-fixtures.js";

function build(directed: boolean, edges: readonly (readonly [string | number, string | number, number?])[]): Graph {
    const g = new Graph({ directed, allowSelfLoops: true, allowParallelEdges: true });
    for (const [u, v, w] of edges) {
        g.addEdge(u, v, w);
    }
    return g;
}

/** A triangle with a tail, a repeated edge and a self-loop, which the old code counts as a neighbour. */
const loopy = (): Graph =>
    build(false, [
        ["a", "b"],
        ["a", "b"],
        ["b", "c"],
        ["c", "a"],
        ["c", "c"],
        ["c", "d"],
        ["d", "e"],
    ]);

/** The number 1 and the string "1" are two nodes and one result key. */
const spelledAlike = (): Graph =>
    build(false, [
        [1, 2],
        [2, "1"],
        ["1", 3],
        [3, 1],
        [3, 4],
    ]);

/** A NaN weight, which a weighted snapshot cannot hold. */
const nanWeighted = (): Graph =>
    build(false, [
        ["a", "b", NaN],
        ["b", "c"],
        ["c", "a", 2],
        ["c", "d"],
    ]);

/** Negative and zero weights, which only the modularity reads. */
const signedWeights = (): Graph =>
    build(false, [
        ["a", "b", -1],
        ["b", "c", 0],
        ["c", "a", 3],
        ["c", "d", 1],
        ["d", "e", 1],
        ["e", "f", 1],
        ["f", "d", 1],
    ]);

const single = (): Graph => build(false, [["only", "only"]]);

function oneNode(): Graph {
    const g = new Graph({ directed: false });
    g.addNode("only");
    return g;
}

const undirected: FacadeFixture[] = [
    ...undirectedFixtures(),
    { name: "a self-loop and a repeated edge", graph: loopy() },
    { name: "ids spelled alike", graph: spelledAlike() },
    { name: "a NaN weight", graph: nanWeighted() },
    { name: "negative and zero weights", graph: signedWeights() },
    { name: "numeric ids from zero", graph: numericIdsFromZero() },
    { name: "off-grid weights", graph: offGridWeights(undirectedFixtures()[4].graph) },
    { name: "one node", graph: oneNode() },
    { name: "one node with a self-loop", graph: single() },
    { name: "empty", graph: new Graph({ directed: false }) },
];

describe("kCoreDecomposition facade", () => {
    it("returns the old cores, coreness and maxCore, in the old Map and Set order", () => {
        const directed: FacadeFixture[] = [
            ...directedFixtures(),
            {
                name: "directed, a self-loop",
                graph: build(true, [
                    ["a", "b"],
                    ["b", "b"],
                    ["b", "c"],
                    ["c", "a"],
                ]),
            },
        ];
        expectFacadeMatchesLegacy([...undirected, ...directed], kCoreDecomposition);
    });

    it("gives getKCore the old member set for every k", () => {
        for (const k of [-1, 0, 1, 2, 3, 4, 5, 1.5, Infinity]) {
            expectFacadeMatchesLegacy(undirected, (g) => getKCore(g, k));
        }
    });

    it("peels three four-cliques in a chain to coreness 3", () => {
        const chain = undirectedFixtures()[2].graph;
        const r = kCoreDecomposition(chain);
        expect(r.maxCore).toBe(3);
        expect([...r.cores.keys()]).toEqual([3]);
        expect(getKCore(chain, 4).size).toBe(0);
    });
});

describe("girvanNewman facade", () => {
    it("returns the old dendrogram on every fixture", () => {
        expectFacadeMatchesLegacy(undirected, (g) => girvanNewman(g), {
            tolerance: 1e-9,
        });
    });

    it("stops where the old code did for every stopping option", () => {
        const small = undirected.filter((f) => f.graph.nodeCount <= 40);
        const options: GirvanNewmanOptions[] = [
            { maxCommunities: 2 },
            { maxCommunities: 5, minCommunitySize: 3 },
            { maxCommunities: -1 },
            { maxCommunities: 0 },
            { maxCommunities: -1, maxIterations: 0 },
            { minCommunitySize: 4 },
            { minCommunitySize: 100 },
            { maxIterations: 4 },
            { maxIterations: 0 },
            { maxIterations: 2.5 },
            { maxIterations: NaN },
        ];
        for (const option of options) {
            expectFacadeMatchesLegacy(small, (g) => girvanNewman(g, option), { tolerance: 1e-9 });
        }
    });

    it("splits two triangles joined by a bridge at the bridge", () => {
        const g = build(false, [
            ["a", "b"],
            ["b", "c"],
            ["c", "a"],
            ["d", "e"],
            ["e", "f"],
            ["f", "d"],
            ["c", "d"],
        ]);
        const levels = girvanNewman(g, { maxCommunities: 2 });
        expect(levels.map((l) => l.communities)).toEqual([
            [["a", "b", "c", "d", "e", "f"]],
            [
                ["a", "b", "c"],
                ["d", "e", "f"],
            ],
        ]);
        expect(levels[1].modularity).toBeCloseTo(5 / 14, 12);
    });

    it("throws on a directed graph, as the old code did", () => {
        const g = directedFixtures()[0].graph;
        expect(() => legacyResult<CommunityResult[]>()).toThrow("requires an undirected graph");
        expect(() => girvanNewman(g)).toThrow("requires an undirected graph");
    });
});
