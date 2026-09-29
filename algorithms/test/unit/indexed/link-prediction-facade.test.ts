/**
 * The common-neighbour link prediction functions delegate to their `indexed.*` ports. Each is run
 * through its facade and against the pre-migration implementation, which must agree exactly: same
 * pairs, same order, same scores and metrics. The Adamic-Adar functions stay on their own code (the
 * port snaps its weights, which reorders tied pairs), so they have no facade to test here.
 */

import { describe, expect, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import {
    commonNeighborsForPairs,
    commonNeighborsPrediction,
    commonNeighborsScore,
    evaluateCommonNeighbors,
    getTopCandidatesForNode,
    type LinkPredictionScore,
} from "../../../src/link-prediction/common-neighbors.js";
import type { NodeId } from "../../../src/types/index.js";
import { expectFacadeMatchesLegacy, type FacadeFixture } from "../../helpers/facade-differential.js";
import { legacyResult } from "../../helpers/golden.js";
import { numericIdsFromZero } from "./multigraph-fixtures.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

/** A legacy graph with a self-loop and a repeated edge, which a legacy graph keeps once. */
function loopy(directed: boolean): Graph {
    const g = new Graph({ directed, allowSelfLoops: true, allowParallelEdges: true });
    for (const [u, v] of [
        ["a", "b"],
        ["a", "b"],
        ["b", "a"],
        ["a", "c"],
        ["b", "c"],
        ["c", "c"],
        ["c", "d"],
        ["d", "e"],
        ["b", "d"],
        ["f", "c"],
        ["f", "a"],
    ]) {
        g.addEdge(u, v);
    }
    return g;
}

/**
 * A legacy graph accepts a NaN weight, which a weighted snapshot cannot hold (so the parity helper,
 * which freezes one, cannot take it); these functions never read a weight.
 */
function nanWeighted(): Graph {
    const g = new Graph({ directed: false });
    g.addEdge("a", "b", NaN);
    g.addEdge("b", "c");
    g.addEdge("c", "a", 2);
    g.addEdge("c", "d");
    g.addEdge("d", "e", NaN);
    return g;
}

const fixtures: FacadeFixture[] = [
    ...undirectedFixtures(),
    ...directedFixtures(),
    { name: "undirected, a self-loop and a repeated edge", graph: loopy(false) },
    { name: "directed, a self-loop and a repeated edge", graph: loopy(true) },
    { name: "numeric ids from zero", graph: numericIdsFromZero() },
    { name: "empty", graph: new Graph({ directed: false }) },
];

const OPTIONS = [
    {},
    { directed: true },
    { includeExisting: true },
    { directed: true, includeExisting: true, topK: 7 },
    { topK: 0 },
    { topK: -2 },
];

/** Ordered pairs over the first ten nodes, self-pairs included, then absent and mistyped ids. */
function pairsOf(g: Graph): [NodeId, NodeId][] {
    const ids = [...g.nodes()].slice(0, 10).map((n) => n.id);
    const pairs: [NodeId, NodeId][] = ids.flatMap((u) => ids.map((v): [NodeId, NodeId] => [u, v]));
    const first = ids[0] ?? "a";
    // A numeric id asked for by its spelling is absent to the legacy graph, so it scores 0.
    pairs.push([first, "no such node"], ["no such node", first], [String(first), ids[1] ?? first]);
    return pairs;
}

describe("common-neighbour link prediction facades", () => {
    it("commonNeighborsScore equals legacy on every pair, absent and mistyped ids included", () => {
        for (const o of OPTIONS) {
            expectFacadeMatchesLegacy(fixtures, (g) => pairsOf(g).map(([u, v]) => commonNeighborsScore(g, u, v, o)));
        }
    });

    it("commonNeighborsPrediction equals legacy: same pairs, same order, same scores", () => {
        for (const o of OPTIONS) {
            expectFacadeMatchesLegacy(fixtures, (g) => commonNeighborsPrediction(g, o));
        }
    });

    it("commonNeighborsForPairs equals legacy and hands back the caller's ids", () => {
        for (const o of OPTIONS) {
            expectFacadeMatchesLegacy(fixtures, (g) => commonNeighborsForPairs(g, pairsOf(g), o));
        }
    });

    it("getTopCandidatesForNode equals legacy for every node, with and without a candidate list", () => {
        const candidatesOf = (g: Graph): NodeId[] => [
            ...[...g.nodes()].filter((_, i) => i % 3 === 0).map((n) => n.id),
            "no such node",
            ...[...g.nodes()].slice(0, 2).map((n) => n.id),
        ];
        for (const o of OPTIONS) {
            const all = (g: Graph, run: typeof getTopCandidatesForNode): unknown[] =>
                [...[...g.nodes()].map((n) => n.id), "no such node"].flatMap((id) => [
                    run(g, id, o),
                    run(g, id, { ...o, candidates: candidatesOf(g) }),
                ]);
            expectFacadeMatchesLegacy(fixtures, (g) => all(g, getTopCandidatesForNode));
        }
    });

    it("evaluateCommonNeighbors equals legacy, with absent nodes and an empty side", () => {
        const sets = (g: Graph): { test: [NodeId, NodeId][]; non: [NodeId, NodeId][] } => {
            const test = [...g.edges()].slice(0, 15).map((e): [NodeId, NodeId] => [e.source, e.target]);
            const ids = [...g.nodes()].map((n) => n.id);
            const non = ids.slice(0, 20).map((u, i): [NodeId, NodeId] => [u, ids[(i * 7 + 3) % ids.length]]);
            non.push(["no such node", ids[0] ?? "x"]);
            return { test, non };
        };
        for (const o of OPTIONS) {
            expectFacadeMatchesLegacy(fixtures, (g) => {
                const { test, non } = sets(g);
                return [
                    evaluateCommonNeighbors(g, test, non, o),
                    evaluateCommonNeighbors(g, test, [], o),
                    evaluateCommonNeighbors(g, [], non, o),
                ];
            });
        }
    });

    it("ignores a NaN weight, as legacy does", () => {
        const g = nanWeighted();
        const pairs = pairsOf(g);
        expect(commonNeighborsPrediction(g)).toEqual(legacyResult() as LinkPredictionScore[]);
        expect(commonNeighborsForPairs(g, pairs)).toEqual(legacyResult() as LinkPredictionScore[]);
        expect(getTopCandidatesForNode(g, "a")).toEqual(legacyResult() as LinkPredictionScore[]);
        expect(evaluateCommonNeighbors(g, pairs.slice(0, 5), pairs.slice(5))).toEqual(
            legacyResult() as { precision: number; recall: number; f1Score: number; auc: number },
        );
        expect(commonNeighborsPrediction(g).length).toBeGreaterThan(0);
    });

    it("sees an edge added after the first call", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("c", "d");
        expect(commonNeighborsScore(g, "a", "c")).toBe(0);
        g.addEdge("b", "c");
        g.addEdge("a", "d");
        expect(commonNeighborsScore(g, "a", "c")).toBe(2);
    });
});
