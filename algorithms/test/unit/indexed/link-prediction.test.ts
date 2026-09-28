import { GraphBuilder, type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import {
    adamicAdarForPairs,
    adamicAdarPrediction,
    adamicAdarScore,
    commonNeighborsForPairs,
    commonNeighborsPrediction,
    compareAdamicAdarWithCommonNeighbors,
    evaluateAdamicAdar,
    evaluateCommonNeighbors,
    getTopAdamicAdarCandidatesForNode,
    getTopCandidatesForNode,
    type LinkPredictionResult,
} from "../../../src/indexed/link-prediction.js";
import type { LinkPredictionScore } from "../../../src/link-prediction/index.js";
import * as legacy from "../../../src/link-prediction/index.js";
import type { NodeId } from "../../../src/types/index.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

interface Case {
    readonly name: string;
    readonly graph: Graph;
    readonly snapshot: GraphSnapshot;
}

/**
 * The same edge list as a legacy graph and as a snapshot that KEEPS every repeat. The legacy graph
 * holds one edge per pair (a repeat replaces), so it is the simple graph the port must reproduce.
 */
function multigraph(name: string, directed: boolean, nodes: string[], edges: [string, string][]): Case {
    const graph = new Graph({ directed, allowParallelEdges: true });
    const b = new GraphBuilder({ directed });
    for (const id of nodes) {
        graph.addNode(id);
        b.addNode(id);
    }
    for (const [u, v] of edges) {
        graph.addEdge(u, v);
        b.addEdge(u, v);
    }
    return { name, graph, snapshot: b.freeze({ label: name, checksum: true }) };
}

const MULTI_NODES = ["a", "b", "c", "d", "e", "f", "g"];
const MULTI_EDGES: [string, string][] = [
    ["a", "b"],
    ["a", "b"],
    ["b", "a"],
    ["a", "c"],
    ["b", "c"],
    ["c", "c"],
    ["c", "d"],
    ["c", "d"],
    ["d", "e"],
    ["b", "d"],
    ["e", "e"],
    ["e", "e"],
    ["f", "c"],
    ["f", "a"],
    ["a", "f"],
];

function cases(): Case[] {
    const fromLegacy = [...undirectedFixtures(), ...directedFixtures()].map(({ name, graph }) => ({
        name,
        graph,
        snapshot: checksummedSnapshot(graph),
    }));
    return [
        ...fromLegacy,
        multigraph("undirected multigraph with self-loops", false, MULTI_NODES, MULTI_EDGES),
        multigraph("directed multigraph with self-loops", true, MULTI_NODES, MULTI_EDGES),
    ];
}

const OPTIONS = [{}, { directed: true }, { includeExisting: true }, { directed: true, includeExisting: true, topK: 7 }];

function toLegacy(s: GraphSnapshot, r: LinkPredictionResult): LinkPredictionScore[] {
    return Array.from(r.scores, (score, k) => ({
        source: s.ids.idOf(r.sources[k]),
        target: s.ids.idOf(r.targets[k]),
        score,
    }));
}

function expectClose(actual: number, expected: number, at: string): void {
    expect(Math.abs(actual - expected), `${at}: ${String(actual)} vs ${String(expected)}`).toBeLessThanOrEqual(
        1e-9 * Math.max(1, Math.abs(expected)),
    );
}

function expectScoresMatch(actual: LinkPredictionScore[], expected: LinkPredictionScore[], at: string): void {
    expect(
        actual.map((x) => [x.source, x.target]),
        `${at} ordering`,
    ).toEqual(expected.map((x) => [x.source, x.target]));
    expected.forEach((x, k) => {
        expectClose(actual[k].score, x.score, `${at}[${String(k)}]`);
    });
}

function expectMetricsMatch(actual: object, expected: object, at: string): void {
    const a = actual as Record<string, number>;
    const e = expected as Record<string, number>;
    expect(Object.keys(a).sort(), at).toEqual(Object.keys(e).sort());
    for (const key of Object.keys(e)) {
        if (Number.isNaN(e[key])) {
            expect(a[key], `${at}.${key}`).toBeNaN();
        } else {
            expectClose(a[key], e[key], `${at}.${key}`);
        }
    }
}

/** Ordered pairs among the first twelve nodes, self-pairs included, then one pair with an absent node. */
function pairsOf(s: GraphSnapshot): { ids: [NodeId, NodeId][]; sources: number[]; targets: number[] } {
    const k = Math.min(12, s.nodeCount);
    const ids: [NodeId, NodeId][] = [];
    const sources: number[] = [];
    const targets: number[] = [];
    for (let u = 0; u < k; u++) {
        for (let v = 0; v < k; v++) {
            ids.push([s.ids.idOf(u), s.ids.idOf(v)]);
            sources.push(u);
            targets.push(v);
        }
    }
    ids.push([s.ids.idOf(0), "no such node"]);
    sources.push(0);
    targets.push(INVALID_INDEX);
    return { ids, sources, targets };
}

/** Test edges taken from the graph, non-edges from a fixed stride; the two may overlap, which is fine. */
function evaluationSets(c: Case): {
    test: { ids: [NodeId, NodeId][]; sources: number[]; targets: number[] };
    non: { ids: [NodeId, NodeId][]; sources: number[]; targets: number[] };
} {
    const s = c.snapshot;
    const test = { ids: [] as [NodeId, NodeId][], sources: [] as number[], targets: [] as number[] };
    for (const edge of c.graph.edges()) {
        if (test.ids.length === 15) {
            break;
        }
        test.ids.push([edge.source, edge.target]);
        test.sources.push(s.ids.indexOf(edge.source));
        test.targets.push(s.ids.indexOf(edge.target));
    }
    const non = { ids: [] as [NodeId, NodeId][], sources: [] as number[], targets: [] as number[] };
    const n = s.nodeCount;
    for (let i = 0; i < Math.min(n, 20); i++) {
        const j = (i * 7 + 3) % n;
        non.ids.push([s.ids.idOf(i), s.ids.idOf(j)]);
        non.sources.push(i);
        non.targets.push(j);
    }
    return { test, non };
}

describe("indexed link prediction, against legacy", () => {
    for (const c of cases()) {
        describe(c.name, () => {
            const s = c.snapshot;

            it("predictions: same pairs, same order, same scores", () => {
                // A topK that is not positive keeps every pair.
                for (const o of [...OPTIONS, { topK: 0 }, { topK: -2 }]) {
                    const at = `${c.name} ${JSON.stringify(o)}`;
                    expectScoresMatch(
                        toLegacy(s, commonNeighborsPrediction(s, o)),
                        legacy.commonNeighborsPrediction(c.graph, o),
                        `common neighbours ${at}`,
                    );
                    expectScoresMatch(
                        toLegacy(s, adamicAdarPrediction(s, o)),
                        legacy.adamicAdarPrediction(c.graph, o),
                        `Adamic-Adar ${at}`,
                    );
                }
                s.validate({ checksum: true });
            });

            it("pair scores, including self-pairs and an absent node", () => {
                const pairs = pairsOf(s);
                for (const o of OPTIONS) {
                    const cn = commonNeighborsForPairs(s, pairs, o);
                    const aa = adamicAdarForPairs(s, pairs, o);
                    const legacyCn = legacy.commonNeighborsForPairs(c.graph, pairs.ids, o);
                    const legacyAa = legacy.adamicAdarForPairs(c.graph, pairs.ids, o);
                    legacyCn.forEach((x, k) => {
                        expect(cn[k], `common neighbours ${String(x.source)}-${String(x.target)}`).toBe(x.score);
                    });
                    legacyAa.forEach((x, k) => {
                        expectClose(aa[k], x.score, `Adamic-Adar ${String(x.source)}-${String(x.target)}`);
                        expect(adamicAdarScore(s, pairs.sources[k], pairs.targets[k], o)).toBe(aa[k]);
                    });
                }
                s.validate({ checksum: true });
            });

            it("top candidates per node, with and without a candidate list", () => {
                const candidateIds: NodeId[] = [];
                const candidates: number[] = [];
                for (let i = 0; i < s.nodeCount; i += 3) {
                    candidateIds.push(s.ids.idOf(i));
                    candidates.push(i);
                }
                candidateIds.push("no such node", s.ids.idOf(0));
                candidates.push(INVALID_INDEX, 0);
                for (const o of [...OPTIONS, { topK: 0 }, { topK: -2 }]) {
                    for (let u = 0; u < s.nodeCount; u++) {
                        const id = s.ids.idOf(u);
                        const at = `${String(id)} ${JSON.stringify(o)}`;
                        expectScoresMatch(
                            toLegacy(s, getTopCandidatesForNode(s, u, o)),
                            legacy.getTopCandidatesForNode(c.graph, id, o),
                            `common neighbours ${at}`,
                        );
                        expectScoresMatch(
                            toLegacy(s, getTopAdamicAdarCandidatesForNode(s, u, { ...o, candidates })),
                            legacy.getTopAdamicAdarCandidatesForNode(c.graph, id, { ...o, candidates: candidateIds }),
                            `Adamic-Adar ${at}`,
                        );
                    }
                }
                s.validate({ checksum: true });
            });

            it("evaluation and comparison metrics", () => {
                const { test, non } = evaluationSets(c);
                for (const o of OPTIONS) {
                    const at = `${c.name} ${JSON.stringify(o)}`;
                    expectMetricsMatch(
                        evaluateCommonNeighbors(s, test, non, o),
                        legacy.evaluateCommonNeighbors(c.graph, test.ids, non.ids, o),
                        `common neighbours ${at}`,
                    );
                    expectMetricsMatch(
                        evaluateAdamicAdar(s, test, non, o),
                        legacy.evaluateAdamicAdar(c.graph, test.ids, non.ids, o),
                        `Adamic-Adar ${at}`,
                    );
                    const both = compareAdamicAdarWithCommonNeighbors(s, test, non, o);
                    const legacyBoth = legacy.compareAdamicAdarWithCommonNeighbors(c.graph, test.ids, non.ids, o);
                    expectMetricsMatch(both.adamicAdar, legacyBoth.adamicAdar, `compare, Adamic-Adar ${at}`);
                    expectMetricsMatch(both.commonNeighbors, legacyBoth.commonNeighbors, `compare, CN ${at}`);
                }
                s.validate({ checksum: true });
            });
        });
    }
});

describe("indexed link prediction", () => {
    /** The undirected square a-b-c-d-a with the chord a-c. */
    function square(): GraphSnapshot {
        const b = new GraphBuilder({ directed: false });
        for (const id of ["a", "b", "c", "d"]) {
            b.addNode(id);
        }
        for (const [u, v] of [
            ["a", "b"],
            ["b", "c"],
            ["c", "d"],
            ["d", "a"],
            ["a", "c"],
        ]) {
            b.addEdge(u, v);
        }
        return b.freeze({ label: "square", checksum: true });
    }

    it("weights each common neighbour by one over the log of its degree", () => {
        // b and d share a and c, each of degree 3.
        const s = square();
        expect(adamicAdarScore(s, 1, 3)).toBeCloseTo(2 / Math.log(3), 10);
        s.validate({ checksum: true });
    });

    it("ranks the one missing pair, in both orientations, and nothing else", () => {
        const s = square();
        const r = commonNeighborsPrediction(s);
        expect([...r.sources]).toEqual([1, 3]);
        expect([...r.targets]).toEqual([3, 1]);
        expect([...r.scores]).toEqual([2, 2]);
        s.validate({ checksum: true });
    });

    it("scores an out-of-range node zero", () => {
        const s = square();
        expect(adamicAdarScore(s, INVALID_INDEX, 1)).toBe(0);
        expect([...commonNeighborsForPairs(s, { sources: [0, 9], targets: [INVALID_INDEX, 1] })]).toEqual([0, 0]);
        expect(getTopCandidatesForNode(s, INVALID_INDEX).scores.length).toBe(0);
        s.validate({ checksum: true });
    });

    it("gives the AUC of chance when one side of the evaluation is empty", () => {
        const s = square();
        const m = evaluateCommonNeighbors(s, { sources: [1], targets: [3] }, { sources: [], targets: [] });
        expect(m.auc).toBe(0.5);
        expect(m.precision).toBe(1);
        expect(m.recall).toBe(1);
        s.validate({ checksum: true });
    });

    it("scores two pairs with the same common-neighbour degrees identically, whatever the order", () => {
        // 1 and s2 both have the common neighbours 3 (degree 3), s4 (degree 5, a self-loop counted
        // once) and 1 or s2 itself (degree 3), reached in a different order. Summed unsnapped, the
        // two scores differ in the last bit, and the stable edges-first ranking splits the tie.
        const graph = new Graph({ directed: false, allowSelfLoops: true });
        const b = new GraphBuilder({ directed: false });
        for (const id of ["s2", "s4", "s0", 1, 3]) {
            graph.addNode(id);
            b.addNode(id);
        }
        const edges: [NodeId, NodeId][] = [
            ["s2", "s4"],
            ["s4", "s4"],
            ["s0", "s2"],
            [1, "s4"],
            [1, 3],
            [1, "s0"],
            [3, "s4"],
            [3, "s2"],
        ];
        for (const [u, v] of edges) {
            graph.addEdge(u, v);
            b.addEdge(u, v);
        }
        const s = b.freeze({ label: "tie", checksum: true });
        const test: [NodeId, NodeId][] = [
            [1, 1],
            ["s2", "s2"],
        ];
        const non: [NodeId, NodeId][] = [
            ["s2", 1],
            [1, "s2"],
        ];
        const indexed = (pairs: [NodeId, NodeId][]): { sources: number[]; targets: number[] } => ({
            sources: pairs.map(([u]) => s.ids.indexOf(u)),
            targets: pairs.map(([, v]) => s.ids.indexOf(v)),
        });
        const o = { includeExisting: true };
        const scores = adamicAdarForPairs(s, indexed([...test, ...non]), o);
        expect(new Set(scores).size).toBe(1);
        const metrics = evaluateAdamicAdar(s, indexed(test), indexed(non), o);
        expect(metrics).toEqual(legacy.evaluateAdamicAdar(graph, test, non, o));
        expect(metrics.auc).toBe(1);
        s.validate({ checksum: true });
    });

    it("scores one pair from its own neighbourhood, not the whole graph", () => {
        // A path 0-1-2-...-999: the pair (0, 2) has the one common neighbour 1.
        const b = new GraphBuilder({ directed: false });
        for (let i = 0; i < 1000; i++) {
            b.addNode(i);
        }
        for (let i = 0; i + 1 < 1000; i++) {
            b.addEdge(i, i + 1);
        }
        const s = b.freeze({ label: "path", checksum: true });
        let rowReads = 0;
        const counted = new Proxy(s, {
            get(target, key): unknown {
                if (key === "rowPtr") {
                    rowReads++;
                }
                const value: unknown = Reflect.get(target, key, target);
                return typeof value === "function" ? (value as () => unknown).bind(target) : value;
            },
        });
        expect(adamicAdarScore(counted, 0, 2)).toBe(adamicAdarScore(s, 0, 2));
        expect(adamicAdarScore(counted, 0, 2)).toBeCloseTo(1 / Math.log(2), 10);
        expect(rowReads).toBeLessThan(40);
        s.validate({ checksum: true });
    });

    it("keeps the first threshold when two give the same best F1", () => {
        // Ranked: edge b-d (2), non-edge a-c (2), non-edge a-b (1), then an edge to an absent node
        // (0). F1 is 2/3 after the first pair and 2/3 again after all four; the first one is kept.
        const s = square();
        const m = evaluateCommonNeighbors(
            s,
            { sources: [1, 0], targets: [3, INVALID_INDEX] },
            { sources: [0, 0], targets: [2, 1] },
        );
        expect(m.precision).toBe(1);
        expect(m.recall).toBe(0.5);
        expect(m.f1Score).toBeCloseTo(2 / 3, 12);
        s.validate({ checksum: true });
    });
});
