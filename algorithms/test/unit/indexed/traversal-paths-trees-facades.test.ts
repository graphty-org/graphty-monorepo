/**
 * The legacy traversal, path, component and tree functions that delegate to their `indexed.*` ports,
 * each run THROUGH its facade and compared with a verbatim copy of the code it replaced, on every
 * traversal fixture as built (insertion-order neighbours, numeric ids, self-loops, the empty graph)
 * and, for the weighted functions, with weights moved off the f32 grid. The comparison is exact,
 * including Map and Set iteration order.
 */

import { describe, expect, it } from "vitest";

import {
    condensationGraph,
    connectedComponents,
    getConnectedComponent,
    isConnected,
    isStronglyConnected,
    isWeaklyConnected,
    largestConnectedComponent,
    numberOfConnectedComponents,
    stronglyConnectedComponents,
    weaklyConnectedComponents,
} from "../../../src/algorithms/components/connected.js";
import { kruskalMST, minimumSpanningTree } from "../../../src/algorithms/mst/kruskal.js";
import { hasNegativeCycle } from "../../../src/algorithms/shortest-path/bellman-ford.js";
import { allPairsShortestPath, singleSourceShortestPath } from "../../../src/algorithms/shortest-path/dijkstra.js";
import {
    breadthFirstSearch,
    isBipartite,
    shortestPathBFS,
    singleSourceShortestPathBFS,
} from "../../../src/algorithms/traversal/bfs-unified.js";
import { depthFirstSearch, hasCycleDFS, topologicalSort } from "../../../src/algorithms/traversal/dfs.js";
import { Graph } from "../../../src/core/graph.js";
import type { NodeId } from "../../../src/types/index.js";
import { expectFacadeMatchesLegacy, type FacadeFixture } from "../../helpers/facade-differential.js";
import { legacyResult } from "../../helpers/golden.js";
import { gnm, offGridWeights } from "./port-fixtures.js";
import { directedTraversalFixtures, undirectedTraversalFixtures } from "./traversal-fixtures.js";

/** Weights f32 cannot hold, one NaN and one infinite. */
function oddWeights(): FacadeFixture[] {
    const g = new Graph({ directed: false });
    g.addEdge("a", "b", 0.1);
    g.addEdge("b", "c", Number.NaN);
    g.addEdge("a", "c", 0.2);
    g.addEdge("c", "d", Infinity);
    g.addEdge("b", "d", 0.30000000000000004);
    const d = new Graph({ directed: true });
    d.addEdge("x", "y", Number.NaN);
    d.addEdge("y", "z", 2);
    d.addEdge("z", "x", 0.1);
    d.addEdge("z", "w", 1);
    return [
        { name: "NaN and infinite weights", graph: g },
        { name: "directed cycle with a NaN weight", graph: d },
    ];
}

const [undirectedOdd, directedOdd] = oddWeights();
const undirected = [...undirectedTraversalFixtures(), undirectedOdd];
const directed = [...directedTraversalFixtures(), directedOdd];
const all = [...undirected, ...directed];
const offGrid = (fixtures: FacadeFixture[]): FacadeFixture[] =>
    fixtures.map(({ name, graph }) => ({ name: `${name} (off-grid weights)`, graph: offGridWeights(graph) }));
const weighted = [...all, ...offGrid(all.filter((f) => !f.name.includes("NaN")))];

const ids = (g: Graph): NodeId[] => Array.from(g.nodes(), (n) => n.id);

/** The first, a middle and the last node, each as a separate fixture run. */
function fromEachStart<R>(run: (g: Graph, start: NodeId) => R): (g: Graph) => R[] {
    return (g) => {
        const nodes = ids(g);
        const picks =
            nodes.length === 0 ? [] : [...new Set([nodes[0], nodes[nodes.length >> 1], nodes[nodes.length - 1]])];
        return picks.map((start) => run(g, start));
    };
}

/** Every call's `visitCallback` arguments, in call order, next to the result. */
function withVisits<R>(run: (visit: (node: NodeId, depth: number) => void) => R): { result: R; visits: unknown[] } {
    const visits: unknown[] = [];
    const result = run((node, depth) => visits.push([node, depth]));
    return { result, visits };
}

/** A node in the middle of a fixture's BFS order, or undefined for a graph under three nodes. */
function middleOf(order: NodeId[]): NodeId | undefined {
    return order.length < 3 ? undefined : order[order.length >> 1];
}

describe("breadth-first search facades", () => {
    it("breadthFirstSearch gives legacy's order, visited set, tree and callbacks", () => {
        const run = (bfs: typeof breadthFirstSearch) =>
            fromEachStart((g, start) => withVisits((visitCallback) => bfs(g, start, { visitCallback })));
        expectFacadeMatchesLegacy(all, run(breadthFirstSearch));
    });

    it("breadthFirstSearch stops at a target where legacy does, and ignores one not in the graph", () => {
        const run = (bfs: typeof breadthFirstSearch) =>
            fromEachStart((g, start) => {
                const targetNode = middleOf(legacyResult<TraversalResult>().order);
                return [
                    withVisits((visitCallback) => bfs(g, start, { targetNode, visitCallback })),
                    bfs(g, start, { targetNode: "no such node" }),
                ];
            });
        expectFacadeMatchesLegacy(all, run(breadthFirstSearch));
    });

    it("shortestPathBFS gives legacy's path, distance and predecessor map, or null", () => {
        const run = (sp: typeof shortestPathBFS) => (g: Graph) =>
            fromEachStart((graph, source) => ids(graph).map((target) => sp(graph, source, target)))(g);
        expectFacadeMatchesLegacy(all, run(shortestPathBFS));
    });

    it("singleSourceShortestPathBFS gives legacy's entries in legacy order", () => {
        const run = (sp: typeof singleSourceShortestPathBFS) => fromEachStart((g, source) => sp(g, source));
        expectFacadeMatchesLegacy(all, run(singleSourceShortestPathBFS));
    });

    it("isBipartite agrees with legacy on every undirected fixture", () => {
        expectFacadeMatchesLegacy(undirected, isBipartite);
    });

    it("gives a graph above 10,000 nodes the same answer as a small one", () => {
        // Legacy ran a direction-optimised BFS above 10,000 nodes, whose order within a level, tree
        // and callbacks differed from the standard walk and which ignored targetNode.
        const big = [{ name: "random 10,050 nodes, 20,000 edges", graph: gnm(10_050, 20_000, false, 777) }];
        const target = "n42";
        expectFacadeMatchesLegacy(big, (g) => [
            breadthFirstSearch(g, "n0", { targetNode: target }),
            shortestPathBFS(g, "n0", target),
        ]);
        // Every entry shares one 10,000-entry predecessor map: compare it once, and the rest per entry.
        const flat = (r: ReturnType<typeof singleSourceShortestPathBFS>): unknown => [
            r.get("n1")?.predecessor,
            Array.from(r, ([id, { distance, path }]) => [id, distance, path]),
        ];
        expectFacadeMatchesLegacy(big, (g) => flat(singleSourceShortestPathBFS(g, "n1")));
    });
});

describe("depth-first search facades", () => {
    const optionSets = [{}, { preOrder: false }, { recursive: true }, { recursive: true, preOrder: false }];

    it("depthFirstSearch gives legacy's order, visited set, tree and callbacks under every option", () => {
        const run = (dfs: typeof depthFirstSearch) =>
            fromEachStart((g, start) =>
                optionSets.map((options) =>
                    withVisits((visitCallback) => dfs(g, start, { ...options, visitCallback })),
                ),
            );
        expectFacadeMatchesLegacy(all, run(depthFirstSearch));
    });

    it("depthFirstSearch stops at a target where legacy does, in every mode", () => {
        const run = (dfs: typeof depthFirstSearch) =>
            fromEachStart((g, start) => {
                const targetNode = middleOf(legacyResult<TraversalResult>().order);
                return optionSets.map((options) =>
                    withVisits((visitCallback) => dfs(g, start, { ...options, targetNode, visitCallback })),
                );
            });
        expectFacadeMatchesLegacy(all, run(depthFirstSearch));
    });

    it("hasCycleDFS agrees with legacy", () => {
        expectFacadeMatchesLegacy(all, hasCycleDFS);
    });

    it("topologicalSort gives legacy's order, or null", () => {
        expectFacadeMatchesLegacy(directed, topologicalSort);
    });
});

describe("component facades", () => {
    it("connectedComponents and the functions built on it give legacy's groups in legacy order", () => {
        expectFacadeMatchesLegacy(undirected, (g) => [
            connectedComponents(g),
            numberOfConnectedComponents(g),
            isConnected(g),
            largestConnectedComponent(g),
        ]);
    });

    it("getConnectedComponent gives legacy's members in legacy order from every node", () => {
        expectFacadeMatchesLegacy(undirected, (g) => ids(g).map((id) => getConnectedComponent(g, id)));
    });

    it("weaklyConnectedComponents gives legacy's groups", () => {
        expectFacadeMatchesLegacy(directed, (g) => [weaklyConnectedComponents(g), isWeaklyConnected(g)]);
    });

    it("stronglyConnectedComponents gives legacy's components and members in legacy order", () => {
        expectFacadeMatchesLegacy(directed, (g) => [stronglyConnectedComponents(g), isStronglyConnected(g)]);
    });

    it("condensationGraph gives legacy's component map, components and condensed edges", () => {
        const shape = (r: ReturnType<typeof condensationGraph>): unknown => ({
            componentMap: r.componentMap,
            components: r.components,
            nodes: ids(r.condensedGraph),
            edges: Array.from(r.condensedGraph.edges(), (e) => [e.source, e.target, e.weight]),
        });
        expectFacadeMatchesLegacy(directed, (g) => shape(condensationGraph(g)));
    });
});

/** Directed, with negative weights and no negative cycle; and one with a negative cycle. */
function negativeWeights(): FacadeFixture[] {
    const noCycle = new Graph({ directed: true });
    noCycle.addEdge("a", "b", 4);
    noCycle.addEdge("a", "c", 2);
    noCycle.addEdge("c", "b", -1);
    noCycle.addEdge("b", "d", 3);
    noCycle.addNode("e");
    const cycle = noCycle.clone();
    cycle.addEdge("d", "c", -3);
    cycle.addEdge("e", "a", 1);
    const undirectedNegative = new Graph({ directed: false });
    undirectedNegative.addEdge(1, 2, 1);
    undirectedNegative.addEdge(3, 4, -0.5);
    // f32 rounds 0.99999999 to 1, so only the exact weights see this cycle as negative.
    const belowF32 = new Graph({ directed: true });
    belowF32.addEdge("a", "b", -1);
    belowF32.addEdge("b", "a", 0.99999999);
    const minusInfinity = new Graph({ directed: false });
    minusInfinity.addNode("b");
    minusInfinity.addEdge(2, "b", -Infinity);
    minusInfinity.addEdge("b", "b");
    return [
        { name: "negative weights, no cycle", graph: noCycle },
        { name: "a negative cycle only f64 weights see", graph: belowF32 },
        { name: "undirected, a -Infinity edge beside a self-loop", graph: minusInfinity },
        { name: "negative cycle", graph: cycle },
        { name: "undirected, one negative edge in its own component", graph: undirectedNegative },
    ];
}

describe("shortest path facades", () => {
    it("singleSourceShortestPath gives legacy's distances in legacy order, with and without a cutoff", () => {
        const fixtures = [...weighted, ...negativeWeights()];
        for (const cutoff of [undefined, 0, 1, 2.5, -1]) {
            expectFacadeMatchesLegacy(
                fixtures,
                fromEachStart((g, s) => singleSourceShortestPath(g, s, cutoff)),
            );
        }
    });

    it("allPairsShortestPath gives repeated legacy singleSourceShortestPath", () => {
        expectFacadeMatchesLegacy([...weighted, ...negativeWeights()], allPairsShortestPath);
    });

    it("hasNegativeCycle agrees with legacy", () => {
        expectFacadeMatchesLegacy([...weighted, ...negativeWeights()], hasNegativeCycle);
    });
});

describe("minimum spanning tree facades", () => {
    /** Legacy's result or the message it threw, so a disconnected fixture compares too. */
    const outcome =
        (mst: typeof kruskalMST) =>
        (g: Graph): unknown => {
            try {
                return mst(g);
            } catch (error) {
                return (error as Error).message;
            }
        };

    it("kruskalMST gives legacy's edges (the graph's own objects), order and total, or its error", () => {
        const fixtures = [...offGrid(undirected.slice(0, -1)), ...undirected];
        expectFacadeMatchesLegacy(fixtures, outcome(kruskalMST));
        expectFacadeMatchesLegacy(fixtures, outcome(minimumSpanningTree));
    });

    it("gives legacy's result where two edges' ids spell the same key", () => {
        const collide = new Graph({ directed: false });
        collide.addNode(0);
        collide.addNode(1);
        collide.addEdge(0, 0, 3);
        collide.addEdge("0", 0, 3);
        collide.addEdge("c", "0", 4);
        collide.addEdge(0, "c", 2);
        collide.addEdge(1, "c", 4);
        const disconnects = new Graph({ directed: false });
        disconnects.addEdge(1, 2, 1);
        disconnects.addEdge("1", "2", 1);
        disconnects.addEdge(2, "1", 5);
        const fixtures = [
            { name: '0 and "0"', graph: collide },
            { name: '1-2 and "1"-"2"', graph: disconnects },
        ];
        expectFacadeMatchesLegacy(fixtures, outcome(kruskalMST));
    });

    it("returns the graph's own edge objects, as legacy did", () => {
        const g = offGridWeights(undirected[1].graph);
        for (const edge of kruskalMST(g).edges) {
            expect(g.getEdge(edge.source, edge.target)).toBe(edge);
        }
    });
});
