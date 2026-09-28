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

/**
 * The Adamic-Adar ordering, which cannot be compared exactly: legacy adds a pair's terms in the
 * order its neighbours were inserted and the port in index order, so two pairs with the same
 * terms can differ in the last bit and swap places. Asserted instead: the same score at every rank,
 * every listed pair carrying its own legacy score, and -- when nothing was cut off -- the same pairs.
 */
function expectRankingMatches(
    actual: LinkPredictionScore[],
    expected: LinkPredictionScore[],
    legacyScore: (source: NodeId, target: NodeId) => number,
    complete: boolean,
    at: string,
): void {
    expect(actual.length, `${at} length`).toBe(expected.length);
    expected.forEach((x, k) => {
        expectClose(actual[k].score, x.score, `${at} rank ${String(k)}`);
        expectClose(actual[k].score, legacyScore(actual[k].source, actual[k].target), `${at} pair ${String(k)}`);
    });
    if (complete) {
        const key = (x: LinkPredictionScore): string => `${String(x.source)}|${String(x.target)}`;
        expect(actual.map(key).sort(), `${at} pairs`).toEqual(expected.map(key).sort());
    }
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
                for (const o of OPTIONS) {
                    const at = `${c.name} ${JSON.stringify(o)}`;
                    expectScoresMatch(
                        toLegacy(s, commonNeighborsPrediction(s, o)),
                        legacy.commonNeighborsPrediction(c.graph, o),
                        `common neighbours ${at}`,
                    );
                    expectRankingMatches(
                        toLegacy(s, adamicAdarPrediction(s, o)),
                        legacy.adamicAdarPrediction(c.graph, o),
                        (u, v) => legacy.adamicAdarScore(c.graph, u, v, o),
                        !("topK" in o),
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
                        expectRankingMatches(
                            toLegacy(s, getTopAdamicAdarCandidatesForNode(s, u, { ...o, candidates })),
                            legacy.getTopAdamicAdarCandidatesForNode(c.graph, id, { ...o, candidates: candidateIds }),
                            (a, b) => legacy.adamicAdarScore(c.graph, a, b, o),
                            false,
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
        expect(adamicAdarScore(s, 1, 3)).toBeCloseTo(2 / Math.log(3), 12);
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
});
