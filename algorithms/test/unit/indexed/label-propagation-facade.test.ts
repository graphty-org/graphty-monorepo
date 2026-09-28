/**
 * Legacy `labelPropagation` delegates to `indexed.labelPropagation`. Its partitions differ from the
 * old implementation on purpose (a work queue, a uniform tie draw, another generator), so the facade
 * is checked against the port it wraps, on every fixture and several seeds, and against the
 * partitions that did not change.
 */

import { describe, expect, it } from "vitest";

import { labelPropagation } from "../../../src/algorithms/community/label-propagation.js";
import { Graph } from "../../../src/core/graph.js";
import { labelPropagation as indexedLabelPropagation } from "../../../src/indexed/label-propagation.js";
import { toSnapshot } from "../../../src/indexed/to-snapshot.js";
import { expectFacadeMatchesLegacy, type FacadeFixture } from "../../helpers/facade-differential.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

/** Numeric ids with f64 weights that f32 would round, plus an isolated node. */
function numericWeighted(): Graph {
    const g = new Graph({ directed: false });
    g.addEdge(1, 2, 0.1);
    g.addEdge(2, 3, 0.2);
    g.addEdge(1, 3, 0.7);
    g.addEdge(3, 4, 0.3);
    g.addNode(9);
    return g;
}

const fixtures: FacadeFixture[] = [
    ...undirectedFixtures(),
    ...directedFixtures(),
    { name: "numeric ids, f64 weights, an isolated node", graph: numericWeighted() },
    { name: "empty", graph: new Graph({ directed: false }) },
];

describe("labelPropagation facade", () => {
    it("returns the port's partition keyed by String(id), with its iterations and convergence", () => {
        for (const randomSeed of [undefined, 1, 42, 2024]) {
            for (const maxIterations of [undefined, 1, 2]) {
                const options = { randomSeed, maxIterations };
                expectFacadeMatchesLegacy(
                    fixtures,
                    (g) => {
                        const s = toSnapshot(g);
                        const r = indexedLabelPropagation(s, options);
                        const communities = new Map<string, number>();
                        for (let i = 0; i < s.nodeCount; i++) {
                            communities.set(String(s.ids.idOf(i)), r.labels[i]);
                        }
                        return { communities, iterations: r.iterations, converged: r.converged };
                    },
                    (g) => labelPropagation(g, options),
                );
            }
        }
    });

    it("keeps disjoint cliques and isolated nodes apart and numbers communities in node order", () => {
        const g = new Graph({ directed: false });
        for (const [u, v] of [
            ["a", "b"],
            ["b", "c"],
            ["a", "c"],
            ["x", "y"],
            ["y", "z"],
            ["x", "z"],
        ]) {
            g.addEdge(u, v);
        }
        g.addNode("lone");
        const { communities, converged } = labelPropagation(g);
        expect(converged).toBe(true);
        expect([...communities]).toEqual([
            ["a", 0],
            ["b", 0],
            ["c", 0],
            ["x", 1],
            ["y", 1],
            ["z", 1],
            ["lone", 2],
        ]);
    });

    it("accepts any maxIterations and randomSeed, as the old loop did", () => {
        const g = new Graph({ directed: false });
        g.addNode("a");
        g.addNode("b");
        for (const maxIterations of [0, -1, NaN]) {
            expect(labelPropagation(g, { maxIterations }), String(maxIterations)).toMatchObject({
                iterations: 0,
                converged: false,
            });
        }
        expect(labelPropagation(g, { maxIterations: Infinity })).toMatchObject({ iterations: 1, converged: true });
        expect(labelPropagation(new Graph(), { maxIterations: 0 })).toMatchObject({ iterations: 0, converged: true });
    });

    it("rounds a fractional maxIterations up and a fractional randomSeed down", () => {
        const byName = (name: string): Graph => {
            const found = undirectedFixtures().find((f) => f.name === name);
            if (found === undefined) {
                throw new Error(`no fixture ${name}`);
            }
            return found.graph;
        };
        // Two triangles need a second pass to converge, so one pass stops short.
        const triangles = byName("two triangles and an isolated node");
        expect(labelPropagation(triangles, { maxIterations: 1 }).converged).toBe(false);
        expect(labelPropagation(triangles, { maxIterations: 1.5 })).toMatchObject({ iterations: 2, converged: true });
        // Seeds 7 and 8 split a path differently, so the seed rounding shows.
        const path = byName("path of six");
        const at = (randomSeed: number): number[] => [...labelPropagation(path, { randomSeed }).communities.values()];
        expect(at(7)).not.toEqual(at(8));
        expect(at(7.9)).toEqual(at(7));
    });

    it("gives a zero-weight edge no vote, so it joins nothing", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b", 0);
        g.addEdge("b", "c", 0);
        expect([...labelPropagation(g).communities]).toEqual([
            ["a", 0],
            ["b", 1],
            ["c", 2],
        ]);
    });

    it("throws a RangeError on a negative weight", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b", -1);
        expect(() => labelPropagation(g)).toThrow(RangeError);
    });
});
