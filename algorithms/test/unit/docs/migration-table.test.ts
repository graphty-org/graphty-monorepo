/**
 * @file The migration guide's table names a replacement for every function and class that algorithms 2.x exported,
 * and every function it tells a reader to call exists.
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { assert, describe, it } from "vitest";

import * as algorithms from "../../../src/index.js";

const GUIDE = readFileSync(join(resolve(__dirname, "../../.."), "docs/guide/migrating-to-3.md"), "utf8");

/** The 90 functions and 3 classes the 2.x barrel exported (its data structures and CSR helpers not counted). */
const LEGACY = [
    "adamicAdarForPairs",
    "adamicAdarPrediction",
    "adamicAdarScore",
    "allPairsShortestPath",
    "astar",
    "astarWithDetails",
    "bellmanFord",
    "bellmanFordPath",
    "betweennessCentrality",
    "bipartitePartition",
    "breadthFirstSearch",
    "calculateMCLModularity",
    "closenessCentrality",
    "commonNeighborsForPairs",
    "commonNeighborsPrediction",
    "commonNeighborsScore",
    "compareAdamicAdarWithCommonNeighbors",
    "condensationGraph",
    "connectedComponents",
    "connectedComponentsDFS",
    "createBipartiteFlowNetwork",
    "degreeCentrality",
    "depthFirstSearch",
    "dijkstra",
    "dijkstraPath",
    "edgeBetweennessCentrality",
    "edmondsKarp",
    "eigenvectorCentrality",
    "evaluateAdamicAdar",
    "evaluateCommonNeighbors",
    "findAllIsomorphisms",
    "findStronglyConnectedComponents",
    "floydWarshall",
    "floydWarshallPath",
    "fordFulkerson",
    "getConnectedComponent",
    "getKCore",
    "getTopAdamicAdarCandidatesForNode",
    "getTopCandidatesForNode",
    "girvanNewman",
    "greedyBipartiteMatching",
    "grsbm",
    "hasCycleDFS",
    "hasNegativeCycle",
    "hierarchicalClustering",
    "hits",
    "isBipartite",
    "isConnected",
    "isGraphIsomorphic",
    "isStronglyConnected",
    "isWeaklyConnected",
    "kCoreDecomposition",
    "kargerMinCut",
    "katzCentrality",
    "kruskalMST",
    "labelPropagation",
    "labelPropagationAsync",
    "labelPropagationSemiSupervised",
    "largestConnectedComponent",
    "leiden",
    "louvain",
    "markovClustering",
    "maximumBipartiteMatching",
    "minSTCut",
    "minimumSpanningTree",
    "nodeBetweennessCentrality",
    "nodeClosenessCentrality",
    "nodeDegreeCentrality",
    "nodeEigenvectorCentrality",
    "nodeHITS",
    "nodeKatzCentrality",
    "nodeWeightedClosenessCentrality",
    "numberOfConnectedComponents",
    "pageRank",
    "pageRankCentrality",
    "personalizedPageRank",
    "primMST",
    "shortestPathBFS",
    "singleSourceShortestPath",
    "singleSourceShortestPathBFS",
    "spectralClustering",
    "stoerWagner",
    "stronglyConnectedComponents",
    "syncClustering",
    "teraHAC",
    "topPageRankNodes",
    "topologicalSort",
    "transitiveClosure",
    "weaklyConnectedComponents",
    "weightedClosenessCentrality",
    "DeltaPageRank",
    "PriorityDeltaPageRank",
    "DirectionOptimizedBFS",
];

/** The table's rows: the name in the first column and the text of the second. */
function rows(): { legacy: string; replacement: string }[] {
    const out: { legacy: string; replacement: string }[] = [];
    for (const line of GUIDE.split("\n")) {
        const match = /^\| `([A-Za-z]+)[(` ][^|]*\|(.*)\|\s*$/.exec(line);
        if (match !== null) {
            out.push({ legacy: match[1], replacement: match[2] });
        }
    }
    return out;
}

describe("the 3.0 migration table", () => {
    it("has one row for each of the 90 functions and 3 classes of 2.x, and no other", () => {
        assert.strictEqual(LEGACY.length, 93);
        assert.sameMembers(
            rows().map((row) => row.legacy),
            LEGACY,
        );
    });

    it("names only functions that algorithms 3.0 exports", () => {
        const exported = new Set(Object.keys(algorithms));
        for (const { legacy, replacement } of rows()) {
            // A bare call or constructor inside code, not a method of a result (`r.pathTo(`) or snapshot (`s.degree(`).
            for (const match of replacement.matchAll(/(?<![.\w])(?:new )?([A-Za-z]+)\(/g)) {
                assert.isTrue(exported.has(match[1]), `the row of ${legacy} calls ${match[1]}, which is not exported`);
            }
        }
    });
});
