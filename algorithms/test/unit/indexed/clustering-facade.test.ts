/**
 * `hierarchicalClustering`, `markovClustering`, `syncClustering` and `grsbm` delegate to their
 * `indexed.*` ports. Each is run through its facade and against the pre-migration implementation,
 * which must agree exactly (SynC's embeddings and loss within 1e-9 relative), including the inputs
 * the ports refuse and the facades hand back to the old code.
 */

import { describe, expect, it } from "vitest";

import {
    type ClusterNode,
    cutDendrogram,
    hierarchicalClustering,
    type LinkageMethod,
} from "../../../src/clustering/hierarchical.js";
import * as hierarchicalLegacy from "../../../src/clustering/hierarchical-legacy.js";
import { markovClustering, type MCLOptions } from "../../../src/clustering/mcl.js";
import * as mclLegacy from "../../../src/clustering/mcl-legacy.js";
import { Graph } from "../../../src/core/graph.js";
import { grsbm } from "../../../src/research/grsbm.js";
import * as grsbmLegacy from "../../../src/research/grsbm-legacy.js";
import { syncClustering, type SynCConfig } from "../../../src/research/sync.js";
import * as syncLegacy from "../../../src/research/sync-legacy.js";
import { expectFacadeMatchesLegacy, type FacadeFixture } from "../../helpers/facade-differential.js";
import { legacyResult } from "../../helpers/golden.js";
import { numericIdsFromZero } from "./multigraph-fixtures.js";
import { directedFixtures, offGridWeights, undirectedFixtures } from "./port-fixtures.js";

/** A legacy graph with a self-loop and a repeated edge, which a legacy graph keeps once. */
function loopy(directed: boolean): Graph {
    const g = new Graph({ directed, allowSelfLoops: true, allowParallelEdges: true });
    for (const [u, v] of [
        ["a", "b"],
        ["a", "b"],
        ["b", "a"],
        ["a", "c"],
        ["b", "c"],
        ["c", "c"],
        ["c", "d"],
        ["d", "e"],
        ["b", "d"],
        ["f", "c"],
        ["f", "a"],
    ]) {
        g.addEdge(u, v);
    }
    return g;
}

/**
 * A legacy graph accepts a NaN weight, which a weighted snapshot cannot hold (so the parity helper,
 * which freezes one, cannot take it). Only Markov clustering reads weights.
 */
function nanWeighted(): Graph {
    const g = new Graph({ directed: false });
    g.addEdge("a", "b", NaN);
    g.addEdge("b", "c");
    g.addEdge("c", "a", 2);
    g.addEdge("c", "d");
    g.addEdge("d", "e", NaN);
    return g;
}

function single(): Graph {
    const g = new Graph({ directed: false });
    g.addNode("only");
    return g;
}

const nonEmpty: FacadeFixture[] = [
    ...undirectedFixtures(),
    ...directedFixtures(),
    { name: "undirected, a self-loop and a repeated edge", graph: loopy(false) },
    { name: "directed, a self-loop and a repeated edge", graph: loopy(true) },
    { name: "numeric ids from zero", graph: numericIdsFromZero() },
    { name: "off-grid weights", graph: offGridWeights(undirectedFixtures()[4].graph) },
    { name: "one node", graph: single() },
];
const fixtures: FacadeFixture[] = [...nonEmpty, { name: "empty", graph: new Graph({ directed: false }) }];

/** Every cluster reachable from the root, each once, children after their parent. */
function reachable(root: ClusterNode<string>): Set<ClusterNode<string>> {
    const seen = new Set<ClusterNode<string>>();
    const visit = (c: ClusterNode<string> | undefined): void => {
        if (c !== undefined && !seen.has(c)) {
            seen.add(c);
            visit(c.left);
            visit(c.right);
            c.trees?.forEach(visit);
        }
    };
    visit(root);
    return seen;
}

describe("a NaN weight", () => {
    it("is ignored where legacy ignores it and gets legacy's answer where it is read", () => {
        const g = nanWeighted();
        expect(hierarchicalClustering(g, "average")).toEqual(
            legacyResult<hierarchicalLegacy.HierarchicalClusteringResult<string>>(),
        );
        expect(markovClustering(g)).toEqual(legacyResult<mclLegacy.MCLResult>());
        expect(grsbm(g)).toEqual(legacyResult<grsbmLegacy.GRSBMResult>());
        const embeddings = (r: { embeddings: Map<unknown, number[]> }): number[] => [...r.embeddings.values()].flat();
        const port = syncClustering(g, { numClusters: 2 });
        const old = legacyResult<syncLegacy.SynCResult>();
        expect(port.clusters).toEqual(old.clusters);
        const drift = embeddings(port).map((x, i) => Math.abs(x - embeddings(old)[i]));
        expect(drift.length).toBe(embeddings(old).length);
        expect(Math.max(...drift)).toBeLessThan(1e-12);
    });
});

describe("hierarchicalClustering facade", () => {
    const LINKAGES: LinkageMethod[] = ["single", "complete", "average", "ward"];

    for (const linkage of LINKAGES) {
        it(`equals legacy with ${linkage} linkage: root, dendrogram and clusters by height`, () => {
            expectFacadeMatchesLegacy(fixtures, (g) => hierarchicalClustering(g, linkage));
        });
    }

    it("treats an unknown linkage as single, as legacy does", () => {
        expectFacadeMatchesLegacy(fixtures, (g) => hierarchicalClustering(g, "median" as LinkageMethod));
    });

    it("shares cluster objects the way legacy does: the dendrogram holds the tree, cuts hold member Sets", () => {
        for (const { name, graph } of nonEmpty) {
            const r = hierarchicalClustering(graph, "average");
            const inTree = reachable(r.root);
            expect(new Set(r.dendrogram), name).toEqual(inTree);
            expect(r.dendrogram.length, name).toBe(inTree.size);
            const members = new Set([...inTree].map((c) => c.members));
            for (const [height, sets] of r.clusters) {
                expect(sets, `${name} at ${String(height)}`).toEqual(cutDendrogram(r.root, height));
                for (const set of sets) {
                    expect(members.has(set), `${name} at ${String(height)}`).toBe(true);
                }
            }
        }
    });

    it("keeps legacy's merge of two nodes whose ids have the same spelling", () => {
        // Legacy keys its adjacency by String(id), so 1 and "1" are one node there.
        const g = new Graph({ directed: false });
        g.addEdge(1, "1");
        g.addEdge("1", "b");
        g.addEdge("b", 2);
        expectFacadeMatchesLegacy([{ name: "1 and '1'", graph: g }], (graph) => hierarchicalClustering(graph));
    });
});

describe("markovClustering facade", () => {
    const OPTION_SETS: MCLOptions[] = [
        {},
        { inflation: 1.5 },
        { inflation: 3, expansion: 3 },
        { selfLoops: false },
        { pruningThreshold: 0.01, maxIterations: 7 },
        { maxIterations: 0 },
        { maxIterations: 1 },
    ];

    for (const options of OPTION_SETS) {
        it(`equals legacy with ${JSON.stringify(options)}`, () => {
            expectFacadeMatchesLegacy(fixtures, (g) => markovClustering(g, options));
        });
    }

    it("keeps legacy's answer for parameters and weights the port refuses", () => {
        const refused: MCLOptions[] = [
            { expansion: 1.5 },
            { expansion: 0 },
            { inflation: 0 },
            { inflation: Infinity },
            { maxIterations: 2.5 },
            { maxIterations: -1 },
            { tolerance: -1 },
            { pruningThreshold: NaN },
        ];
        const small = nonEmpty.slice(0, 5);
        for (const options of refused) {
            expectFacadeMatchesLegacy(small, (g) => markovClustering(g, options));
        }
        for (const bad of [-1, Infinity]) {
            const g = new Graph({ directed: false });
            g.addEdge("a", "b", bad);
            g.addEdge("b", "c", 2);
            g.addEdge("c", "a");
            g.addEdge("c", "d");
            expectFacadeMatchesLegacy([{ name: `a weight of ${String(bad)}`, graph: g }], (graph) =>
                markovClustering(graph),
            );
        }
    });
});

describe("markovClustering facade after a weight change in place", () => {
    it.each([true, false])(
        "clusters on the current weights, not the ones of an earlier call (directed %s)",
        (directed) => {
            const g = new Graph({ directed });
            const triangles = [
                ["a", "b"],
                ["b", "c"],
                ["c", "a"],
                ["d", "e"],
                ["e", "f"],
                ["f", "d"],
            ];
            for (const [u, v] of [...triangles, ["c", "d"]]) {
                g.addEdge(u, v);
            }
            expect(markovClustering(g)).toEqual(legacyResult<mclLegacy.MCLResult>());
            for (const [u, v] of triangles) {
                const edge = g.getEdge(u, v);
                if (edge !== undefined) {
                    edge.weight = 0.01;
                }
            }
            const bridge = g.getEdge("c", "d");
            if (bridge !== undefined) {
                bridge.weight = 100;
            }
            expect(markovClustering(g)).toEqual(legacyResult<mclLegacy.MCLResult>());
        },
    );
});

describe("syncClustering facade", () => {
    const sync = (run: typeof syncClustering, config: SynCConfig): ((g: Graph) => unknown) => {
        return (g) => run(g, config);
    };
    /** The fixtures the old code accepts this cluster count on. */
    const enough = (numClusters: number): FacadeFixture[] =>
        fixtures.filter((f) => f.graph.nodeCount === 0 || f.graph.nodeCount >= numClusters);

    for (const config of [
        { numClusters: 1 },
        { numClusters: 2 },
        { numClusters: 3, tolerance: 1e-3 },
        { numClusters: 2, maxIterations: 3 },
        { numClusters: 2, maxIterations: 0 },
        { numClusters: 4, maxIterations: 7, tolerance: 1e-9, seed: 7, learningRate: 0.05, lambda: 0.3 },
    ]) {
        it(`equals legacy with ${JSON.stringify(config)}: clusters, embeddings, loss and iterations`, () => {
            expectFacadeMatchesLegacy(enough(config.numClusters), sync(syncClustering, config), { tolerance: 1e-9 });
        });
    }

    it("keeps legacy's answer for a cluster count that is not an integer", () => {
        const before = Math.random;
        try {
            for (const numClusters of [0.5, 1.5, NaN]) {
                // With no rounds to run the old code returns a result...
                const config = { numClusters, maxIterations: 0 };
                expectFacadeMatchesLegacy(nonEmpty.slice(0, 3), sync(syncClustering, config));
                // ...and otherwise fails the same way.
                const g = nonEmpty[0].graph;
                expect(() => syncClustering(g, { numClusters })).toThrow("Invalid array length");
                expect(() => legacyResult<syncLegacy.SynCResult>()).toThrow("Invalid array length");
            }
        } finally {
            Math.random = before;
        }
    });

    it("throws legacy's message for a cluster count out of range", () => {
        const g = undirectedFixtures()[1].graph;
        // Legacy leaves its seeded generator in Math.random when it throws.
        const before = Math.random;
        for (const numClusters of [0, -1, 7, Infinity]) {
            const run = (fn: typeof syncClustering) => () => fn(g, { numClusters });
            expect(run(syncClustering), String(numClusters)).toThrow(
                `Invalid number of clusters: ${String(numClusters)}. Must be between 1 and 6`,
            );
            expect(run(syncLegacy.syncClustering), String(numClusters)).toThrow(
                `Invalid number of clusters: ${String(numClusters)}. Must be between 1 and 6`,
            );
            Math.random = before;
        }
    });

    it("leaves Math.random alone", () => {
        const before = Math.random;
        syncClustering(undirectedFixtures()[0].graph, { numClusters: 2 });
        syncClustering(new Graph(), { numClusters: 2 });
        expect(Math.random).toBe(before);
    });
});

describe("grsbm facade", () => {
    it("keeps legacy's answer on a graph with a self-loop", () => {
        const loops = nonEmpty.filter((f) => [...f.graph.edges()].some((e) => e.source === e.target));
        expect(loops.length).toBe(2);
        expectFacadeMatchesLegacy(loops, (g) => grsbm(g));
    });

    it("equals legacy on every fixture with the defaults", () => {
        expectFacadeMatchesLegacy(nonEmpty, (g) => grsbm(g));
    });

    it("equals legacy on every fixture with every option set", () => {
        const config = {
            maxDepth: 2,
            minClusterSize: 3,
            tolerance: 1e-8,
            maxIterations: 40,
            seed: 7,
            numEigenvectors: 3,
        };
        expectFacadeMatchesLegacy(nonEmpty, (g) => grsbm(g, config));
    });

    it("equals legacy with shallow and zero depth", () => {
        for (const config of [{ maxDepth: 0 }, { maxDepth: 1 }, { minClusterSize: 1 }]) {
            expectFacadeMatchesLegacy(nonEmpty, (g) => grsbm(g, config));
        }
    });

    it("throws legacy's message on an empty graph", () => {
        expect(() => grsbm(new Graph())).toThrow("Cannot cluster empty graph");
    });
});
