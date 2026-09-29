/**
 * The flow, cut, matching and isomorphism functions delegate to their `indexed.*` ports. Each is run
 * THROUGH its facade and compared with what the legacy implementation returned on the same input,
 * as recorded in `test/golden/`. The results are equal except where a test below pins a difference:
 *
 * 1. Net flow on opposite directed edges (and on the two directions of an undirected edge).
 * 2. `minSTCut` reports its cut edges on numeric ids.
 * 3. `stoerWagner` adds the weights of two opposite directed edges.
 * 4. `kargerMinCut` is seeded: one graph gives one result.
 * 5. The matchings visit left nodes in node order and neighbours in index order.
 * 6. The matchings ignore arc direction.
 * 7. An isomorphism `edgeMatch` sees every arc and every self-loop.
 *
 * The facades also list every Set and Map in node order and every cut edge list by its source-side
 * node, where legacy listed them in the order its search met them; the comparisons below put the
 * legacy value in node order first and then compare exactly. *
 * Further corrections of legacy defects, outside the seven, are pinned by the last suite of this
 * file, and the comparisons put up with three more: the facades list Sets, Maps and cut edges in
 * node order (the legacy value is reordered first), the flow functions' minCut.edges drop a pair the
 * residual graph held only in reverse (with difference 1), and the maximum matching may pair other
 * nodes at the same size (with difference 5).
 */

import { describe, expect, it, vi } from "vitest";

import {
    type BipartiteMatchingResult,
    greedyBipartiteMatching,
    maximumBipartiteMatching,
} from "../../../src/algorithms/matching/bipartite.js";
import {
    findAllIsomorphisms,
    isGraphIsomorphic,
    type IsomorphismResult,
} from "../../../src/algorithms/matching/isomorphism.js";
import { Graph } from "../../../src/core/graph.js";
import { edmondsKarp, fordFulkerson, type MaxFlowResult } from "../../../src/flow/ford-fulkerson.js";
import { kargerMinCut, type MinCutResult, minSTCut, stoerWagner } from "../../../src/flow/min-cut.js";
import { mulberry32 } from "../../../src/indexed/label-propagation.js";
import { toSnapshotOrNull } from "../../../src/indexed/to-snapshot.js";
import type { NodeId } from "../../../src/types/index.js";
import { graphToMap } from "../../../src/utils/graph-converters.js";
import { expectSame } from "../../helpers/facade-differential.js";
import { legacyResult } from "../../helpers/golden.js";
import { directedFixtures, gnm, offGridWeights, undirectedFixtures } from "./port-fixtures.js";

const FACADES = {
    fordFulkerson,
    edmondsKarp,
    minSTCut,
    stoerWagner,
    kargerMinCut,
    maximumBipartiteMatching,
    greedyBipartiteMatching,
    isGraphIsomorphic,
    findAllIsomorphisms,
};
type Impl = typeof FACADES;

/**
 * The code of the error `call` throws.
 * @param call - The call
 * @returns The thrown error's `code`, or undefined when nothing was thrown
 */
function thrownCode(call: () => unknown): unknown {
    try {
        call();
    } catch (error) {
        return (error as { code?: unknown }).code;
    }
    return undefined;
}

/**
 * The facade's result and the legacy one recorded for this call.
 * @param call - The call, made on the facades
 * @returns Both results
 */
function run<T>(call: (impl: Impl) => T): { actual: T; expected: T } {
    const expected = legacyResult() as T;
    return { actual: call(FACADES), expected };
}

/**
 * Run `body` on a legacy graph frozen with checksums first, so a facade that writes into the
 * snapshot's shared views fails here, and the graph unmutated.
 * @param graph - The graph the facade reads
 * @param body - The comparison
 */
function onGraph(graph: Graph, body: () => void): void {
    const s = toSnapshotOrNull(graph, { checksum: true });
    const mutations = graph.mutationCount;
    body();
    expect(graph.mutationCount).toBe(mutations);
    s?.validate({ checksum: true });
}

/** Node ids of `graph` as strings, in node order. */
function nodeOrder(graph: Graph | Map<string, Map<string, number>>): string[] {
    const ids =
        graph instanceof Map
            ? [...graph.keys(), ...[...graph.values()].flatMap((row) => [...row.keys()])]
            : [...graph.nodes()].map((n) => String(n.id));
    return [...new Set(ids)];
}

/** `set`'s members in `order`, which must hold them all. */
function inOrder<T>(set: Set<T>, order: readonly T[]): Set<T> {
    const sorted = order.filter((x) => set.has(x));
    expect(sorted.length).toBe(set.size);
    return new Set(sorted);
}

/** `map`'s entries with keys in `order`. */
function mapInOrder<K, V>(map: Map<K, V>, order: readonly K[]): Map<K, V> {
    const out = new Map<K, V>();
    for (const k of order) {
        if (map.has(k)) {
            out.set(k, map.get(k) as V);
        }
    }
    expect(out.size).toBe(map.size);
    return out;
}

/**
 * Cut edges ordered by their two ends in `order`, then by the order they were listed in. Both sides
 * of a comparison go through this: legacy listed a node's cut edges in its adjacency order, the
 * facades in edge order.
 */
function edgesInOrder<E>(
    edges: readonly E[],
    ends: (e: E) => readonly [string, string],
    order: readonly string[],
): E[] {
    const rank = new Map(order.map((id, i) => [id, i]));
    const key = (e: E): [number, number] => {
        const [u, v] = ends(e);
        return [rank.get(u) ?? -1, rank.get(v) ?? -1];
    };
    return edges
        .map((e, i) => ({ e, i, k: key(e) }))
        .sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1] || a.i - b.i)
        .map(({ e }) => e);
}

// ---------------------------------------------------------------- flow

function clrs(): Graph {
    const g = new Graph({ directed: true });
    for (const [u, v, w] of [
        ["s", "v1", 16],
        ["s", "v2", 13],
        ["v2", "v1", 4],
        ["v1", "v3", 12],
        ["v3", "v2", 9],
        ["v2", "v4", 14],
        ["v4", "v3", 7],
        ["v3", "t", 20],
        ["v4", "t", 4],
    ] as const) {
        g.addEdge(u, v, w);
    }
    return g;
}

function numericIds(directed: boolean): Graph {
    const g = new Graph({ directed });
    for (const [u, v, w] of [
        [0, 1, 3],
        [0, 2, 2],
        [1, 2, 1],
        [1, 3, 2],
        [2, 3, 4],
        [3, 4, 5],
    ]) {
        g.addEdge(u, v, w);
    }
    g.addNode(5);
    return g;
}

/** Zero and negative capacities: legacy listed such an edge leaving the source side as cut. */
function nonPositiveCapacities(): Graph {
    const g = new Graph({ directed: true });
    g.addEdge("s", "a", 2);
    g.addEdge("a", "t", 0);
    g.addEdge("s", "b", -1);
    g.addEdge("b", "t", 3);
    g.addEdge("s", "t", 1);
    return g;
}

interface FlowFixture {
    readonly name: string;
    readonly graph: Graph;
    readonly pairs: readonly (readonly [string, string])[];
}

function flowFixtures(): FlowFixture[] {
    const ends = (graph: Graph): [string, string] => {
        const ids = nodeOrder(graph);
        return [ids[0], ids[ids.length - 1]];
    };
    return [
        {
            name: "CLRS network",
            graph: clrs(),
            pairs: [
                ["s", "t"],
                ["v1", "t"],
                ["t", "s"],
            ],
        },
        {
            name: "numeric ids passed as strings",
            graph: numericIds(true),
            pairs: [
                ["0", "4"],
                ["1", "3"],
                ["0", "5"],
            ],
        },
        { name: "undirected numeric ids", graph: numericIds(false), pairs: [["0", "4"]] },
        { name: "zero and negative capacities", graph: nonPositiveCapacities(), pairs: [["s", "t"]] },
        { name: "off-grid weights", graph: offGridWeights(clrs()), pairs: [["s", "t"]] },
        ...[...undirectedFixtures(), ...directedFixtures()].map(({ name, graph }) => ({
            name,
            graph,
            pairs: [ends(graph)],
        })),
    ];
}

/**
 * The legacy flow graph with every pair of opposite entries replaced by its net flow, on the entry
 * it runs along: what the facade reports (difference 1).
 */
function netted(flowGraph: Map<string, Map<string, number>>): Map<string, Map<string, number>> {
    const out = new Map<string, Map<string, number>>();
    for (const [u, row] of flowGraph) {
        const netRow = new Map<string, number>();
        for (const [v, f] of row) {
            const back = flowGraph.get(v)?.get(u);
            netRow.set(v, back === undefined ? f : Math.max(f - back, 0));
        }
        out.set(u, netRow);
    }
    return out;
}

/** Whether `graph` has an edge from `u` to `v` (either way when undirected). */
function hasEdge(graph: Graph | Map<string, Map<string, number>>, u: string, v: string): boolean {
    if (graph instanceof Map) {
        return graph.get(u)?.has(v) ?? false;
    }
    const id = (x: string): NodeId => [...graph.nodes()].find((n) => String(n.id) === x)?.id ?? x;
    return graph.hasEdge(id(u), id(v));
}

/** The legacy max-flow result in the facade's form: net flows, node order, graph edges only. */
function flowAsFacade(expected: MaxFlowResult, graph: Graph | Map<string, Map<string, number>>): MaxFlowResult {
    if (expected.minCut === undefined) {
        return expected;
    }
    const order = nodeOrder(graph);
    // A pair the residual graph held only in reverse is not an edge; legacy listed it when flow
    // had once run the other way (difference 1).
    const edges = expected.minCut.edges.filter(([u, v]) => hasEdge(graph, u, v));
    return {
        maxFlow: expected.maxFlow,
        flowGraph: netted(expected.flowGraph),
        minCut: {
            source: inOrder(expected.minCut.source, order),
            sink: inOrder(expected.minCut.sink, order),
            edges: edgesInOrder(edges, (e) => e, order),
        },
    };
}

/** A max-flow result with its cut edges put in `edgesInOrder` order. */
function flowEdgesSorted(r: MaxFlowResult, graph: Graph | Map<string, Map<string, number>>): MaxFlowResult {
    return r.minCut === undefined
        ? r
        : { ...r, minCut: { ...r.minCut, edges: edgesInOrder(r.minCut.edges, (e) => e, nodeOrder(graph)) } };
}

describe("fordFulkerson and edmondsKarp facades", () => {
    for (const name of ["fordFulkerson", "edmondsKarp"] as const) {
        for (const fixture of flowFixtures()) {
            it(`${name}: ${fixture.name}`, () => {
                onGraph(fixture.graph, () => {
                    for (const [source, sink] of fixture.pairs) {
                        const { actual, expected } = run((f) => f[name](fixture.graph, source, sink));
                        expectSame(
                            flowEdgesSorted(actual, fixture.graph),
                            flowAsFacade(expected, fixture.graph),
                            0,
                            `${source} -> ${sink}`,
                        );
                    }
                });
            });
        }
    }

    it("edmondsKarp on a Map-of-Maps", () => {
        const map = graphToMap(gnm(30, 80, false, 4242, true));
        const { actual, expected } = run((f) => f.edmondsKarp(map, "n0", "n29"));
        expectSame(flowEdgesSorted(actual, map), flowAsFacade(expected, map), 0, "map");
    });

    it("returns no flow and no cut when the source or the sink is missing", () => {
        for (const [source, sink] of [
            ["s", "nowhere"],
            ["nowhere", "t"],
        ]) {
            const { actual, expected } = run((f) => f.fordFulkerson(clrs(), source, sink));
            expectSame(actual, expected, 0, `${source} -> ${sink}`);
        }
    });

    it("refuses a source equal to the sink, where legacy never returned", () => {
        expect(() => fordFulkerson(clrs(), "s", "s")).toThrow(RangeError);
        expect(() => edmondsKarp(clrs(), "s", "s")).toThrow(RangeError);
    });

    it("difference 1: reports the net flow of two opposite directed edges, each within its capacity", () => {
        const g = new Graph({ directed: true });
        for (const [u, v, w] of [
            ["s", "a", 2],
            ["s", "b", 2],
            ["a", "b", 1],
            ["b", "a", 1],
            ["a", "t", 1],
            ["b", "t", 3],
        ] as const) {
            g.addEdge(u, v, w);
        }
        for (const name of ["fordFulkerson", "edmondsKarp"] as const) {
            const { actual, expected } = run((f) => f[name](g, "s", "t"));
            const flow = (r: MaxFlowResult, u: string, v: string): number => r.flowGraph.get(u)?.get(v) ?? 0;
            expect(actual.maxFlow).toBe(expected.maxFlow);
            expect(flow(actual, "a", "b") - flow(actual, "b", "a")).toBe(
                flow(expected, "a", "b") - flow(expected, "b", "a"),
            );
            for (const [u, v] of [
                ["a", "b"],
                ["b", "a"],
            ]) {
                expect(flow(actual, u, v)).toBeLessThanOrEqual(1);
            }
            expect(Math.min(flow(actual, "a", "b"), flow(actual, "b", "a"))).toBe(0);
            expectSame(flowEdgesSorted(actual, g), flowAsFacade(expected, g), 0, name);
        }
    });
});

// ---------------------------------------------------------------- minimum s-t cut

/** A minimum cut with its cut edges put in `edgesInOrder` order. */
function cutEdgesSorted(r: MinCutResult, graph: Graph | Map<string, Map<string, number>>): MinCutResult {
    return { ...r, cutEdges: edgesInOrder(r.cutEdges, (c) => [c.from, c.to], nodeOrder(graph)) };
}

/** The legacy minimum cut in the facade's node order. */
function cutAsFacade(expected: MinCutResult, graph: Graph | Map<string, Map<string, number>>): MinCutResult {
    const order = nodeOrder(graph);
    return {
        cutValue: expected.cutValue,
        partition1: inOrder(expected.partition1, order),
        partition2: inOrder(expected.partition2, order),
        cutEdges: edgesInOrder(expected.cutEdges, (c) => [c.from, c.to], order),
    };
}

describe("minSTCut facade", () => {
    for (const fixture of flowFixtures()) {
        it(fixture.name, () => {
            onGraph(fixture.graph, () => {
                for (const [source, sink] of fixture.pairs) {
                    const { actual, expected } = run((f) => f.minSTCut(fixture.graph, source, sink));
                    if (typeof fixture.graph.nodes().next().value?.id === "number") {
                        // Difference 2: legacy looked each cut edge up by its string id, missed, and
                        // reported none.
                        expect(expected.cutEdges).toEqual([]);
                        expect(actual.cutEdges.length > 0).toBe(actual.cutValue > 0);
                        expect(actual.cutEdges.reduce((sum, c) => sum + c.weight, 0)).toBe(actual.cutValue);
                        expectSame(
                            actual,
                            { ...cutAsFacade(expected, fixture.graph), cutEdges: actual.cutEdges },
                            0,
                            "",
                        );
                    } else {
                        expectSame(
                            cutEdgesSorted(actual, fixture.graph),
                            cutAsFacade(expected, fixture.graph),
                            0,
                            `${source} -> ${sink}`,
                        );
                    }
                }
            });
        });
    }

    it("difference 2: lists the cut edges of a graph with numeric ids", () => {
        const { actual, expected } = run((f) => f.minSTCut(numericIds(true), "0", "4"));
        expect(expected.cutEdges).toEqual([]);
        expect(actual.cutValue).toBe(5);
        expect(actual.cutEdges).toEqual([
            { from: "0", to: "1", weight: 3 },
            { from: "0", to: "2", weight: 2 },
        ]);
    });

    it("returns an empty cut when the source or the sink is missing", () => {
        const { actual, expected } = run((f) => f.minSTCut(clrs(), "s", "nowhere"));
        expectSame(actual, expected, 0, "");
    });
});

// ---------------------------------------------------------------- global minimum cuts

function weightedNonF32(): Graph {
    const g = new Graph({ directed: false });
    for (const [u, v, w] of [
        ["a", "b", 0.3],
        ["a", "c", 0.7],
        ["b", "c", 0.45],
        ["c", "d", 0.15],
        ["d", "e", 0.6],
        ["d", "f", 0.35],
        ["e", "f", 0.9],
    ] as const) {
        g.addEdge(u, v, w);
    }
    return g;
}

/** Directed, with no two opposite edges. */
function directedChain(): Graph {
    const g = new Graph({ directed: true });
    for (const [u, v, w] of [
        ["x", "y", 4],
        ["y", "z", 1],
        ["z", "x", 3],
        ["z", "w", 2],
        ["w", "v", 6],
        ["v", "z", 1],
    ] as const) {
        g.addEdge(u, v, w);
    }
    return g;
}

function globalCutFixtures(): { name: string; graph: Graph }[] {
    return [
        ...undirectedFixtures(),
        { name: "weights that are not f32-exact", graph: weightedNonF32() },
        { name: "numeric ids", graph: numericIds(false) },
        { name: "directed, read as undirected", graph: directedChain() },
        { name: "random 50 nodes, 150 weighted edges", graph: gnm(50, 150, false, 31337, true) },
    ];
}

describe("stoerWagner facade", () => {
    for (const { name, graph } of globalCutFixtures()) {
        it(name, () => {
            onGraph(graph, () => {
                const { actual, expected } = run((f) => f.stoerWagner(graph));
                expectSame(cutEdgesSorted(actual, graph), cutAsFacade(expected, graph), 0, name);
            });
        });
    }

    it("on a Map-of-Maps listing every edge both ways", () => {
        const map = graphToMap(weightedNonF32());
        const { actual, expected } = run((f) => f.stoerWagner(map));
        expectSame(cutEdgesSorted(actual, map), cutAsFacade(expected, map), 0, "map");
    });

    it("on a graph of one node", () => {
        const g = new Graph({ directed: false });
        g.addNode("only");
        const { actual, expected } = run((f) => f.stoerWagner(g));
        expectSame(actual, expected, 0, "");
    });

    it("difference 3: adds the weights of two opposite directed edges", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 2);
        g.addEdge("b", "a", 3);
        g.addEdge("b", "c", 10);
        g.addEdge("c", "b", 10);
        const { actual, expected } = run((f) => f.stoerWagner(g));
        // Legacy kept the last weight it read of each pair: a-b weighed 3.
        expect(expected.cutValue).toBe(3);
        expect(actual.cutValue).toBe(5);
        // Both edges of the pair cross the cut, each listed from the side holding b and c.
        expect(actual.partition2).toEqual(new Set(["a"]));
        expect(actual.cutEdges).toEqual([
            { from: "b", to: "a", weight: 2 },
            { from: "b", to: "a", weight: 3 },
        ]);
    });
});

describe("kargerMinCut facade", () => {
    /**
     * The legacy result, recorded with `Math.random` replaced by a seeded generator so the record is
     * one run's, and the facade's.
     */
    function runKarger(
        graph: Graph | Map<string, Map<string, number>>,
        iterations: number,
    ): { actual: MinCutResult; expected: MinCutResult } {
        const random = vi.spyOn(Math, "random").mockImplementation(mulberry32(1));
        try {
            return run((f) => f.kargerMinCut(graph, iterations));
        } finally {
            random.mockRestore();
        }
    }

    // Difference 4: legacy drew from Math.random, the facade from a fixed seed, so only the minimum
    // both find with enough trials is comparable. It is the Stoer-Wagner value.
    for (const { name, graph } of [
        ...undirectedFixtures().filter((f) => f.graph.nodeCount <= 34),
        { name: "numeric ids", graph: numericIds(false) },
        { name: "weights that are not f32-exact", graph: weightedNonF32() },
    ]) {
        it(`finds the legacy minimum: ${name}`, () => {
            onGraph(graph, () => {
                const { actual, expected } = runKarger(graph, 300);
                expect(actual.cutValue).toBe(expected.cutValue);
                expect(actual.cutValue).toBe(stoerWagner(graph).cutValue);
                expect(actual.cutEdges.reduce((sum, c) => sum + c.weight, 0)).toBe(actual.cutValue);
                expect([...actual.partition1, ...actual.partition2].sort()).toEqual(nodeOrder(graph).sort());
            });
        });
    }

    it("finds the legacy minimum on a Map-of-Maps", () => {
        const map = graphToMap(weightedNonF32());
        const { actual, expected } = runKarger(map, 300);
        expect(actual.cutValue).toBe(expected.cutValue);
    });

    it("difference 4: gives one result on every run", () => {
        const graph = gnm(40, 120, false, 12345, true);
        expectSame(kargerMinCut(graph, 20), kargerMinCut(graph, 20), 0, "second run");
    });

    it("on a graph of one node", () => {
        const g = new Graph({ directed: false });
        g.addNode("only");
        const { actual, expected } = runKarger(g, 5);
        expectSame(actual, expected, 0, "");
    });

    it("rounds a fractional trial count up and returns an infinite cut for none, as legacy did", () => {
        const path = fromPairs(false, "a-b b-c");
        expectSame(kargerMinCut(path, 2.5), kargerMinCut(path, 3), 0, "2.5 trials");
        for (const iterations of [0, -1, Number.NaN]) {
            expect(kargerMinCut(path, iterations)).toEqual({
                cutValue: Infinity,
                partition1: new Set(),
                partition2: new Set(),
                cutEdges: [],
            });
        }
    });
});

// ---------------------------------------------------------------- matching

function randomBipartite(left: number, right: number, edges: number, seed: number): Graph {
    const g = new Graph({ directed: false });
    const random = mulberry32(seed);
    for (let i = 0; i < Math.max(left, right); i++) {
        if (i < right) {
            g.addNode(`r${i}`);
        }
        if (i < left) {
            g.addNode(`l${i}`);
        }
    }
    for (let added = 0, guard = 0; added < edges && guard < edges * 100; guard++) {
        const u = `l${Math.floor(random() * left)}`;
        const v = `r${Math.floor(random() * right)}`;
        if (!g.hasEdge(u, v)) {
            g.addEdge(u, v);
            added++;
        }
    }
    return g;
}

/**
 * A bipartite graph whose node order is sorted and whose every node meets its neighbours in index
 * order, so the legacy visiting order and the facade's coincide.
 */
function sortedBipartite(): Graph {
    const g = new Graph({ directed: false });
    const left = ["a0", "a1", "a2", "a3", "a4"];
    const right = ["b0", "b1", "b2", "b3"];
    for (const id of [...left, ...right]) {
        g.addNode(id);
    }
    for (const [u, v] of [
        ["a0", "b0"],
        ["a0", "b1"],
        ["a1", "b0"],
        ["a2", "b1"],
        ["a2", "b2"],
        ["a3", "b2"],
        ["a3", "b3"],
        ["a4", "b3"],
    ]) {
        g.addEdge(u, v);
    }
    return g;
}

function sidesOf(graph: Graph): { leftNodes: Set<NodeId>; rightNodes: Set<NodeId> } {
    const ids = [...graph.nodes()].map((n) => n.id);
    return {
        leftNodes: new Set(ids.filter((id) => /^[la]/.test(String(id)))),
        rightNodes: new Set(ids.filter((id) => /^[rb]/.test(String(id)))),
    };
}

/** Every pair is an edge, left to right, and no node is used twice. */
function expectValidMatching(graph: Graph, result: BipartiteMatchingResult): void {
    const used = new Set<NodeId>();
    for (const [u, v] of result.matching) {
        expect(graph.hasEdge(u, v) || graph.hasEdge(v, u)).toBe(true);
        expect(used.has(u) || used.has(v)).toBe(false);
        used.add(u);
        used.add(v);
    }
    expect(result.matching.size).toBe(result.size);
    // Left nodes in node order (difference 5).
    const order = [...graph.nodes()].map((n) => n.id);
    expect([...result.matching.keys()]).toEqual(order.filter((id) => result.matching.has(id)));
}

const matchingFixtures: readonly { name: string; graph: () => Graph }[] = [
    { name: "sorted bipartite", graph: sortedBipartite },
    { name: "random bipartite 30 x 25, 70 edges", graph: () => randomBipartite(30, 25, 70, 11) },
    { name: "random bipartite 60 x 60, 90 edges", graph: () => randomBipartite(60, 60, 90, 4242) },
];

describe("maximumBipartiteMatching facade", () => {
    for (const { name, graph } of matchingFixtures) {
        for (const given of [false, true]) {
            it(`${name}, sides ${given ? "given" : "inferred"}`, () => {
                const g = graph();
                onGraph(g, () => {
                    const { actual, expected } = run((f) => f.maximumBipartiteMatching(g, given ? sidesOf(g) : {}));
                    // Difference 5: which pairs a maximum matching holds depends on the visiting
                    // order; its size does not.
                    expect(actual.size).toBe(expected.size);
                    expectValidMatching(g, actual);
                });
            });
        }
    }

    it("throws on a graph that is not bipartite, as legacy does", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        g.addEdge("c", "a");
        expect(() => run((f) => f.maximumBipartiteMatching(g))).toThrow("Graph is not bipartite");
        expect(() => maximumBipartiteMatching(g)).toThrow("Graph is not bipartite");
        expect(() => greedyBipartiteMatching(g)).toThrow("Graph is not bipartite");
    });

    it("difference 6: joins a left node to a right one whichever way the arc points", () => {
        const g = new Graph({ directed: true });
        for (const id of ["l0", "l1", "l2", "r0", "r1", "r2"]) {
            g.addNode(id);
        }
        for (const [u, v] of [
            ["r0", "l0"],
            ["r1", "l0"],
            ["r1", "l1"],
            ["r2", "l2"],
        ]) {
            g.addEdge(u, v);
        }
        const sides = sidesOf(g);
        for (const name of ["maximumBipartiteMatching", "greedyBipartiteMatching"] as const) {
            const { actual, expected } = run((f) => f[name](g, sides));
            // Legacy followed out-arcs of left nodes only, and every arc here points into one.
            expect(expected.size).toBe(0);
            expect(actual.size).toBe(3);
            expectValidMatching(g, actual);
        }
    });
});

describe("greedyBipartiteMatching facade", () => {
    it("equals legacy where the two visiting orders coincide", () => {
        const g = sortedBipartite();
        onGraph(g, () => {
            const { actual, expected } = run((f) => f.greedyBipartiteMatching(g, sidesOf(g)));
            expectSame(actual, expected, 0, "");
        });
    });

    for (const { name, graph } of matchingFixtures) {
        it(`difference 5: visits in node and index order: ${name}`, () => {
            const g = graph();
            onGraph(g, () => {
                const { actual, expected } = run((f) => f.greedyBipartiteMatching(g));
                expectValidMatching(g, actual);
                // Maximal, so at least half the maximum, and the same on every run.
                expect(2 * actual.size).toBeGreaterThanOrEqual(maximumBipartiteMatching(g).size);
                expect(2 * expected.size).toBeGreaterThanOrEqual(maximumBipartiteMatching(g).size);
                expectSame(greedyBipartiteMatching(g), actual, 0, "second run");
            });
        });
    }

    it("difference 5: can match fewer pairs than legacy when its order is less lucky", () => {
        const g = new Graph({ directed: false });
        // l0 meets r1 first in insertion order but r0 first in index order; l1 has only r0.
        for (const id of ["l0", "l1", "r0", "r1"]) {
            g.addNode(id);
        }
        g.addEdge("l0", "r1");
        g.addEdge("l0", "r0");
        g.addEdge("l1", "r0");
        const { actual, expected } = run((f) => f.greedyBipartiteMatching(g, sidesOf(g)));
        expect(expected.size).toBe(2);
        expect(actual.size).toBe(1);
        expect(actual.matching).toEqual(new Map([["l0", "r0"]]));
    });
});

// ---------------------------------------------------------------- isomorphism

/** An isomorphic copy of `graph` under ids `x<id>`, nodes and edges inserted in reverse. */
function relabelled(graph: Graph): Graph {
    const out = new Graph({ directed: graph.isDirected });
    for (const node of [...graph.nodes()].reverse()) {
        out.addNode(`x${String(node.id)}`);
    }
    for (const edge of [...graph.edges()].reverse()) {
        out.addEdge(`x${String(edge.source)}`, `x${String(edge.target)}`, edge.weight);
    }
    return out;
}

function fromPairs(directed: boolean, pairs: string): Graph {
    const g = new Graph({ directed });
    for (const pair of pairs.split(" ")) {
        const [u, v, w] = pair.split("-");
        g.addEdge(u, v, w === undefined ? 1 : Number(w));
    }
    return g;
}

const PETERSEN = "0-1 1-2 2-3 3-4 4-0 0-5 1-6 2-7 3-8 4-9 5-7 7-9 9-6 6-8 8-5";

const isomorphismFixtures: readonly { name: string; graph: () => Graph }[] = [
    { name: "six-cycle", graph: () => fromPairs(false, "a-b b-c c-d d-e e-f f-a") },
    { name: "Petersen graph", graph: () => fromPairs(false, PETERSEN) },
    { name: "path of six", graph: () => fromPairs(false, "a-b b-c c-d d-e e-f") },
    { name: "random 12 nodes, 20 edges", graph: () => gnm(12, 20, false, 31337) },
    { name: "directed hub, three targets, two sources", graph: () => fromPairs(true, "h-a h-b h-c d-h e-h") },
    { name: "random directed 10 nodes, 18 arcs", graph: () => gnm(10, 18, true, 99) },
];

describe("isGraphIsomorphic and findAllIsomorphisms facades", () => {
    for (const { name, graph } of isomorphismFixtures) {
        it(name, () => {
            const g1 = graph();
            const g2 = relabelled(g1);
            const order = [...g1.nodes()].map((n) => n.id);
            onGraph(g1, () => {
                const one = run((f) => f.isGraphIsomorphic(g1, g2));
                const expected: IsomorphismResult = { ...one.expected };
                if (expected.mapping !== undefined) {
                    expected.mapping = mapInOrder(expected.mapping, order);
                }
                expectSame(one.actual, expected, 0, "isGraphIsomorphic");

                const all = run((f) => f.findAllIsomorphisms(g1, g2));
                expectSame(
                    all.actual,
                    all.expected.map((m) => mapInOrder(m, order)),
                    0,
                    "findAllIsomorphisms",
                );
            });
        });
    }

    it("with a node predicate", () => {
        const g1 = fromPairs(false, PETERSEN);
        const g2 = relabelled(g1);
        const parity = (id: NodeId): number => Number(String(id).replace("x", "")) % 2;
        const options = { nodeMatch: (a: NodeId, b: NodeId) => parity(a) === parity(b) };
        const order = [...g1.nodes()].map((n) => n.id);
        const all = run((f) => f.findAllIsomorphisms(g1, g2, options));
        expect(all.actual.length).toBeGreaterThan(0);
        expectSame(
            all.actual,
            all.expected.map((m) => mapInOrder(m, order)),
            0,
            "",
        );
    });

    it("with an edge predicate on an undirected graph without self-loops", () => {
        const g1 = fromPairs(false, "a-b-1 b-c-2 c-d-1 d-e-2 e-f-1 f-a-2");
        const g2 = relabelled(g1);
        const weight = (g: Graph, [u, v]: [NodeId, NodeId]): number | undefined => g.getEdge(u, v)?.weight;
        const options = {
            edgeMatch: (e1: [NodeId, NodeId], e2: [NodeId, NodeId], a: Graph, b: Graph) =>
                weight(a, e1) === weight(b, e2),
        };
        const order = [...g1.nodes()].map((n) => n.id);
        const all = run((f) => f.findAllIsomorphisms(g1, g2, options));
        expect(all.actual).toHaveLength(6);
        expectSame(
            all.actual,
            all.expected.map((m) => mapInOrder(m, order)),
            0,
            "",
        );
    });

    it("difference 7: an edge predicate on a directed graph sees an arc into the newly mapped node", () => {
        // An out-star with two differently weighted arcs. Legacy maps h first and then compares only
        // the out-arcs of each newly mapped leaf -- it has none -- so it never saw the weights.
        const g = fromPairs(true, "h-x-1 h-y-2");
        const seen: string[] = [];
        const options = {
            edgeMatch: ([u, v]: [NodeId, NodeId], e2: [NodeId, NodeId], a: Graph, b: Graph) => {
                seen.push(`${String(u)}${String(v)}`);
                return a.getEdge(u, v)?.weight === b.getEdge(e2[0], e2[1])?.weight;
            },
        };
        const all = run((f) => f.findAllIsomorphisms(g, g, options));
        expect(all.expected).toHaveLength(2);
        expect(all.actual).toEqual([
            new Map([
                ["h", "h"],
                ["x", "x"],
                ["y", "y"],
            ]),
        ]);
        expect(new Set(seen)).toEqual(new Set(["hx", "hy"]));
    });

    it("difference 7: an edge predicate sees self-loops", () => {
        const loop = (w: number): Graph => {
            const g = new Graph({ directed: false, allowSelfLoops: true });
            g.addEdge("a", "a", w);
            g.addEdge("a", "b", 5);
            return g;
        };
        const byWeight = {
            edgeMatch: (e1: [NodeId, NodeId], e2: [NodeId, NodeId], a: Graph, b: Graph) =>
                a.getEdge(e1[0], e1[1])?.weight === b.getEdge(e2[0], e2[1])?.weight,
        };
        const { actual, expected } = run((f) => f.isGraphIsomorphic(loop(1), loop(2), byWeight));
        expect(expected.isIsomorphic).toBe(true);
        expect(actual).toEqual({ isIsomorphic: false });
    });

    it("finds none between graphs with the same degrees that are not isomorphic", () => {
        const cycle = fromPairs(false, "a-b b-c c-d d-e e-f f-a");
        const triangles = fromPairs(false, "a-b b-c c-a d-e e-f f-d");
        const one = run((f) => f.isGraphIsomorphic(cycle, triangles));
        expectSame(one.actual, one.expected, 0, "isGraphIsomorphic");
        const all = run((f) => f.findAllIsomorphisms(cycle, triangles));
        expectSame(all.actual, all.expected, 0, "findAllIsomorphisms");
    });

    it("finds none across directedness", () => {
        const { actual, expected } = run((f) =>
            f.isGraphIsomorphic(fromPairs(false, "a-b b-c"), fromPairs(true, "a-b b-c")),
        );
        expectSame(actual, expected, 0, "");
    });

    it("gives two empty graphs the empty mapping", () => {
        const empty = new Graph({ directed: false });
        const one = run((f) => f.isGraphIsomorphic(empty, empty));
        expectSame(one.actual, one.expected, 0, "isGraphIsomorphic");
        const all = run((f) => f.findAllIsomorphisms(empty, empty));
        expectSame(all.actual, all.expected, 0, "findAllIsomorphisms");
    });
});

// ---------------------------------------------------------------- corrections outside the seven

/**
 * Results that differ from 2.x outside the seven accepted differences. Each is a correction of a
 * legacy defect. The legacy values in the comments were taken by running the 2.x code on the same
 * input; none is in the recorded results, because the suites stopped calling the legacy code.
 */
describe("corrections the seven differences do not name", () => {
    it("edmondsKarp on a Map-of-Maps finds flow to a sink that is only a target", () => {
        // Legacy returned { maxFlow: 0, flowGraph: empty } because t is not a key of the Map.
        const map = new Map([
            ["s", new Map([["a", 3], ["t", 2]])],
            ["a", new Map([["t", 4]])],
        ]);
        const r = edmondsKarp(map, "s", "t");
        expect(r.maxFlow).toBe(5);
        expect([...r.flowGraph.keys()]).toEqual(["s", "a", "t"]);
        expect(r.flowGraph.get("t")).toEqual(new Map());
    });

    it("minSTCut refuses a source equal to the sink, where legacy never returned", () => {
        expect(() => minSTCut(clrs(), "s", "s")).toThrow(RangeError);
    });

    it("a NaN weight throws E_INVALID_WEIGHT from every weighted flow and cut facade", () => {
        // Legacy read a NaN capacity as no capacity in the flow functions, and stoerWagner never
        // returned on one.
        const directed = fromPairs(true, "s-a a-t");
        directed.addEdge("s", "t", Number.NaN);
        const undirected = fromPairs(false, "a-b b-c");
        undirected.addEdge("a", "c", Number.NaN);
        expect(thrownCode(() => fordFulkerson(directed, "s", "t"))).toBe("E_INVALID_WEIGHT");
        expect(thrownCode(() => edmondsKarp(directed, "s", "t"))).toBe("E_INVALID_WEIGHT");
        expect(thrownCode(() => minSTCut(directed, "s", "t"))).toBe("E_INVALID_WEIGHT");
        expect(thrownCode(() => stoerWagner(undirected))).toBe("E_INVALID_WEIGHT");
        expect(thrownCode(() => kargerMinCut(undirected, 5))).toBe("E_INVALID_WEIGHT");
    });

    it("kargerMinCut puts every node on a side when there are three or more components", () => {
        // Legacy stopped at the first two groups it held: partition2 was { c, d } and e, f were lost.
        const r = kargerMinCut(fromPairs(false, "a-b c-d e-f"), 5);
        expect(r.cutValue).toBe(0);
        expect(r.partition1).toEqual(new Set(["a", "b"]));
        expect(r.partition2).toEqual(new Set(["c", "d", "e", "f"]));
    });

    it("kargerMinCut reads an asymmetric Map-of-Maps as undirected", () => {
        // Legacy read only u < v entries of each row, never saw c -> b, and returned a cut of 0 with b
        // on neither side.
        const map = new Map([
            ["a", new Map([["b", 2]])],
            ["c", new Map([["b", 1]])],
        ]);
        const r = kargerMinCut(map, 20);
        expect(r.cutValue).toBe(1);
        expect([...r.partition1, ...r.partition2].sort()).toEqual(["a", "b", "c"]);
    });

    it("a Map-of-Maps with two weights for one pair keeps the last entry read", () => {
        // a -> b weighs 1 and b -> a weighs 5. stoerWagner gave 2 in legacy too; legacy kargerMinCut
        // read a -> b (the u < v entry) and cut a off for 1.
        const map = new Map([
            ["a", new Map([["b", 1]])],
            ["b", new Map([["a", 5], ["c", 2]])],
            ["c", new Map([["b", 2]])],
        ]);
        expect(stoerWagner(map).cutValue).toBe(2);
        const r = kargerMinCut(map, 50);
        expect(r.cutValue).toBe(2);
        expect(r.partition2).toEqual(new Set(["c"]));
    });

    it("isomorphism on directed graphs checks the arcs into each newly mapped node", () => {
        // Legacy compared only the out-arcs of the new node, so it called these two isomorphic with a
        // mapping (n0 <-> n1) that turns n1 -> n4 into n0 -> n4, an arc g2 lacks.
        const g1 = fromPairs(true, "n0-n1 n2-n3 n0-n3 n0-n2 n1-n4 n1-n3");
        const g2 = fromPairs(true, "n1-n0 n2-n3 n0-n3 n0-n2 n1-n4 n1-n3");
        expect(isGraphIsomorphic(g1, g2)).toEqual({ isIsomorphic: false });
        expect(findAllIsomorphisms(g1, g2)).toEqual([]);

        // Legacy found two automorphisms here, one swapping n1 and n4, which breaks n0 -> n1.
        const g = fromPairs(true, "n0-n3 n0-n1 n0-n5 n3-n5 n3-n4 n5-n3 n5-n0");
        const all = findAllIsomorphisms(g, g);
        expect(all).toHaveLength(1);
        for (const m of all) {
            for (const e of g.edges()) {
                expect(g.hasEdge(m.get(e.source) as NodeId, m.get(e.target) as NodeId)).toBe(true);
            }
        }
    });

    it("isGraphIsomorphic ignores findAllMappings", () => {
        // Legacy searched on past every complete mapping with findAllMappings set and so always
        // answered false.
        const tri = fromPairs(false, "a-b b-c c-a");
        expect(isGraphIsomorphic(tri, tri, { findAllMappings: true }).isIsomorphic).toBe(true);
    });
});
