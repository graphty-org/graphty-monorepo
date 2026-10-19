/**
 * @file Every built-in algorithm states its caveats as coded facts, and the English it still
 * publishes in `notes` is worded from those facts, word for word as before the facts existed.
 *
 * `caveat-notes.golden.json` holds the sentences each case published before `Caveats.facts` was
 * added (issue #866). A run that words a fact differently, drops one or adds one fails here.
 */

import { readFileSync, writeFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { AStarAlgorithm } from "../../../src/algorithms/AStarAlgorithm";
import { BellmanFordAlgorithm } from "../../../src/algorithms/BellmanFordAlgorithm";
import { BetweennessCentralityAlgorithm } from "../../../src/algorithms/BetweennessCentralityAlgorithm";
import { BFSAlgorithm } from "../../../src/algorithms/BFSAlgorithm";
import { BipartiteMatchingAlgorithm } from "../../../src/algorithms/BipartiteMatchingAlgorithm";
import { ClosenessCentralityAlgorithm } from "../../../src/algorithms/ClosenessCentralityAlgorithm";
import { ClusteringCoefficientAlgorithm } from "../../../src/algorithms/ClusteringCoefficientAlgorithm";
import { ConnectedComponentsAlgorithm } from "../../../src/algorithms/ConnectedComponentsAlgorithm";
import { DegreeAlgorithm } from "../../../src/algorithms/DegreeAlgorithm";
import { DFSAlgorithm } from "../../../src/algorithms/DFSAlgorithm";
import { DijkstraAlgorithm } from "../../../src/algorithms/DijkstraAlgorithm";
import { EdgeBetweennessCentralityAlgorithm } from "../../../src/algorithms/EdgeBetweennessCentralityAlgorithm";
import { EigenvectorCentralityAlgorithm } from "../../../src/algorithms/EigenvectorCentralityAlgorithm";
import { FloydWarshallAlgorithm } from "../../../src/algorithms/FloydWarshallAlgorithm";
import { GirvanNewmanAlgorithm } from "../../../src/algorithms/GirvanNewmanAlgorithm";
import { HierarchicalClusteringAlgorithm } from "../../../src/algorithms/HierarchicalClusteringAlgorithm";
import { HITSAlgorithm } from "../../../src/algorithms/HITSAlgorithm";
import { KatzCentralityAlgorithm } from "../../../src/algorithms/KatzCentralityAlgorithm";
import { KCoreAlgorithm } from "../../../src/algorithms/KCoreAlgorithm";
import { KruskalAlgorithm } from "../../../src/algorithms/KruskalAlgorithm";
import { LabelPropagationAlgorithm } from "../../../src/algorithms/LabelPropagationAlgorithm";
import { LeidenAlgorithm } from "../../../src/algorithms/LeidenAlgorithm";
import { LinkPredictionAlgorithm } from "../../../src/algorithms/LinkPredictionAlgorithm";
import { LouvainAlgorithm } from "../../../src/algorithms/LouvainAlgorithm";
import { MarkovClusteringAlgorithm } from "../../../src/algorithms/MarkovClusteringAlgorithm";
import { MaxFlowAlgorithm } from "../../../src/algorithms/MaxFlowAlgorithm";
import type { MetricAlgorithm } from "../../../src/algorithms/metrics/MetricAlgorithm";
import { MinCutAlgorithm } from "../../../src/algorithms/MinCutAlgorithm";
import { PageRankAlgorithm } from "../../../src/algorithms/PageRankAlgorithm";
import { PrimAlgorithm } from "../../../src/algorithms/PrimAlgorithm";
import { type DeclaredAlgorithm, detachedRunContext } from "../../../src/algorithms/results";
import { SpectralClusteringAlgorithm } from "../../../src/algorithms/SpectralClusteringAlgorithm";
import { StronglyConnectedComponentsAlgorithm } from "../../../src/algorithms/StronglyConnectedComponentsAlgorithm";
import type { Graph } from "../../../src/Graph";
import { caveatSentence } from "../../../src/session/runs/caveatFacts";
import type { Caveats } from "../../../src/session/runs/types";
import { createMockGraph } from "../../helpers/mockGraph";

const GOLDEN_PATH = new URL("caveat-notes.golden.json", import.meta.url);

/** A connected, weighted graph with a triangle, so every method has something to find. */
const FIXTURE = {
    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }, { id: "F" }],
    edges: [
        { srcId: "A", dstId: "B", weight: 1, value: 1 },
        { srcId: "B", dstId: "C", weight: 1, value: 1 },
        { srcId: "A", dstId: "C", weight: 1, value: 1 },
        { srcId: "C", dstId: "D", weight: 5, value: 5 },
        { srcId: "D", dstId: "E", weight: 1, value: 1 },
        { srcId: "E", dstId: "F", weight: 1, value: 1 },
        { srcId: "D", dstId: "F", weight: 1, value: 1 },
    ],
};

/** Two pieces, so a route, a walk and a flow can fail to arrive. */
const SPLIT = {
    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }],
    edges: [
        { srcId: "A", dstId: "B", weight: 1, value: 1 },
        { srcId: "C", dstId: "D", weight: 1, value: 1 },
    ],
};

/** One way of running one algorithm. */
interface Case {
    readonly name: string;
    readonly fixture?: typeof FIXTURE & { readonly directed?: boolean };
    readonly caveats: (graph: Graph) => Promise<Caveats>;
}

function declared(name: string, make: (graph: Graph) => DeclaredAlgorithm, fixture?: Case["fixture"]): Case {
    return {
        name,
        fixture,
        caveats: async (graph) => {
            const output = await make(graph).compute(detachedRunContext());
            assert.isNotNull(output, `${name} produced no result`);

            return output.caveats as Caveats;
        },
    };
}

function metric(name: string, make: (graph: Graph) => MetricAlgorithm): Case {
    return {
        name,
        caveats: async (graph) => {
            const algorithm = make(graph);
            await algorithm.run();
            assert.isDefined(algorithm.result, `${name} produced no result`);

            return algorithm.result.summary().caveats;
        },
    };
}

const CASES: readonly Case[] = [
    metric("degree", (g) => new DegreeAlgorithm(g)),
    metric("betweenness", (g) => new BetweennessCentralityAlgorithm(g)),
    metric("betweenness sampled", (g) => new BetweennessCentralityAlgorithm(g, { k: 2, seed: 1 })),
    metric("closeness", (g) => new ClosenessCentralityAlgorithm(g)),
    metric("closeness sampled", (g) => new ClosenessCentralityAlgorithm(g, { k: 2, seed: 1 })),
    metric("pagerank", (g) => new PageRankAlgorithm(g)),
    metric(
        "pagerank personalized",
        (g) =>
            new PageRankAlgorithm(g, {
                personalization: new Map([
                    ["A", 1],
                    ["Z", 1],
                ]),
            }),
    ),
    metric(
        "pagerank personalization unmatched",
        (g) =>
            new PageRankAlgorithm(g, {
                personalization: new Map([
                    ["Z", 1],
                    ["Y", 1],
                ]),
            }),
    ),
    metric("eigenvector", (g) => new EigenvectorCentralityAlgorithm(g)),
    metric("katz", (g) => new KatzCentralityAlgorithm(g)),
    metric("katz capped", (g) => new KatzCentralityAlgorithm(g, { maxIterations: 1 })),
    metric("hits", (g) => new HITSAlgorithm(g)),
    metric("hits capped", (g) => new HITSAlgorithm(g, { maxIterations: 1, mode: "total" } as never)),
    metric("k-core", (g) => new KCoreAlgorithm(g)),
    metric("eigenvector in", (g) => new EigenvectorCentralityAlgorithm(g, { mode: "in" } as never)),
    metric("eigenvector out", (g) => new EigenvectorCentralityAlgorithm(g, { mode: "out" } as never)),
    metric("katz in", (g) => new KatzCentralityAlgorithm(g, { mode: "in" } as never)),
    metric("katz out", (g) => new KatzCentralityAlgorithm(g, { mode: "out" } as never)),
    metric("hits authority unscaled", (g) => new HITSAlgorithm(g, { mode: "in", normalized: false } as never)),
    metric("hits hub", (g) => new HITSAlgorithm(g, { mode: "out" } as never)),
    declared("louvain", (g) => new LouvainAlgorithm(g)),
    declared("leiden", (g) => new LeidenAlgorithm(g)),
    declared("label propagation", (g) => new LabelPropagationAlgorithm(g)),
    declared("girvan-newman", (g) => new GirvanNewmanAlgorithm(g)),
    declared("connected components", (g) => new ConnectedComponentsAlgorithm(g)),
    declared("strongly connected components", (g) => new StronglyConnectedComponentsAlgorithm(g)),
    declared("dijkstra", (g) => new DijkstraAlgorithm(g, { source: "A", target: "F" })),
    declared("dijkstra no route", (g) => new DijkstraAlgorithm(g, { source: "A", target: "D" }), SPLIT),
    declared("bellman-ford", (g) => new BellmanFordAlgorithm(g, { source: "A", target: "F" })),
    declared("floyd-warshall", (g) => new FloydWarshallAlgorithm(g)),
    declared("bfs", (g) => new BFSAlgorithm(g, { source: "A" })),
    declared("bfs reached", (g) => new BFSAlgorithm(g, { source: "A", targetNode: "F" })),
    declared("bfs unreached", (g) => new BFSAlgorithm(g, { source: "A", targetNode: "D" }), SPLIT),
    declared("dfs", (g) => new DFSAlgorithm(g, { source: "A" })),
    declared("dfs post-order", (g) => new DFSAlgorithm(g, { source: "A", preOrder: false })),
    declared("kruskal", (g) => new KruskalAlgorithm(g)),
    declared("prim", (g) => new PrimAlgorithm(g)),
    declared("bipartite matching", (g) => new BipartiteMatchingAlgorithm(g)),
    declared("bipartite matching paired", (g) => new BipartiteMatchingAlgorithm(g), SPLIT),
    declared("max flow", (g) => new MaxFlowAlgorithm(g, { source: "A", sink: "F" })),
    declared("max flow none", (g) => new MaxFlowAlgorithm(g, { source: "A", sink: "D" }), SPLIT),
    declared("max flow chosen", (g) => new MaxFlowAlgorithm(g)),
    declared("min cut", (g) => new MinCutAlgorithm(g)),
    declared("min cut karger", (g) => new MinCutAlgorithm(g, { useKarger: true })),
    declared("strongly connected components undirected", (g) => new StronglyConnectedComponentsAlgorithm(g), {
        ...FIXTURE,
        directed: false,
    }),
    declared(
        "a-star steered",
        (g) => new AStarAlgorithm(g, { source: "A", target: "F", heuristic: "layout-distance" } as never),
    ),
    declared("min cut one end", (g) => new MinCutAlgorithm(g, { source: "A" })),
    declared("clustering coefficient", (g) => new ClusteringCoefficientAlgorithm(g)),
    declared("link prediction", (g) => new LinkPredictionAlgorithm(g)),
    declared("markov clustering", (g) => new MarkovClusteringAlgorithm(g)),
    declared("spectral clustering", (g) => new SpectralClusteringAlgorithm(g)),
    declared("hierarchical clustering", (g) => new HierarchicalClusteringAlgorithm(g)),
    declared("hierarchical clustering fewer", (g) => new HierarchicalClusteringAlgorithm(g, { clusters: 5 }), SPLIT),
    declared("a-star", (g) => new AStarAlgorithm(g, { source: "A", target: "F" })),
    declared(
        "a-star no route",
        (g) => new AStarAlgorithm(g, { source: "A", target: "D", heuristic: "none" } as never),
        SPLIT,
    ),
    declared("edge betweenness", (g) => new EdgeBetweennessCentralityAlgorithm(g)),
    declared("edge betweenness sampled", (g) => new EdgeBetweennessCentralityAlgorithm(g, { k: 2, seed: 1 })),
];

/**
 * What every case says, run once.
 * @returns The caveats by case name.
 */
async function runAll(): Promise<Map<string, Caveats>> {
    const said = new Map<string, Caveats>();
    for (const testCase of CASES) {
        said.set(testCase.name, await testCase.caveats(await createMockGraph(testCase.fixture ?? FIXTURE)));
    }

    return said;
}

describe("a built-in algorithm's caveats", () => {
    it("words its English notes from its facts, word for word as before (#866)", async () => {
        const said = await runAll();

        if (process.env.RECORD_CAVEAT_GOLDEN === "1") {
            const golden = Object.fromEntries([...said].map(([name, caveats]) => [name, caveats.notes]));
            writeFileSync(GOLDEN_PATH, `${JSON.stringify(golden, null, 4)}\n`);
        }

        const golden = JSON.parse(readFileSync(GOLDEN_PATH, "utf8")) as Record<string, string[]>;
        for (const [name, caveats] of said) {
            assert.deepStrictEqual([...caveats.notes], golden[name], `${name}: the English changed`);
            assert.deepStrictEqual(
                caveats.facts.map(caveatSentence),
                [...caveats.notes],
                `${name}: a note is not worded from a fact`,
            );
        }
    });
});
