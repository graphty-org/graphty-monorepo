/**
 * The legacy centrality functions delegate to their `indexed.*` ports. Each is run THROUGH its
 * facade and compared with the legacy implementation it replaced (kept as `legacy*` for this
 * comparison and for the inputs the port does not reproduce): same keys in the same order, same
 * scores to 1e-9 relative, same iteration counts and flags, same errors.
 */

import { describe, expect, it } from "vitest";

import {
    betweennessCentrality,
    edgeBetweennessCentrality,
    nodeBetweennessCentrality,
} from "../../../src/algorithms/centrality/betweenness.js";
import {
    closenessCentrality,
    nodeClosenessCentrality,
    nodeWeightedClosenessCentrality,
    weightedClosenessCentrality,
} from "../../../src/algorithms/centrality/closeness.js";
import { degreeCentrality } from "../../../src/algorithms/centrality/degree.js";
import { eigenvectorCentrality, nodeEigenvectorCentrality } from "../../../src/algorithms/centrality/eigenvector.js";
import { hits, nodeHITS } from "../../../src/algorithms/centrality/hits.js";
import { katzCentrality, nodeKatzCentrality } from "../../../src/algorithms/centrality/katz.js";
import {
    pageRank,
    pageRankCentrality,
    personalizedPageRank,
    topPageRankNodes,
} from "../../../src/algorithms/centrality/pagerank.js";
import { Graph } from "../../../src/core/graph.js";
import type { NodeId } from "../../../src/types/index.js";
import { expectFacadeMatchesLegacy, type FacadeFixture } from "../../helpers/facade-differential.js";
import { legacyResult } from "../../helpers/golden.js";
import { numericIdsFromZero } from "./multigraph-fixtures.js";
import { directedFixtures, gnm, offGridWeights, undirectedFixtures } from "./port-fixtures.js";

const F64 = { tolerance: 1e-9 };

/** Self-loops, weights f32 cannot hold, a dangling and an isolated node. */
function selfLoops(directed: boolean): Graph {
    const g = new Graph({ directed });
    g.addEdge("a", "a", 0.1);
    g.addEdge("a", "b", 0.7);
    g.addEdge("b", "c", 1 / 3);
    g.addEdge("c", "a", 2.2);
    g.addEdge("c", "c", 0.3);
    g.addEdge("c", "d", 1.1);
    g.addNode("e");
    return g;
}

/** Numeric ids from 0 on a directed graph with a cycle and a dangling node. */
function numericDirected(): Graph {
    const g = new Graph({ directed: true });
    for (const [u, v] of [
        [0, 1],
        [1, 2],
        [2, 0],
        [2, 3],
        [3, 4],
        [4, 2],
        [1, 5],
    ]) {
        g.addEdge(u, v);
    }
    return g;
}

/** A node whose only out-edges weigh 0: weighted, it has arcs but passes nothing on. */
function zeroWeightArcs(): Graph {
    const g = new Graph({ directed: true });
    g.addEdge("a", "b", 1);
    g.addEdge("a", "c", 2);
    g.addEdge("b", "c", 0);
    g.addEdge("b", "d", 0);
    g.addEdge("c", "a", 1);
    g.addEdge("d", "a", 3);
    return g;
}

/** An undirected graph with a negative edge, where a search's settle order decides the distances. */
function negativeEdge(): Graph {
    const g = new Graph({ directed: false });
    g.addEdge("a", "b", 2);
    g.addEdge("a", "c", 1);
    g.addEdge("b", "c", -3);
    g.addEdge("c", "d", 1);
    return g;
}

/**
 * A negative edge between two nodes the search from s reaches at equal distance: which of a and b
 * leaves the queue first decides every distance after it, and the port breaks that tie the other way.
 */
function negativeTie(): Graph {
    const g = new Graph({ directed: false });
    for (const id of ["s", "b", "a", "c", "d"]) {
        g.addNode(id);
    }
    g.addEdge("s", "a", 1);
    g.addEdge("s", "b", 1);
    g.addEdge("a", "b", -5);
    g.addEdge("a", "c", 10);
    g.addEdge("b", "c", 30);
    g.addEdge("c", "d", 7);
    return g;
}

function single(directed: boolean): Graph {
    const g = new Graph({ directed });
    g.addNode("only");
    return g;
}

const directed: FacadeFixture[] = [
    ...directedFixtures(),
    ...directedFixtures().map(({ name, graph }) => ({
        name: `${name}, off-grid weights`,
        graph: offGridWeights(graph),
    })),
    { name: "directed self-loops", graph: selfLoops(true) },
    { name: "directed numeric ids", graph: numericDirected() },
    { name: "zero-weight out-arcs", graph: zeroWeightArcs() },
    { name: "random directed 150 nodes, 700 edges", graph: gnm(150, 700, true, 97531) },
    { name: "directed single node", graph: single(true) },
    { name: "directed empty", graph: new Graph({ directed: true }) },
];

const undirected: FacadeFixture[] = [
    ...undirectedFixtures(),
    ...undirectedFixtures().map(({ name, graph }) => ({
        name: `${name}, off-grid weights`,
        graph: offGridWeights(graph),
    })),
    { name: "undirected self-loops", graph: selfLoops(false) },
    { name: "numeric ids from 0", graph: numericIdsFromZero() },
    { name: "undirected single node", graph: single(false) },
    { name: "undirected empty", graph: new Graph({ directed: false }) },
];

const all = [...directed, ...undirected];

const ids = (g: Graph): NodeId[] => Array.from(g.nodes(), (n) => n.id);

/** The result, or the error's class and message, so a facade must throw what legacy throws. */
function outcome<R>(run: () => R): R | { error: string } {
    try {
        return run();
    } catch (error) {
        return { error: `${(error as Error).name}: ${(error as Error).message}` };
    }
}

/** The first three nodes weighted 1, 2, 3. */
function firstThree(g: Graph): Map<NodeId, number> {
    return new Map(
        ids(g)
            .slice(0, 3)
            .map((id, i) => [id, i + 1]),
    );
}

describe("pageRank facade", () => {
    const optionSets: { name: string; options: (g: Graph) => Parameters<typeof pageRank>[1] }[] = [
        { name: "defaults", options: () => ({}) },
        { name: "useDelta false", options: () => ({ useDelta: false }) },
        { name: "useDelta true", options: () => ({ useDelta: true }) },
        { name: "three iterations", options: () => ({ maxIterations: 3 }) },
        { name: "weighted", options: () => ({ weight: "weight" }) },
        { name: "damping 0.6, tolerance 1e-10", options: () => ({ dampingFactor: 0.6, tolerance: 1e-10 }) },
        { name: "initial ranks", options: (g) => ({ initialRanks: firstThree(g) }) },
        { name: "personalization", options: (g) => ({ personalization: firstThree(g), weight: "weight" }) },
        {
            name: "personalization with an id the graph lacks",
            options: (g) => ({ personalization: new Map([...firstThree(g), ["no such node", 5]]) }),
        },
        {
            name: "all-zero personalization",
            options: (g) => ({ personalization: new Map(ids(g).map((id) => [id, 0])) }),
        },
    ];

    for (const { name, options } of optionSets) {
        it(`equals legacy: ${name}`, () => {
            expectFacadeMatchesLegacy(directed, (g) => pageRank(g, options(g)), F64);
        });
    }

    it("throws what legacy throws on an undirected graph and a bad damping factor", () => {
        expectFacadeMatchesLegacy(
            [...undirected, ...directed],
            (g) => [outcome(() => pageRank(g)), outcome(() => pageRank(g, { dampingFactor: 1.5 }))],
            F64,
        );
    });

    it("weighted, reads the exact weights: f32 holds these as 0, which would leave a dangling", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 1e-50);
        g.addEdge("a", "c", 3e-50);
        g.addEdge("b", "c", 1);
        g.addEdge("c", "a", 1);
        expectFacadeMatchesLegacy(
            [{ name: "sub-f32 weights", graph: g }],
            (graph) => pageRank(graph, { weight: "weight" }),
            F64,
        );
    });

    it("pageRankCentrality returns legacy's ranks", () => {
        expectFacadeMatchesLegacy(directed, pageRankCentrality, F64);
    });

    it("topPageRankNodes returns legacy's top three, ids as strings", () => {
        expectFacadeMatchesLegacy(directed, (g) => topPageRankNodes(g, 3), F64);
    });

    it("personalizedPageRank equals legacy pageRank with the equal-share vector it builds", () => {
        const withNodes = directed.filter((f) => f.graph.nodeCount > 0);
        expectFacadeMatchesLegacy(
            withNodes,
            (g) => personalizedPageRank(g, [ids(g)[0], ids(g)[ids(g).length - 1]], { dampingFactor: 0.7 }),
            F64,
        );
        expectFacadeMatchesLegacy(withNodes, (g) => personalizedPageRank(g, []), F64);
        expect(() => personalizedPageRank(withNodes[0].graph, ["no such node"])).toThrow(
            "Personal node no such node not found in graph",
        );
    });
});

describe("hits facade", () => {
    for (const options of [{}, { maxIterations: 4 }, { normalized: false }, { tolerance: 1e-10 }]) {
        it(`equals legacy with ${JSON.stringify(options)}, and nodeHITS per node`, () => {
            expectFacadeMatchesLegacy(
                all,
                (g) => [hits(g, options), ids(g).map((id) => ({ hub: nodeHITS(g, id, options).hub }))],
                F64,
            );
        });
    }
});

describe("katzCentrality facade", () => {
    for (const options of [
        {},
        { normalized: false },
        { alpha: 0.05, beta: 2 },
        { maxIterations: 3 },
        { beta: -1 },
        { alpha: -0.1, normalized: true },
    ]) {
        it(`equals legacy with ${JSON.stringify(options)}, and nodeKatzCentrality per node`, () => {
            expectFacadeMatchesLegacy(
                all,
                (g) => [katzCentrality(g, options), ids(g).map((id) => nodeKatzCentrality(g, id, options))],
                F64,
            );
        });
    }
});

describe("eigenvectorCentrality facade", () => {
    const optionSets: { name: string; options: (g: Graph) => Parameters<typeof eigenvectorCentrality>[1] }[] = [
        { name: "defaults", options: () => ({}) },
        { name: "not normalized", options: () => ({ normalized: false }) },
        { name: "mode out", options: () => ({ mode: "out" }) },
        { name: "mode total", options: () => ({ mode: "total" }) },
        { name: "five iterations", options: () => ({ maxIterations: 5 }) },
        {
            name: "a start vector keyed by string id",
            options: (g) => ({
                startVector: new Map(ids(g).map((id, i) => [String(id), (i % 3) + 1])),
                maxIterations: 1000,
            }),
        },
        {
            name: "a start vector naming only the first node, the rest filled with 1",
            options: (g) => ({
                startVector: new Map(
                    ids(g)
                        .slice(0, 1)
                        .map((id) => [String(id), 7]),
                ),
            }),
        },
    ];
    for (const { name, options } of optionSets) {
        it(`equals legacy, errors included: ${name}`, () => {
            expectFacadeMatchesLegacy(
                all,
                (g) => [
                    outcome(() => eigenvectorCentrality(g, options(g))),
                    ids(g).map((id) => outcome(() => nodeEigenvectorCentrality(g, id, options(g)))),
                ],
                F64,
            );
        });
    }
});

describe("degreeCentrality facade", () => {
    for (const options of [
        {},
        { normalized: true },
        { mode: "in" as const },
        { mode: "out" as const, normalized: true },
        { mode: "total" as const },
    ]) {
        it(`equals legacy with ${JSON.stringify(options)}`, () => {
            expectFacadeMatchesLegacy(all, (g) => degreeCentrality(g, options));
        });
    }
});

describe("closeness facades", () => {
    const fixtures = [
        ...all,
        { name: "a negative edge", graph: negativeEdge() },
        { name: "a negative edge between tied nodes", graph: negativeTie() },
    ];

    for (const options of [
        {},
        { normalized: true },
        { harmonic: true },
        { harmonic: true, normalized: true },
        { cutoff: 2 },
        { cutoff: 1.5, harmonic: true },
        { cutoff: 1, normalized: true },
    ]) {
        it(`closenessCentrality and nodeClosenessCentrality equal legacy with ${JSON.stringify(options)}`, () => {
            expectFacadeMatchesLegacy(
                fixtures,
                (g) => [closenessCentrality(g, options), ids(g).map((id) => nodeClosenessCentrality(g, id, options))],
                F64,
            );
        });

        it(`the weighted closeness functions equal legacy with ${JSON.stringify(options)}`, () => {
            expectFacadeMatchesLegacy(
                fixtures,
                (g) => [
                    weightedClosenessCentrality(g, options),
                    ids(g).map((id) => nodeWeightedClosenessCentrality(g, id, options)),
                ],
                F64,
            );
        });
    }

    it("throws legacy's message for a node the graph lacks", () => {
        const g = selfLoops(false);
        expect(() => nodeClosenessCentrality(g, "zz")).toThrow("Node zz not found in graph");
        expect(() => nodeWeightedClosenessCentrality(g, "zz")).toThrow("Node zz not found in graph");
    });
});

describe("betweenness facades", () => {
    for (const options of [{}, { normalized: true }, { endpoints: true }, { optimized: true }]) {
        it(`betweennessCentrality and nodeBetweennessCentrality equal legacy with ${JSON.stringify(options)}`, () => {
            expectFacadeMatchesLegacy(
                all,
                (g) => [
                    betweennessCentrality(g, options),
                    ids(g).map((id) => nodeBetweennessCentrality(g, id, options)),
                ],
                F64,
            );
        });

        it(`edgeBetweennessCentrality equals legacy with ${JSON.stringify(options)}`, () => {
            expectFacadeMatchesLegacy(all, (g) => edgeBetweennessCentrality(g, options), F64);
        });
    }

    it("still refuses the index-space options", () => {
        const g = selfLoops(true);
        for (const run of [
            () => betweennessCentrality(g, { k: 2 }),
            () => nodeBetweennessCentrality(g, "a", { sources: [0] }),
            () => edgeBetweennessCentrality(g, { k: 1 }),
        ]) {
            expect(run).toThrow(/meaningful only against a GraphSnapshot/);
        }
    });
});

/**
 * Graphs a snapshot cannot stand for, which every facade hands to its legacy code: a NaN weight
 * (the snapshot builder rejects it) and two ids with one spelling (1 and "1" share a result key).
 */
describe("graphs the facades leave to legacy code", () => {
    function nanWeight(directed: boolean): Graph {
        const g = new Graph({ directed });
        g.addEdge("a", "b", Number.NaN);
        g.addEdge("b", "c", 2);
        g.addEdge("c", "a", 1);
        g.addEdge("c", "d", 0.5);
        return g;
    }
    function sharedSpelling(directed: boolean): Graph {
        const g = new Graph({ directed });
        g.addEdge(1, "1");
        g.addEdge("1", 2);
        g.addEdge(2, 1);
        g.addEdge(2, "x");
        return g;
    }
    const fixtures: FacadeFixture[] = [
        { name: "directed NaN weight", graph: nanWeight(true) },
        { name: "undirected NaN weight", graph: nanWeight(false) },
        { name: 'directed 1 and "1"', graph: sharedSpelling(true) },
        { name: 'undirected 1 and "1"', graph: sharedSpelling(false) },
    ];
    // Not expectFacadeMatchesLegacy: it freezes each fixture first, which a NaN weight refuses. Both
    // sides run the same legacy code, so the results must be equal exactly, NaN included.
    const expectSameOnAll = (legacy: (g: Graph) => unknown, facade: (g: Graph) => unknown): void => {
        for (const { name, graph } of fixtures) {
            expect(facade(graph), name).toStrictEqual(legacy(graph));
        }
    };
    const byNode = (g: Graph, node: (id: NodeId) => unknown): unknown[] => ids(g).map((id) => outcome(() => node(id)));

    it("every facade returns what its legacy implementation returns", () => {
        expectSameOnAll(
            (g) => [
                legacyResult<CentralityResult>(),
                legacyResult<Record<string, number>>(),
                [...legacyResult<Map<string, number>>()],
                byNode(g, () => legacyResult<number>()),
                byNode(g, () => legacyResult<number>()),
                outcome(() => legacyResult<HITSResult>()),
                outcome(() => legacyResult<CentralityResult>()),
                outcome(() => legacyResult<CentralityResult>()),
                outcome(() => legacyResult<PageRankResult>()),
                outcome(() => legacyResult<PageRankResult>()),
            ],
            (g) => [
                degreeCentrality(g),
                betweennessCentrality(g),
                [...edgeBetweennessCentrality(g)],
                byNode(g, (id) => nodeClosenessCentrality(g, id)),
                byNode(g, (id) => nodeWeightedClosenessCentrality(g, id)),
                outcome(() => hits(g)),
                outcome(() => katzCentrality(g)),
                outcome(() => eigenvectorCentrality(g)),
                outcome(() => pageRank(g)),
                outcome(() => pageRank(g, { weight: "weight" })),
            ],
        );
    });

    it("the whole-graph closeness functions equal legacy's per-node loop", () => {
        expectSameOnAll(
            (g) => [
                Object.fromEntries(ids(g).map((id) => [String(id), legacyResult<number>()])),
                Object.fromEntries(ids(g).map((id) => [String(id), legacyResult<number>()])),
            ],
            (g) => [closenessCentrality(g), weightedClosenessCentrality(g)],
        );
    });
});
