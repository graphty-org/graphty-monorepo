#!/usr/bin/env tsx

/**
 * Times the algorithms of @graphty/algorithms over generated graphs with Benchmark.js and saves the session
 * for `npm run benchmark:report`.
 *
 * Usage: tsx benchmarks/node/algorithms-benchmark.ts [--quick] [--only <name>[,<name>...]]
 */
import type { GraphSnapshot } from "@graphty/graph-format";

import * as algorithms from "../../src/index";
import { getGraphSizes } from "../algorithm-complexity";
import type { GraphImpl } from "../benchmark-graph";
import { saveBenchmarkSession } from "../utils/benchmark-result";
import { CrossPlatformBenchmark } from "../utils/benchmark-runner";
import { convertToSnapshot } from "../utils/graph-adapter";
import { formatSystemInfo, getSystemInfo } from "../utils/system-info";
import { generateTestGraphs } from "../utils/test-data-generator";

interface Entry {
    /** Name in algorithm-complexity.ts, which sets the graph sizes */
    readonly name: string;
    readonly directed: boolean;
    /** The graph to run on; a sparse random graph unless the algorithm needs another shape */
    readonly graph?: (size: number) => GraphImpl;
    /** Runs the algorithm once and returns something that depends on its whole result */
    readonly run: (s: GraphSnapshot) => unknown;
}

const ENTRIES: readonly Entry[] = [
    { name: "BFS", directed: false, run: (s) => algorithms.breadthFirstSearch(s, 0).visitedCount },
    { name: "DFS", directed: false, run: (s) => algorithms.depthFirstSearch(s, 0).visitedCount },
    { name: "Dijkstra", directed: false, run: (s) => algorithms.dijkstra(s, 0).dist },
    { name: "Bellman-Ford", directed: true, run: (s) => algorithms.bellmanFord(s, 0).dist },
    { name: "Floyd-Warshall", directed: false, run: (s) => algorithms.allPairsShortestPath(s).dist },
    { name: "PageRank", directed: true, run: (s) => algorithms.pageRank(s, { tolerance: 1e-4, maxIterations: 50 }) },
    { name: "HITS", directed: true, run: (s) => algorithms.hits(s) },
    { name: "Degree Centrality", directed: false, run: (s) => algorithms.degreeCentrality(s) },
    { name: "Betweenness Centrality", directed: false, run: (s) => algorithms.betweennessCentrality(s).scores },
    { name: "Closeness Centrality", directed: false, run: (s) => algorithms.closenessCentrality(s).scores },
    { name: "Eigenvector Centrality", directed: false, run: (s) => algorithms.eigenvectorCentrality(s).scores },
    { name: "Katz Centrality", directed: true, run: (s) => algorithms.katzCentrality(s).scores },
    { name: "Connected Components", directed: false, run: (s) => algorithms.connectedComponents(s).count },
    { name: "Strongly Connected Components", directed: true, run: (s) => algorithms.stronglyConnectedComponents(s) },
    { name: "Kruskal", directed: false, run: (s) => algorithms.kruskalMST(s).totalWeight },
    { name: "Prim", directed: false, run: (s) => algorithms.primMST(s, { forest: true }).totalWeight },
    { name: "K-Core", directed: false, run: (s) => algorithms.kCoreDecomposition(s).maxCore },
    { name: "Louvain", directed: false, run: (s) => algorithms.louvain(s).modularity },
    { name: "Leiden", directed: false, run: (s) => algorithms.leiden(s).modularity },
    { name: "Label Propagation", directed: false, run: (s) => algorithms.labelPropagation(s, { randomSeed: 1 }) },
    { name: "Girvan-Newman", directed: false, run: (s) => algorithms.girvanNewman(s, { maxCommunities: 4 }) },
    { name: "Common Neighbors", directed: false, run: (s) => algorithms.commonNeighborsPrediction(s, { topK: 10 }) },
    { name: "Adamic-Adar", directed: false, run: (s) => algorithms.adamicAdarPrediction(s, { topK: 10 }) },
    { name: "MCL", directed: false, run: (s) => algorithms.markovClustering(s, { maxIterations: 20 }) },
    { name: "Hierarchical Clustering", directed: false, run: (s) => algorithms.hierarchicalClustering(s) },
    { name: "Spectral Clustering", directed: false, run: (s) => algorithms.spectralClustering(s, { k: 3, seed: 1 }) },
    { name: "Min-Cut", directed: false, run: (s) => algorithms.stoerWagner(s).cutValue },
    { name: "Max Flow", directed: true, run: (s) => algorithms.maxFlow(s, 0, s.nodeCount - 1).maxFlow },
    {
        name: "Bipartite Matching",
        directed: false,
        // A square grid is bipartite
        graph: (size) => generateTestGraphs.grid(Math.round(Math.sqrt(size))),
        run: (s) => algorithms.maximumBipartiteMatching(s),
    },
];

async function main(): Promise<void> {
    const quick = process.argv.includes("--quick");
    const onlyAt = process.argv.indexOf("--only");
    const only = onlyAt === -1 ? null : new Set(process.argv[onlyAt + 1]?.split(","));
    const entries = ENTRIES.filter((e) => only === null || only.has(e.name));
    if (entries.length === 0) {
        throw new Error(`--only names no algorithm; the names are: ${ENTRIES.map((e) => e.name).join(", ")}`);
    }

    console.log(formatSystemInfo(getSystemInfo()));
    const config = { testType: quick ? ("quick" as const) : ("comprehensive" as const), platform: "node" as const };
    const benchmark = new CrossPlatformBenchmark({ ...config, sizes: [] }, "Algorithms");

    for (const entry of entries) {
        for (const size of getGraphSizes(entry.name, quick)) {
            const generated = entry.graph?.(size) ?? generateTestGraphs.sparse(size);
            const s = convertToSnapshot(generated, entry.directed);
            entry.run(s); // a throw here fails fast, before any timing
            benchmark.addTest(
                `${entry.name} ${s.nodeCount} vertices`,
                () => {
                    entry.run(s);
                },
                {
                    algorithm: entry.name,
                    graphType: entry.graph === undefined ? "sparse" : "grid",
                    graphSize: s.nodeCount,
                    edges: s.edgeCount,
                    graphGenerationAlgorithm: generated.metadata.generationAlgorithm,
                },
                { minSamples: quick ? 5 : 10, initCount: 1, minTime: 0.05 },
            );
        }
    }

    const session = await benchmark.run();
    for (const result of session.results) {
        console.log(`${result.algorithm}\t${result.graphSize}\t${result.executionTime.toFixed(2)} ms`);
    }
    console.log(`Results saved to ${await saveBenchmarkSession(session)}`);
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
