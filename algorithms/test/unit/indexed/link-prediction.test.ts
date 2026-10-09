import { GraphBuilder, type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

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
import { legacyResult } from "../../helpers/golden.js";
import { Graph } from "../../helpers/legacy-graph.js";
import type { LinkPredictionScore, NodeId } from "../../helpers/legacy-types.js";
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

/**
 * What 2.x listed, given the full 3.x list (every pair, no `topK`): without `directed`, each pair in both orders,
 * the reverse right after; with `directed`, only the pairs with u < v. Then it cut the list at `topK`. 3.x lists
 * each pair once and, under `directed` on a directed graph, both orders.
 */
function asLegacyList(full: LinkPredictionResult, o: { directed?: boolean; topK?: number }): LinkPredictionResult {
    const ordered = o.directed === true;
    const sources: number[] = [];
    const targets: number[] = [];
    const scores: number[] = [];
    full.scores.forEach((x, k) => {
        const u = full.sources[k];
        const v = full.targets[k];
        if (!ordered || u < v) {
            sources.push(u);
            targets.push(v);
            scores.push(x);
        }
        if (!ordered) {
            sources.push(v);
            targets.push(u);
            scores.push(x);
        }
    });
    const end = o.topK !== undefined && o.topK > 0 ? o.topK : scores.length;
    return {
        sources: Uint32Array.from(sources.slice(0, end)),
        targets: Uint32Array.from(targets.slice(0, end)),
        scores: Float64Array.from(scores.slice(0, end)),
    };
}

/** The full list cut at `topK`, as 3.x cuts it. */
function cut(full: LinkPredictionResult, topK: number | undefined): number[][] {
    const end = topK !== undefined && topK > 0 ? topK : full.scores.length;
    return [Array.from(full.sources.slice(0, end)), Array.from(full.targets.slice(0, end))];
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

/**
 * Adamic-Adar rankings equal legacy up to the order of tied pairs: the port's weights are snapped so
 * tied pairs score identically, where legacy sums in visit order and splits them by rounding. Each
 * position must hold legacy's score, and each pair the score legacy gives that pair.
 */
function expectRankingMatch(
    actual: LinkPredictionScore[],
    expected: LinkPredictionScore[],
    legacyScore: (u: NodeId, v: NodeId) => number,
    at: string,
): void {
    expect(actual.length, `${at} length`).toBe(expected.length);
    actual.forEach((x, k) => {
        expectClose(x.score, expected[k].score, `${at}[${String(k)}]`);
        expectClose(x.score, legacyScore(x.source, x.target), `${at} ${String(x.source)}-${String(x.target)}`);
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
                // A topK that is not positive keeps every pair. Each pair is listed once now, so the recorded 2.x
                // lists are compared with the full list put back into the 2.x shape.
                for (const o of [...OPTIONS, { topK: 0 }, { topK: -2 }]) {
                    const at = `${c.name} ${JSON.stringify(o)}`;
                    const whole = { ...o, topK: undefined };
                    const cn = commonNeighborsPrediction(s, whole);
                    const aa = adamicAdarPrediction(s, whole);
                    expect(cut(commonNeighborsPrediction(s, o), undefined), at).toEqual(cut(cn, o.topK));
                    expect(cut(adamicAdarPrediction(s, o), undefined), at).toEqual(cut(aa, o.topK));
                    expectScoresMatch(
                        toLegacy(s, asLegacyList(cn, o)),
                        legacyResult() as LinkPredictionScore[],
                        `common neighbours ${at}`,
                    );
                    expectRankingMatch(
                        toLegacy(s, asLegacyList(aa, o)),
                        legacyResult() as LinkPredictionScore[],
                        () => legacyResult() as number,
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
                    const legacyCn = legacyResult() as LinkPredictionScore[];
                    const legacyAa = legacyResult() as LinkPredictionScore[];
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
                            legacyResult() as LinkPredictionScore[],
                            `common neighbours ${at}`,
                        );
                        expectRankingMatch(
                            toLegacy(s, getTopAdamicAdarCandidatesForNode(s, u, { ...o, candidates })),
                            legacyResult() as LinkPredictionScore[],
                            () => legacyResult() as number,
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
                        legacyResult() as { precision: number; recall: number; f1Score: number; auc: number },
                        `common neighbours ${at}`,
                    );
                    expectMetricsMatch(
                        evaluateAdamicAdar(s, test, non, o),
                        legacyResult() as { precision: number; recall: number; f1Score: number; auc: number },
                        `Adamic-Adar ${at}`,
                    );
                    const both = compareAdamicAdarWithCommonNeighbors(s, test, non, o);
                    const legacyBoth = legacyResult() as {
                        adamicAdar: { precision: number; recall: number; f1Score: number; auc: number };
                        commonNeighbors: { precision: number; recall: number; f1Score: number; auc: number };
                    };
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

    it("leaves the legacy score unsnapped", () => {
        // The port snaps its weights; the published legacy function must keep returning its own.
        const graph = new Graph({ directed: false });
        for (const [u, v] of [
            ["x", "z"],
            ["z", "y"],
            ["z", "w"],
        ]) {
            graph.addEdge(u, v);
        }
        expect(legacyResult() as number).toBe(1 / Math.log(3));
        const s = checksummedSnapshot(graph);
        expect(adamicAdarScore(s, s.ids.indexOf("x"), s.ids.indexOf("y"))).not.toBe(1 / Math.log(3));
    });

    it("ranks the one missing pair, once, and nothing else", () => {
        const s = square();
        for (const r of [commonNeighborsPrediction(s), adamicAdarPrediction(s)]) {
            expect([...r.sources]).toEqual([1]);
            expect([...r.targets]).toEqual([3]);
        }
        expect([...commonNeighborsPrediction(s).scores]).toEqual([2]);
        s.validate({ checksum: true });
    });

    it("counts topK in distinct pairs", () => {
        // The path 0-1-2-3-4: the missing pairs with a common neighbour are (0,2), (1,3) and (2,4).
        const b = new GraphBuilder({ directed: false });
        for (let i = 0; i < 5; i++) {
            b.addNode(i);
        }
        for (let i = 0; i < 4; i++) {
            b.addEdge(i, i + 1);
        }
        const s = b.freeze();
        const r = commonNeighborsPrediction(s, { topK: 3 });
        expect([...r.sources]).toEqual([0, 1, 2]);
        expect([...r.targets]).toEqual([2, 3, 4]);
    });

    it("scores both orders of a pair under directed: true on a directed snapshot", () => {
        // 0 -> 1 -> 2 and 2 -> 3 -> 0: the paths 0 -> 1 -> 2 and 2 -> 3 -> 0 make (0, 2) and (2, 0) one each.
        const b = new GraphBuilder({ directed: true });
        for (let i = 0; i < 4; i++) {
            b.addNode(i);
        }
        for (const [u, v] of [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 0],
        ]) {
            b.addEdge(u, v);
        }
        const s = b.freeze();
        const r = commonNeighborsPrediction(s, { directed: true });
        const pairs = Array.from(r.sources, (u, k) => `${String(u)}-${String(r.targets[k])}`).sort();
        expect(pairs).toEqual(["0-2", "1-3", "2-0", "3-1"]);
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
        // once) and 1 or s2 itself (degree 3), reached in a different order. Legacy sums unsnapped
        // weights in visit order, so its two scores differ in the last bit and its ranking splits
        // the tie; the port's scores are identical, and so is the rank of every pair.
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
        (legacyResult() as LinkPredictionScore[]).forEach((x, k) => {
            expectClose(scores[k], x.score, `${String(x.source)}-${String(x.target)}`);
        });
        const metrics = evaluateAdamicAdar(s, indexed(test), indexed(non), o);
        expect(metrics).toEqual({ precision: 1, recall: 1, f1Score: 1, auc: 1 });
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
