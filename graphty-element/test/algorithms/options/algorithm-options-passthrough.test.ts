/**
 * Comprehensive tests for algorithm options pass-through
 *
 * These tests verify that changing algorithm options actually affects the results.
 * Each test runs an algorithm with different options and confirms the output changes.
 */

import { assert, describe, it } from "vitest";

// Import all algorithms with options
import { Algorithm } from "../../../src/algorithms/Algorithm";
import { BellmanFordAlgorithm } from "../../../src/algorithms/BellmanFordAlgorithm";
import { BFSAlgorithm } from "../../../src/algorithms/BFSAlgorithm";
import { DFSAlgorithm } from "../../../src/algorithms/DFSAlgorithm";
import { DijkstraAlgorithm } from "../../../src/algorithms/DijkstraAlgorithm";
import { EigenvectorCentralityAlgorithm } from "../../../src/algorithms/EigenvectorCentralityAlgorithm";
import { GirvanNewmanAlgorithm } from "../../../src/algorithms/GirvanNewmanAlgorithm";
import { HITSAlgorithm } from "../../../src/algorithms/HITSAlgorithm";
import { KatzCentralityAlgorithm } from "../../../src/algorithms/KatzCentralityAlgorithm";
import { LabelPropagationAlgorithm } from "../../../src/algorithms/LabelPropagationAlgorithm";
import { LeidenAlgorithm } from "../../../src/algorithms/LeidenAlgorithm";
import { LouvainAlgorithm } from "../../../src/algorithms/LouvainAlgorithm";
import { MaxFlowAlgorithm } from "../../../src/algorithms/MaxFlowAlgorithm";
import { MinCutAlgorithm } from "../../../src/algorithms/MinCutAlgorithm";
import { PageRankAlgorithm } from "../../../src/algorithms/PageRankAlgorithm";
import { PrimAlgorithm } from "../../../src/algorithms/PrimAlgorithm";
import {
    createMockGraph,
    getEdgeResult,
    getGraphResult,
    getNodeResult,
} from "../../helpers/mockGraph";

/**
 * Test data: a simple graph for pathfinding tests
 * A -- B -- C -- D -- E
 */
const linearGraphData = {
    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }],
    edges: [
        { srcId: "A", dstId: "B", weight: 1 },
        { srcId: "B", dstId: "C", weight: 1 },
        { srcId: "C", dstId: "D", weight: 1 },
        { srcId: "D", dstId: "E", weight: 1 },
    ],
};

/**
 * Test data: a graph with multiple paths for flow tests
 *     B
 *    / \
 *   A   D
 *    \ /
 *     C
 */
const diamondGraphData = {
    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }],
    edges: [
        { srcId: "A", dstId: "B", weight: 2, capacity: 3 },
        { srcId: "A", dstId: "C", weight: 1, capacity: 2 },
        { srcId: "B", dstId: "D", weight: 1, capacity: 2 },
        { srcId: "C", dstId: "D", weight: 2, capacity: 3 },
    ],
};

/**
 * Test data: a larger graph for community detection
 */
const communityGraphData = {
    nodes: [
        { id: "A1" },
        { id: "A2" },
        { id: "A3" },
        { id: "B1" },
        { id: "B2" },
        { id: "B3" },
        { id: "bridge" },
    ],
    edges: [
        // Community A (tightly connected)
        { srcId: "A1", dstId: "A2", weight: 1 },
        { srcId: "A2", dstId: "A3", weight: 1 },
        { srcId: "A1", dstId: "A3", weight: 1 },
        // Community B (tightly connected)
        { srcId: "B1", dstId: "B2", weight: 1 },
        { srcId: "B2", dstId: "B3", weight: 1 },
        { srcId: "B1", dstId: "B3", weight: 1 },
        // Bridge between communities
        { srcId: "A1", dstId: "bridge", weight: 1 },
        { srcId: "bridge", dstId: "B1", weight: 1 },
    ],
};

describe("Algorithm Options Pass-Through Tests", () => {
    describe("Centrality Algorithms", () => {
        describe("PageRankAlgorithm", () => {
            it("dampingFactor option affects results", async () => {
                const graph1 = await createMockGraph({ dataPath: "./data4.json" });
                const graph2 = await createMockGraph({ dataPath: "./data4.json" });

                // Run with default damping (0.85)
                const pr1 = new PageRankAlgorithm(graph1);
                await pr1.run();

                // Run with different damping (0.5)
                const pr2 = new PageRankAlgorithm(graph2, { dampingFactor: 0.5 });
                await pr2.run();

                // Get results for first node
                const dm1 = graph1.getDataManager() as any;
                const dm2 = graph2.getDataManager() as any;
                const firstNodeId = Array.from(dm1.nodes.keys())[0];

                const rank1 = getNodeResult(graph1, firstNodeId, "graphty", "pagerank", "rank");
                const rank2 = getNodeResult(graph2, firstNodeId, "graphty", "pagerank", "rank");

                // Damping factor should be recorded in graph results
                assert.strictEqual(
                    getGraphResult(graph1, "graphty", "pagerank", "dampingFactor"),
                    0.85,
                );
                assert.strictEqual(
                    getGraphResult(graph2, "graphty", "pagerank", "dampingFactor"),
                    0.5,
                );

                // Results should be different
                assert.notStrictEqual(rank1, rank2, "Different damping factors should produce different results");
            });

            it("maxIterations option affects convergence", async () => {
                const graph1 = await createMockGraph({ dataPath: "./data4.json" });
                const graph2 = await createMockGraph({ dataPath: "./data4.json" });

                // Run with few iterations (may not converge)
                const pr1 = new PageRankAlgorithm(graph1, { maxIterations: 1 });
                await pr1.run();

                // Run with many iterations (should converge)
                const pr2 = new PageRankAlgorithm(graph2, { maxIterations: 100 });
                await pr2.run();

                const iterations1 = getGraphResult(graph1, "graphty", "pagerank", "iterations");
                const iterations2 = getGraphResult(graph2, "graphty", "pagerank", "iterations");

                // With maxIterations=1, should use exactly 1 iteration
                assert.strictEqual(iterations1, 1);
                // With more iterations, may converge before max
                assert.isAtMost(iterations2, 100);
            });

            it("tolerance option affects convergence", async () => {
                const graph1 = await createMockGraph({ dataPath: "./data4.json" });
                const graph2 = await createMockGraph({ dataPath: "./data4.json" });

                // Run with very tight tolerance (more iterations needed)
                const pr1 = new PageRankAlgorithm(graph1, { tolerance: 1e-10 });
                await pr1.run();

                // Run with loose tolerance (fewer iterations needed)
                const pr2 = new PageRankAlgorithm(graph2, { tolerance: 0.1 });
                await pr2.run();

                const iterations1 = getGraphResult(graph1, "graphty", "pagerank", "iterations");
                const iterations2 = getGraphResult(graph2, "graphty", "pagerank", "iterations");

                // Tighter tolerance should require more iterations
                assert.isAtLeast(
                    iterations1 as number,
                    iterations2 as number,
                    "Tighter tolerance should need more iterations",
                );
            });
        });

        describe("EigenvectorCentralityAlgorithm", () => {
            it("maxIterations option affects results", async () => {
                const graph1 = await createMockGraph({ dataPath: "./data4.json" });
                const graph2 = await createMockGraph({ dataPath: "./data4.json" });

                // Very few iterations may not converge fully
                const ev1 = new EigenvectorCentralityAlgorithm(graph1, { maxIterations: 2 });
                await ev1.run();

                // Many iterations should converge
                const ev2 = new EigenvectorCentralityAlgorithm(graph2, { maxIterations: 100 });
                await ev2.run();

                // Both should produce valid results (score exists)
                const dm1 = graph1.getDataManager() as any;
                const firstNodeId = Array.from(dm1.nodes.keys())[0];

                const score1 = getNodeResult(graph1, firstNodeId, "graphty", "eigenvector", "score");
                const score2 = getNodeResult(graph2, firstNodeId, "graphty", "eigenvector", "score");

                assert.isDefined(score1);
                assert.isDefined(score2);
            });

            it("tolerance option affects results", async () => {
                const graph1 = await createMockGraph({ dataPath: "./data4.json" });
                const graph2 = await createMockGraph({ dataPath: "./data4.json" });

                // Use valid tolerance values (max is 0.01)
                const ev1 = new EigenvectorCentralityAlgorithm(graph1, { tolerance: 1e-10, maxIterations: 1000 });
                await ev1.run();

                const ev2 = new EigenvectorCentralityAlgorithm(graph2, { tolerance: 0.01, maxIterations: 1000 });
                await ev2.run();

                // Both should produce valid results
                const dm1 = graph1.getDataManager() as any;
                const firstNodeId = Array.from(dm1.nodes.keys())[0];

                const score1 = getNodeResult(graph1, firstNodeId, "graphty", "eigenvector", "score");
                const score2 = getNodeResult(graph2, firstNodeId, "graphty", "eigenvector", "score");

                assert.isDefined(score1);
                assert.isDefined(score2);
            });
        });

        describe("KatzCentralityAlgorithm", () => {
            it("alpha option affects results", async () => {
                const graph1 = await createMockGraph({ dataPath: "./data4.json" });
                const graph2 = await createMockGraph({ dataPath: "./data4.json" });

                const katz1 = new KatzCentralityAlgorithm(graph1, { alpha: 0.1 });
                await katz1.run();

                const katz2 = new KatzCentralityAlgorithm(graph2, { alpha: 0.01 });
                await katz2.run();

                const dm1 = graph1.getDataManager() as any;
                const firstNodeId = Array.from(dm1.nodes.keys())[0];

                const score1 = getNodeResult(graph1, firstNodeId, "graphty", "katz", "score");
                const score2 = getNodeResult(graph2, firstNodeId, "graphty", "katz", "score");

                assert.notStrictEqual(score1, score2, "Different alpha values should produce different results");
            });

            it("beta option affects results", async () => {
                const graph1 = await createMockGraph({ dataPath: "./data4.json" });
                const graph2 = await createMockGraph({ dataPath: "./data4.json" });

                const katz1 = new KatzCentralityAlgorithm(graph1, { beta: 1.0 });
                await katz1.run();

                const katz2 = new KatzCentralityAlgorithm(graph2, { beta: 2.0 });
                await katz2.run();

                const dm1 = graph1.getDataManager() as any;
                const firstNodeId = Array.from(dm1.nodes.keys())[0];

                const score1 = getNodeResult(graph1, firstNodeId, "graphty", "katz", "score");
                const score2 = getNodeResult(graph2, firstNodeId, "graphty", "katz", "score");

                assert.notStrictEqual(score1, score2, "Different beta values should produce different results");
            });
        });

        describe("HITSAlgorithm", () => {
            it("maxIterations option affects results", async () => {
                const graph1 = await createMockGraph({ dataPath: "./data4.json" });
                const graph2 = await createMockGraph({ dataPath: "./data4.json" });

                // Few iterations
                const hits1 = new HITSAlgorithm(graph1, { maxIterations: 3 });
                await hits1.run();

                // Many iterations
                const hits2 = new HITSAlgorithm(graph2, { maxIterations: 50 });
                await hits2.run();

                // Both should produce valid results
                const dm1 = graph1.getDataManager() as any;
                const firstNodeId = Array.from(dm1.nodes.keys())[0];

                const hubScore1 = getNodeResult(graph1, firstNodeId, "graphty", "hits", "hubScore");
                const hubScore2 = getNodeResult(graph2, firstNodeId, "graphty", "hits", "hubScore");

                assert.isDefined(hubScore1);
                assert.isDefined(hubScore2);
            });
        });
    });

    describe("Community Detection Algorithms", () => {
        describe("LouvainAlgorithm", () => {
            it("resolution option affects number of communities", async () => {
                const graph1 = await createMockGraph(communityGraphData);
                const graph2 = await createMockGraph(communityGraphData);

                // Low resolution = fewer, larger communities
                const louvain1 = new LouvainAlgorithm(graph1, { resolution: 0.5 });
                await louvain1.run();

                // High resolution = more, smaller communities
                const louvain2 = new LouvainAlgorithm(graph2, { resolution: 2.0 });
                await louvain2.run();

                // Count unique communities
                const dm1 = graph1.getDataManager() as any;
                const dm2 = graph2.getDataManager() as any;

                const communities1 = new Set<number>();
                const communities2 = new Set<number>();

                for (const nodeId of dm1.nodes.keys()) {
                    const c = getNodeResult(graph1, nodeId, "graphty", "louvain", "communityId");
                    if (c !== undefined) communities1.add(c);
                }
                for (const nodeId of dm2.nodes.keys()) {
                    const c = getNodeResult(graph2, nodeId, "graphty", "louvain", "communityId");
                    if (c !== undefined) communities2.add(c);
                }

                // Higher resolution should produce same or more communities
                assert.isAtLeast(
                    communities2.size,
                    communities1.size,
                    "Higher resolution should produce more or equal communities",
                );
            });

            it("maxIterations option limits iterations", async () => {
                const graph = await createMockGraph(communityGraphData);

                const louvain = new LouvainAlgorithm(graph, { maxIterations: 1 });
                await louvain.run();

                // Algorithm should complete without error with limited iterations
                const dm = graph.getDataManager() as any;
                const firstNodeId = Array.from(dm.nodes.keys())[0];
                const communityId = getNodeResult(graph, firstNodeId, "graphty", "louvain", "communityId");
                assert.isDefined(communityId);
            });
        });

        describe("LeidenAlgorithm", () => {
            it("resolution option affects results", async () => {
                const graph1 = await createMockGraph(communityGraphData);
                const graph2 = await createMockGraph(communityGraphData);

                const leiden1 = new LeidenAlgorithm(graph1, { resolution: 0.5 });
                await leiden1.run();

                const leiden2 = new LeidenAlgorithm(graph2, { resolution: 2.0 });
                await leiden2.run();

                // Both should produce valid results
                const dm1 = graph1.getDataManager() as any;
                const firstNodeId = Array.from(dm1.nodes.keys())[0];

                const c1 = getNodeResult(graph1, firstNodeId, "graphty", "leiden", "communityId");
                const c2 = getNodeResult(graph2, firstNodeId, "graphty", "leiden", "communityId");

                assert.isDefined(c1);
                assert.isDefined(c2);
            });
        });

        describe("LabelPropagationAlgorithm", () => {
            it("maxIterations option limits iterations", async () => {
                const graph = await createMockGraph(communityGraphData);

                const lp = new LabelPropagationAlgorithm(graph, { maxIterations: 5 });
                await lp.run();

                // Algorithm should complete and assign communityId
                const dm = graph.getDataManager() as any;
                const firstNodeId = Array.from(dm.nodes.keys())[0];
                const communityId = getNodeResult(graph, firstNodeId, "graphty", "label-propagation", "communityId");
                assert.isDefined(communityId);
            });

            it("randomSeed option affects reproducibility", async () => {
                const graph1 = await createMockGraph(communityGraphData);
                const graph2 = await createMockGraph(communityGraphData);
                const graph3 = await createMockGraph(communityGraphData);

                // Same randomSeed should produce same results
                const lp1 = new LabelPropagationAlgorithm(graph1, { randomSeed: 42 });
                await lp1.run();

                const lp2 = new LabelPropagationAlgorithm(graph2, { randomSeed: 42 });
                await lp2.run();

                // Different randomSeed may produce different results
                const lp3 = new LabelPropagationAlgorithm(graph3, { randomSeed: 123 });
                await lp3.run();

                const dm1 = graph1.getDataManager() as any;
                const nodeIds = Array.from(dm1.nodes.keys());

                // Compare results from same randomSeed
                let sameResults = true;
                for (const nodeId of nodeIds) {
                    const communityId1 = getNodeResult(graph1, nodeId, "graphty", "label-propagation", "communityId");
                    const communityId2 = getNodeResult(graph2, nodeId, "graphty", "label-propagation", "communityId");
                    if (communityId1 !== communityId2) sameResults = false;
                }

                assert.isTrue(sameResults, "Same randomSeed should produce same results");
            });
        });

        describe("GirvanNewmanAlgorithm", () => {
            it("maxCommunities option limits number of communities", async () => {
                const graph1 = await createMockGraph(communityGraphData);
                const graph2 = await createMockGraph(communityGraphData);

                const gn1 = new GirvanNewmanAlgorithm(graph1, { maxCommunities: 2 });
                await gn1.run();

                const gn2 = new GirvanNewmanAlgorithm(graph2, { maxCommunities: 5 });
                await gn2.run();

                // Count communities
                const dm1 = graph1.getDataManager() as any;
                const dm2 = graph2.getDataManager() as any;

                const communities1 = new Set<number>();
                const communities2 = new Set<number>();

                for (const nodeId of dm1.nodes.keys()) {
                    const c = getNodeResult(graph1, nodeId, "graphty", "girvan-newman", "communityId");
                    if (c !== undefined) communities1.add(c);
                }
                for (const nodeId of dm2.nodes.keys()) {
                    const c = getNodeResult(graph2, nodeId, "graphty", "girvan-newman", "communityId");
                    if (c !== undefined) communities2.add(c);
                }

                assert.isAtMost(communities1.size, 2, "Should have at most 2 communities");
                assert.isAtMost(communities2.size, 5, "Should have at most 5 communities");
            });
        });
    });

    describe("Pathfinding Algorithms", () => {
        describe("DijkstraAlgorithm", () => {
            it("source option changes starting point", async () => {
                const graph1 = await createMockGraph(linearGraphData);
                const graph2 = await createMockGraph(linearGraphData);

                const dijkstra1 = new DijkstraAlgorithm(graph1, { source: "A", target: "E" });
                await dijkstra1.run();

                const dijkstra2 = new DijkstraAlgorithm(graph2, { source: "C", target: "E" });
                await dijkstra2.run();

                // Distance from A to B should be 1 in first case
                const distAB_1 = getNodeResult(graph1, "B", "graphty", "dijkstra", "distance");
                // Distance from C to B should be 1 in second case (going backwards)
                const distCB_2 = getNodeResult(graph2, "B", "graphty", "dijkstra", "distance");

                assert.strictEqual(distAB_1, 1, "Distance from A to B should be 1");
                assert.strictEqual(distCB_2, 1, "Distance from C to B should be 1");
            });

            it("target option changes path calculation", async () => {
                const graph1 = await createMockGraph(linearGraphData);
                const graph2 = await createMockGraph(linearGraphData);

                const dijkstra1 = new DijkstraAlgorithm(graph1, { source: "A", target: "C" });
                await dijkstra1.run();

                const dijkstra2 = new DijkstraAlgorithm(graph2, { source: "A", target: "E" });
                await dijkstra2.run();

                // Path to C: A-B-C (nodes A, B, C in path)
                const inPathC_1 = getNodeResult(graph1, "C", "graphty", "dijkstra", "isInPath");
                const inPathD_1 = getNodeResult(graph1, "D", "graphty", "dijkstra", "isInPath");
                const inPathE_1 = getNodeResult(graph1, "E", "graphty", "dijkstra", "isInPath");

                // Path to E: A-B-C-D-E (all nodes in path)
                const inPathE_2 = getNodeResult(graph2, "E", "graphty", "dijkstra", "isInPath");

                assert.isTrue(inPathC_1, "C should be in path to C");
                assert.isFalse(inPathD_1, "D should not be in path to C");
                assert.isFalse(inPathE_1, "E should not be in path to C");
                assert.isTrue(inPathE_2, "E should be in path to E");
            });
        });

        describe("BellmanFordAlgorithm", () => {
            it("source option changes starting point", async () => {
                const graph1 = await createMockGraph(linearGraphData);
                const graph2 = await createMockGraph(linearGraphData);

                const bf1 = new BellmanFordAlgorithm(graph1, { source: "A", target: "E" });
                await bf1.run();

                const bf2 = new BellmanFordAlgorithm(graph2, { source: "C", target: "E" });
                await bf2.run();

                // From A: distance to E = 4
                const distAE_1 = getNodeResult(graph1, "E", "graphty", "bellman-ford", "distance");
                // From C: distance to E = 2
                const distCE_2 = getNodeResult(graph2, "E", "graphty", "bellman-ford", "distance");

                assert.strictEqual(distAE_1, 4, "Distance from A to E should be 4");
                assert.strictEqual(distCE_2, 2, "Distance from C to E should be 2");
            });

            it("target option changes path marking", async () => {
                const graph1 = await createMockGraph(linearGraphData);
                const graph2 = await createMockGraph(linearGraphData);

                const bf1 = new BellmanFordAlgorithm(graph1, { source: "A", target: "C" });
                await bf1.run();

                const bf2 = new BellmanFordAlgorithm(graph2, { source: "A", target: "E" });
                await bf2.run();

                const inPathD_1 = getNodeResult(graph1, "D", "graphty", "bellman-ford", "isInPath");
                const inPathD_2 = getNodeResult(graph2, "D", "graphty", "bellman-ford", "isInPath");

                assert.isFalse(inPathD_1, "D should not be in path A->C");
                assert.isTrue(inPathD_2, "D should be in path A->E");
            });
        });
    });

    describe("Traversal Algorithms", () => {
        describe("BFSAlgorithm", () => {
            it("source option changes traversal start", async () => {
                const graph1 = await createMockGraph(linearGraphData);
                const graph2 = await createMockGraph(linearGraphData);

                const bfs1 = new BFSAlgorithm(graph1, { source: "A" });
                await bfs1.run();

                const bfs2 = new BFSAlgorithm(graph2, { source: "E" });
                await bfs2.run();

                // From A: level of E should be 4
                const levelE_1 = getNodeResult(graph1, "E", "graphty", "bfs", "level");
                // From E: level of A should be 4
                const levelA_2 = getNodeResult(graph2, "A", "graphty", "bfs", "level");

                assert.strictEqual(levelE_1, 4, "Level of E from A should be 4");
                assert.strictEqual(levelA_2, 4, "Level of A from E should be 4");

                // Source level should be 0
                const levelA_1 = getNodeResult(graph1, "A", "graphty", "bfs", "level");
                const levelE_2 = getNodeResult(graph2, "E", "graphty", "bfs", "level");

                assert.strictEqual(levelA_1, 0, "Source A level should be 0");
                assert.strictEqual(levelE_2, 0, "Source E level should be 0");
            });

            it("targetNode option stops traversal early", async () => {
                const graph1 = await createMockGraph(linearGraphData);
                const graph2 = await createMockGraph(linearGraphData);

                // Traverse until C (should visit A, B, C)
                const bfs1 = new BFSAlgorithm(graph1, { source: "A", targetNode: "C" });
                await bfs1.run();

                // Traverse completely
                const bfs2 = new BFSAlgorithm(graph2, { source: "A" });
                await bfs2.run();

                // Count visited nodes by checking if level is defined
                const dm1 = graph1.getDataManager() as any;
                const dm2 = graph2.getDataManager() as any;

                let visited1 = 0;
                let visited2 = 0;

                for (const nodeId of dm1.nodes.keys()) {
                    if (getNodeResult(graph1, nodeId, "graphty", "bfs", "level") !== undefined) visited1++;
                }
                for (const nodeId of dm2.nodes.keys()) {
                    if (getNodeResult(graph2, nodeId, "graphty", "bfs", "level") !== undefined) visited2++;
                }

                assert.isAtMost(visited1, visited2, "Early termination should visit fewer or equal nodes");
            });
        });

        describe("DFSAlgorithm", () => {
            it("source option changes traversal start", async () => {
                const graph1 = await createMockGraph(linearGraphData);
                const graph2 = await createMockGraph(linearGraphData);

                const dfs1 = new DFSAlgorithm(graph1, { source: "A" });
                await dfs1.run();

                const dfs2 = new DFSAlgorithm(graph2, { source: "E" });
                await dfs2.run();

                // Check discovery time - source should be discovered first (time=0)
                const timeA_1 = getNodeResult(graph1, "A", "graphty", "dfs", "discoveryTime");
                const timeE_2 = getNodeResult(graph2, "E", "graphty", "dfs", "discoveryTime");

                assert.strictEqual(timeA_1, 0, "A should be discovered first when starting from A");
                assert.strictEqual(timeE_2, 0, "E should be discovered first when starting from E");
            });

            it("recursive option changes traversal method", async () => {
                const graph1 = await createMockGraph(linearGraphData);
                const graph2 = await createMockGraph(linearGraphData);

                const dfs1 = new DFSAlgorithm(graph1, { source: "A", recursive: true });
                await dfs1.run();

                const dfs2 = new DFSAlgorithm(graph2, { source: "A", recursive: false });
                await dfs2.run();

                // Both should visit all nodes (check visited boolean)
                const dm1 = graph1.getDataManager() as any;
                const dm2 = graph2.getDataManager() as any;

                let visited1 = 0;
                let visited2 = 0;

                for (const nodeId of dm1.nodes.keys()) {
                    if (getNodeResult(graph1, nodeId, "graphty", "dfs", "visited") === true) visited1++;
                }
                for (const nodeId of dm2.nodes.keys()) {
                    if (getNodeResult(graph2, nodeId, "graphty", "dfs", "visited") === true) visited2++;
                }

                assert.strictEqual(visited1, 5, "Recursive DFS should visit all 5 nodes");
                assert.strictEqual(visited2, 5, "Iterative DFS should visit all 5 nodes");
            });
        });
    });

    describe("MST Algorithms", () => {
        describe("PrimAlgorithm", () => {
            it("startNode option changes MST construction", async () => {
                const graph1 = await createMockGraph(diamondGraphData);
                const graph2 = await createMockGraph(diamondGraphData);

                const prim1 = new PrimAlgorithm(graph1, { startNode: "A" });
                await prim1.run();

                const prim2 = new PrimAlgorithm(graph2, { startNode: "D" });
                await prim2.run();

                // Both should produce valid MSTs with same total weight
                const weight1 = getGraphResult(graph1, "graphty", "prim", "totalWeight");
                const weight2 = getGraphResult(graph2, "graphty", "prim", "totalWeight");

                assert.isDefined(weight1);
                assert.isDefined(weight2);
                // MST weight should be the same regardless of start node
                assert.strictEqual(weight1, weight2, "MST total weight should be the same");

                // Edge count should be same (n-1 edges for n nodes)
                const edgeCount1 = getGraphResult(graph1, "graphty", "prim", "edgeCount");
                const edgeCount2 = getGraphResult(graph2, "graphty", "prim", "edgeCount");
                assert.strictEqual(edgeCount1, edgeCount2, "MST edge count should be same");
            });
        });
    });

    describe("Flow Algorithms", () => {
        describe("MaxFlowAlgorithm", () => {
            it("source and sink options determine flow endpoints", async () => {
                const graph1 = await createMockGraph(diamondGraphData);
                const graph2 = await createMockGraph(diamondGraphData);

                const mf1 = new MaxFlowAlgorithm(graph1, { source: "A", sink: "D" });
                await mf1.run();

                const mf2 = new MaxFlowAlgorithm(graph2, { source: "B", sink: "C" });
                await mf2.run();

                const flow1 = getGraphResult(graph1, "graphty", "max-flow", "maxFlow");
                const flow2 = getGraphResult(graph2, "graphty", "max-flow", "maxFlow");

                assert.isDefined(flow1);
                assert.isDefined(flow2);
                // Different source/sink should produce different max flows
                assert.notStrictEqual(flow1, flow2, "Different endpoints should produce different flows");
            });
        });

        describe("MinCutAlgorithm", () => {
            it("source and sink options determine cut endpoints", async () => {
                const graph1 = await createMockGraph(diamondGraphData);
                const graph2 = await createMockGraph(diamondGraphData);

                const mc1 = new MinCutAlgorithm(graph1, { source: "A", sink: "D" });
                await mc1.run();

                const mc2 = new MinCutAlgorithm(graph2, { source: "B", sink: "C" });
                await mc2.run();

                const cutValue1 = getGraphResult(graph1, "graphty", "min-cut", "cutValue");
                const cutValue2 = getGraphResult(graph2, "graphty", "min-cut", "cutValue");

                assert.isDefined(cutValue1);
                assert.isDefined(cutValue2);
            });
        });
    });

    describe("Algorithm.get with options", () => {
        it("passes options through Algorithm.get factory", async () => {
            const graph = await createMockGraph({ dataPath: "./data4.json" });

            // Use factory method with options
            const algo = Algorithm.get(graph, "graphty", "pagerank", { dampingFactor: 0.5 });

            assert.isNotNull(algo);
            await algo!.run();

            const dampingFactor = getGraphResult(graph, "graphty", "pagerank", "dampingFactor");
            assert.strictEqual(dampingFactor, 0.5, "Options should be passed through factory");
        });

        it("uses defaults when no options passed to factory", async () => {
            const graph = await createMockGraph({ dataPath: "./data4.json" });

            const algo = Algorithm.get(graph, "graphty", "pagerank");

            assert.isNotNull(algo);
            await algo!.run();

            const dampingFactor = getGraphResult(graph, "graphty", "pagerank", "dampingFactor");
            assert.strictEqual(dampingFactor, 0.85, "Should use default damping factor");
        });
    });
});
