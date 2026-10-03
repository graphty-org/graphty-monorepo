import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { DeltaPageRank, deltaPageRank, PriorityDeltaPageRank } from "../../../src/indexed/delta-pagerank.js";
import { pageRank } from "../../../src/indexed/pagerank.js";
import { exactArcWeights } from "../../helpers/facade.js";
import { expectFacadeMatchesLegacy, type FacadeFixture } from "../../helpers/facade-differential.js";
import { legacyResult } from "../../helpers/golden.js";
import { Graph } from "../../helpers/legacy-graph.js";
import type { NodeId } from "../../helpers/legacy-types.js";
import { toSnapshot } from "../../helpers/to-snapshot.js";
import { directedFixtures, gnm } from "./port-fixtures.js";

/** Legacy pageRank switches to its delta engine when `useDelta !== false && n > 100`. */
const DELTA_THRESHOLD = 100;

function selfLoopsAndDangling(): Graph {
    const g = new Graph({ directed: true });
    g.addEdge("a", "a");
    g.addEdge("a", "b");
    g.addEdge("b", "c");
    g.addEdge("c", "a");
    g.addEdge("c", "c");
    g.addEdge("c", "d"); // d is dangling
    g.addNode("e"); // e is isolated, so dangling too
    return g;
}

/** Weights that are not f32-exact, so only the f64 override reproduces legacy bit for bit. */
function fractionalWeights(): Graph {
    const g = gnm(60, 240, true, 4242);
    const out = new Graph({ directed: true });
    for (const node of g.nodes()) {
        out.addNode(node.id);
    }
    let k = 0;
    for (const edge of g.edges()) {
        out.addEdge(edge.source, edge.target, 0.1 + (k++ % 7) / 3);
    }
    return out;
}

/** Node b has arcs, all of weight 0: weighted, it is not dangling and passes nothing on. */
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

function fixtures(): FacadeFixture[] {
    return [
        ...directedFixtures(),
        { name: "self-loops, a dangling node and an isolated node", graph: selfLoopsAndDangling() },
        { name: "random directed 60 nodes, fractional weights", graph: fractionalWeights() },
        { name: "a node whose arcs all weigh 0", graph: zeroWeightArcs() },
        { name: "random directed 150 nodes, 700 edges", graph: gnm(150, 700, true, 97531) },
        { name: "random directed 240 nodes, 1200 weighted edges", graph: gnm(240, 1200, true, 8642, true) },
    ];
}

function snapshotOf(graph: Graph): GraphSnapshot {
    return toSnapshot(graph, { checksum: true });
}

/** Legacy `Map<NodeId, number>` from per-index scores, in node order. */
function toMap(s: GraphSnapshot, scores: ArrayLike<number>): Map<NodeId, number> {
    const out = new Map<NodeId, number>();
    for (let i = 0; i < s.nodeCount; i++) {
        out.set(s.ids.idOf(i) as NodeId, scores[i]);
    }
    return out;
}

/** A per-index vector from a legacy id-keyed Map, `fill` where the Map has no entry. */
function toVector(s: GraphSnapshot, map: Map<NodeId, number>, fill: number): Float64Array {
    const out = new Float64Array(s.nodeCount).fill(fill);
    for (const [id, value] of map) {
        out[s.ids.indexOf(id)] = value;
    }
    return out;
}

/** The first three nodes of a graph, weighted 1, 2, 3. */
function firstThree(graph: Graph): Map<NodeId, number> {
    const out = new Map<NodeId, number>();
    let k = 0;
    for (const node of graph.nodes()) {
        if (k === 3) {
            break;
        }
        out.set(node.id, ++k);
    }
    return out;
}

function portedPageRank(
    graph: Graph,
    options: {
        weighted?: boolean;
        personalize?: boolean;
        initial?: boolean;
        maxIterations?: number;
        dampingFactor?: number;
        tolerance?: number;
    },
): { ranks: Record<string, number>; iterations: number; converged: boolean } {
    const s = snapshotOf(graph);
    const n = s.nodeCount;
    const r = deltaPageRank(s, {
        dampingFactor: options.dampingFactor,
        tolerance: options.tolerance,
        maxIterations: options.maxIterations,
        weighted: options.weighted,
        weights: options.weighted === true ? exactArcWeights(s) : undefined,
        personalization: options.personalize === true ? toVector(s, firstThree(graph), 0) : undefined,
        initialRanks: options.initial === true ? toVector(s, firstThree(graph), 1 / n) : undefined,
    });
    const ranks: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
        ranks[String(s.ids.idOf(i))] = r.scores[i];
    }
    return { ranks, iterations: r.iterations, converged: r.converged };
}

describe("deltaPageRank, the legacy pageRank facade's power iteration", () => {
    it("covers fixtures on both sides of legacy's n > 100 delta rule", () => {
        const sizes = fixtures().map((f) => f.graph.nodeCount);
        expect(sizes.some((n) => n > DELTA_THRESHOLD)).toBe(true);
        expect(sizes.some((n) => n <= DELTA_THRESHOLD)).toBe(true);
    });

    const cases = [
        { name: "defaults", options: {} },
        { name: "three iterations, not converged", options: { maxIterations: 3 } },
        { name: "weighted", options: { weighted: true } },
        { name: "personalized", options: { personalize: true } },
        { name: "initial ranks", options: { initial: true } },
        { name: "damping 0.6, tolerance 1e-10", options: { dampingFactor: 0.6, tolerance: 1e-10 } },
    ] as const;

    for (const { name, options } of cases) {
        for (const useDelta of [undefined, true, false]) {
            it(`${name}: scores, iterations and converged equal legacy pageRank (useDelta ${String(useDelta)})`, () => {
                expectFacadeMatchesLegacy(fixtures(), (g) => portedPageRank(g, options), { tolerance: 1e-9 });
            });
        }
    }

    it("throws on an undirected snapshot and on a damping factor outside [0, 1]", () => {
        const u = new Graph({ directed: false });
        u.addEdge("a", "b");
        expect(() => deltaPageRank(snapshotOf(u))).toThrow("PageRank requires a directed graph");
        const d = new Graph({ directed: true });
        d.addEdge("a", "b");
        expect(() => deltaPageRank(snapshotOf(d), { dampingFactor: 1.5 })).toThrow(
            "Damping factor must be between 0 and 1",
        );
    });

    it("returns an empty, converged result for an empty graph", () => {
        const s = new GraphBuilder({ directed: true }).freeze({ label: "empty" });
        const r = deltaPageRank(s);
        expect(r.scores.length).toBe(0);
        expect(r.iterations).toBe(0);
        expect(r.converged).toBe(true);
    });

    it("rejects a personalization or initial-ranks vector of the wrong length", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b");
        const s = snapshotOf(g);
        expect(() => deltaPageRank(s, { personalization: [1] })).toThrow(RangeError);
        expect(() => deltaPageRank(s, { initialRanks: [1, 2, 3] })).toThrow(RangeError);
    });

    it("rejects a per-arc weights override whose length is not the arc count", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        const s = snapshotOf(g);
        const weights = [1];
        expect(() => deltaPageRank(s, { weighted: true, weights })).toThrow(RangeError);
        expect(() => new DeltaPageRank(s, { weights })).toThrow(RangeError);
        expect(() => new PriorityDeltaPageRank(s, { weights })).toThrow(RangeError);
    });

    it("counts every parallel arc: two a->b arcs weigh like one a->b edge of weight 2", () => {
        // The legacy Graph cannot hold a parallel edge, so the reference is its weighted twin.
        const b = new GraphBuilder({ directed: true });
        for (const id of ["a", "b", "c"]) {
            b.addNode(id);
        }
        b.addEdge("a", "b");
        b.addEdge("a", "b");
        b.addEdge("a", "c");
        b.addEdge("b", "c");
        b.addEdge("c", "a");
        const s = b.freeze({ label: "multigraph", checksum: true });
        expect(s.flags.multigraph).toBe(true);
        const twin = new Graph({ directed: true });
        twin.addEdge("a", "b", 2);
        twin.addEdge("a", "c", 1);
        twin.addEdge("b", "c", 1);
        twin.addEdge("c", "a", 1);
        const legacy = legacyResult() as PageRankResult;
        const r = deltaPageRank(s);
        for (let i = 0; i < 3; i++) {
            expect(r.scores[i]).toBeCloseTo(legacy.ranks[String(s.ids.idOf(i))], 12);
        }
        expect(r.iterations).toBe(legacy.iterations);
        s.validate({ checksum: true });
    });
});

describe("indexed.DeltaPageRank", () => {
    const cases = [
        { name: "defaults", options: {} },
        { name: "weighted", options: { weight: "weight" } },
        { name: "personalized", options: { personalize: true } },
        { name: "delta threshold 1e-5, five iterations", options: { deltaThreshold: 1e-5, maxIterations: 5 } },
        { name: "damping 0.7", options: { dampingFactor: 0.7 } },
        { name: "tolerance 0.05, above the teleport share", options: { tolerance: 0.05 } },
    ] as const;

    function portOptions(
        s: GraphSnapshot,
        g: Graph,
        options: (typeof cases)[number]["options"],
    ): Parameters<DeltaPageRank["compute"]>[0] {
        return {
            dampingFactor: "dampingFactor" in options ? options.dampingFactor : undefined,
            maxIterations: "maxIterations" in options ? options.maxIterations : undefined,
            tolerance: "tolerance" in options ? options.tolerance : undefined,
            deltaThreshold: "deltaThreshold" in options ? options.deltaThreshold : undefined,
            weighted: "weight" in options,
            personalization: "personalize" in options ? toVector(s, firstThree(g), 0) : undefined,
        };
    }

    for (const { name, options } of cases) {
        it(`${name}: compute(), a second compute() and update() equal legacy`, () => {
            // The three calls run on ONE engine each side: the engines keep their scores and deltas
            // between calls, so the second and third answers depend on the first.
            expectFacadeMatchesLegacy(
                fixtures(),
                (g) => {
                    const s = snapshotOf(g);
                    const engine = new DeltaPageRank(s, { weights: exactArcWeights(s) });
                    const first = toMap(s, engine.compute(portOptions(s, g, options)));
                    const second = toMap(s, engine.compute(portOptions(s, g, options)));
                    const third = toMap(s, engine.update([0, Math.floor(s.nodeCount / 2)], portOptions(s, g, options)));
                    return [first, second, third];
                },
                { tolerance: 1e-9 },
            );
        });
    }

    it("update() skips an index outside the graph but still runs, as legacy does for an unknown id", () => {
        for (const { graph: g } of fixtures()) {
            const s = snapshotOf(g);
            const [legacyUnknown, legacyMixed] = legacyResult() as [Map<NodeId, number>, Map<NodeId, number>];
            const port = new DeltaPageRank(s, { weights: exactArcWeights(s) });
            // the legacy engine split deltas evenly unless asked to weight them
            const even = { weighted: false };
            port.compute(even);
            const onlyUnknown = [legacyUnknown, toMap(s, port.update([s.nodeCount, -1], even))];
            const mixed = [legacyMixed, toMap(s, port.update([0, Number.NaN, s.nodeCount + 5], even))];
            for (const [l, p] of [onlyUnknown, mixed]) {
                expect(p.size).toBe(l.size);
                for (const [id, score] of l) {
                    expect(p.get(id)).toBeCloseTo(score, 9);
                }
            }
        }
    });

    it("throws on an undirected snapshot and a bad damping factor", () => {
        const u = new Graph({ directed: false });
        u.addEdge("a", "b");
        expect(() => new DeltaPageRank(snapshotOf(u))).toThrow("DeltaPageRank requires a directed graph");
        const d = new Graph({ directed: true });
        d.addEdge("a", "b");
        const engine = new DeltaPageRank(snapshotOf(d));
        expect(() => engine.compute({ dampingFactor: -0.1 })).toThrow("Damping factor must be between 0 and 1");
    });

    it("returns no scores for an empty graph", () => {
        const s = new GraphBuilder({ directed: true }).freeze({ label: "empty" });
        expect(new DeltaPageRank(s).compute().length).toBe(0);
    });
});

describe("indexed.PriorityDeltaPageRank", () => {
    it("throws on an undirected snapshot", () => {
        const u = new Graph({ directed: false });
        u.addEdge("a", "b");
        expect(() => new PriorityDeltaPageRank(snapshotOf(u))).toThrow(
            "PriorityDeltaPageRank requires a directed graph",
        );
    });

    it("returns no scores for an empty graph", () => {
        const s = new GraphBuilder({ directed: true }).freeze({ label: "empty" });
        expect(new PriorityDeltaPageRank(s).computeWithPriority().length).toBe(0);
    });

    for (const weighted of [false, true]) {
        it(`converges to pageRank (weighted: ${String(weighted)})`, () => {
            for (const { name, graph } of fixtures()) {
                const s = snapshotOf(graph);
                const expected = pageRank(s, { weighted, tolerance: 1e-14, maxIterations: 10_000 }).scores;
                const actual = new PriorityDeltaPageRank(s, { weights: exactArcWeights(s) }).computeWithPriority({
                    weighted,
                    tolerance: 1e-14,
                    deltaThreshold: 0,
                    maxIterations: 10_000_000,
                });
                for (let i = 0; i < s.nodeCount; i++) {
                    expect(actual[i], `${name}, node ${String(i)}`).toBeCloseTo(expected[i], 9);
                }
            }
        });
    }
});
