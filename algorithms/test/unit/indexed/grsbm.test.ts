import { GraphBuilder, INVALID_INDEX } from "@graphty/graph-format";
import { plantedPartitionGraph } from "@graphty/graph-samples/generators";
import { describe, expect, it, vi } from "vitest";

import { grsbm, type GrsbmOptions, type GrsbmResult } from "../../../src/indexed/grsbm.js";
import { mulberry32 } from "../../../src/utils/math-utilities.js";
import { expectFacadeMatchesLegacy, type FacadeFixture } from "../../helpers/facade-differential.js";
import { legacyResult } from "../../helpers/golden.js";
import { Graph } from "../../helpers/legacy-graph.js";
import type { GRSBMCluster, GRSBMResult, NodeId } from "../../helpers/legacy-types.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { toSnapshot } from "../../helpers/to-snapshot.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

// The golden records were taken with 2.x's generator, so this suite replays it in place of
// mulberry32 to check the arithmetic and the order of the draws against them.
vi.mock("../../../src/utils/math-utilities.js", async () => {
    const { legacySeededRandom } = await import("../../helpers/legacy-random.js");
    return { mulberry32: vi.fn(legacySeededRandom) };
});

const fixtures: FacadeFixture[] = [...undirectedFixtures(), ...directedFixtures()];

/** The port's result rebuilt in the legacy shape, ids and all, from its cluster list. */
function portShape(g: Graph, options: GrsbmOptions): GRSBMResult {
    const s = checksummedSnapshot(g);
    const r = grsbm(s, options);
    s.validate({ checksum: true });
    const idOf = (i: number): NodeId => s.ids.idOf(i);
    const name = (serial: number): string => (serial === 0 ? "root" : `cluster_${String(serial)}`);
    const build = (c: number): GRSBMCluster => {
        const cluster = r.clusters[c];
        const out: GRSBMCluster = {
            id: name(cluster.serial),
            members: new Set(Array.from(cluster.members, idOf)),
            modularity: cluster.modularity,
            depth: cluster.depth,
            spectralScore: cluster.spectralScore,
        };
        if (cluster.left !== INVALID_INDEX) {
            out.left = build(cluster.left);
            out.right = build(cluster.right);
        }
        return out;
    };
    const clusters = new Map<NodeId, number>();
    let leaf = 0;
    const walk = (c: number): void => {
        const cluster = r.clusters[c];
        if (cluster.left === INVALID_INDEX) {
            for (const i of cluster.members) {
                clusters.set(idOf(i), leaf);
            }
            leaf++;
        } else {
            walk(cluster.left);
            walk(cluster.right);
        }
    };
    walk(0);
    // The published labels must be the same partition as the leaves, whatever their numbering. Legacy
    // can split off an empty cluster; it is a leaf of the hierarchy but carries no label.
    const occupied = r.clusters.filter((c) => c.left === INVALID_INDEX && c.members.length > 0).length;
    expect(r.count).toBe(occupied);
    const labelOfLeaf = new Map<number, number>();
    for (let i = 0; i < s.nodeCount; i++) {
        const leafOfNode = clusters.get(idOf(i)) ?? -1;
        expect(labelOfLeaf.get(leafOfNode) ?? r.labels[i]).toBe(r.labels[i]);
        labelOfLeaf.set(leafOfNode, r.labels[i]);
    }
    expect(new Set(labelOfLeaf.values()).size).toBe(occupied);
    const explanation = r.clusters.flatMap((cluster) => {
        const { split } = cluster;
        if (split === null) {
            return [];
        }
        const [left, right] = [r.clusters[cluster.left], r.clusters[cluster.right]];
        return [
            {
                clusterId: name(cluster.serial),
                reason: `Spectral bisection based on Fiedler vector with modularity ${split.bisectionModularity.toFixed(3)}. Split creates clusters of sizes ${String(left.members.length)} and ${String(right.members.length)}.`,
                modularityImprovement: split.improvement,
                keyNodes: Array.from(split.keyNodes, idOf),
                spectralValues: Array.from(split.spectralValues),
            },
        ];
    });
    return {
        root: build(0),
        clusters,
        numClusters: leaf,
        modularityScores: Array.from(r.modularityScores),
        explanation,
    };
}

function leafSets(r: GrsbmResult): number[][] {
    return r.groups().map((group) => [...group]);
}

describe("indexed.grsbm", () => {
    it("throws on an empty graph, as legacy does", () => {
        expect(() => grsbm(toSnapshot(new Graph({ directed: false })))).toThrow("Cannot cluster empty graph");
    });

    it("leaves a graph too small to bisect as one cluster", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        const r = grsbm(toSnapshot(g));
        expect(r.clusters.length).toBe(1);
        expect(r.count).toBe(1);
        expect([...r.labels]).toEqual([0, 0, 0]);
        expect(Array.from(r.modularityScores)).toEqual([0]);
    });

    it("draws from the package generator, seeded with the seed option", () => {
        vi.mocked(mulberry32).mockClear();
        grsbm(toSnapshot(undirectedFixtures()[2].graph), { seed: 7 });
        expect(vi.mocked(mulberry32)).toHaveBeenCalledWith(7);
    });

    it("leaves Math.random alone", () => {
        const before = Math.random;
        grsbm(toSnapshot(undirectedFixtures()[2].graph));
        expect(Math.random).toBe(before);
    });

    // These two record the port, not 2.x: 2.x bisected along the eigenvector of the Laplacian's
    // largest eigenvalue instead of the Fiedler vector (issue #975), so its records encoded that bug.
    // They were re-taken from the fixed port with 2.x's generator; the cut, the modularity
    // arithmetic, the member order and the serials are still 2.x's.
    it("matches its recorded result on every fixture, weights ignored", () => {
        expectFacadeMatchesLegacy(fixtures, (g) => portShape(g, { weighted: false }));
    });

    it("matches its recorded result on every fixture with every option set", () => {
        const options = { maxDepth: 2, minClusterSize: 3, tolerance: 1e-8, maxIterations: 40, seed: 7 };
        expectFacadeMatchesLegacy(fixtures, (g) => portShape(g, { ...options, weighted: false }));
    });

    it("gives an unweighted undirected snapshot the same result weighted or not", () => {
        for (const { graph } of undirectedFixtures()) {
            if ([...graph.edges()].every((e) => e.weight === 1)) {
                const s = toSnapshot(graph);
                expect(leafSets(grsbm(s))).toEqual(leafSets(grsbm(s, { weighted: false })));
            }
        }
    });

    it("reads the weights when weighted: doubling every weight changes nothing, uneven weights do", () => {
        // The bisection vector comes from repeated products with the Laplacian, re-normalised, and
        // modularity is a ratio of weights, so a uniform factor of 2 (exact in floating point)
        // leaves every number as it was. Uneven weights move the modularity of the splits.
        const karate = undirectedFixtures().find((f) => f.name === "Zachary's karate club")?.graph ?? new Graph();
        const plain = new GraphBuilder({ directed: false });
        const doubled = new GraphBuilder({ directed: false });
        const uneven = new GraphBuilder({ directed: false });
        for (const { source, target } of karate.edges()) {
            plain.addEdge(source, target);
            doubled.addEdge(source, target, 2);
            uneven.addEdge(source, target, 1 + ((Number(source) + Number(target)) % 3));
        }
        const base = grsbm(plain.freeze());
        const twice = grsbm(doubled.freeze());
        expect(base.clusters.length).toBeGreaterThan(1);
        expect(Array.from(twice.labels)).toEqual(Array.from(base.labels));
        expect(Array.from(twice.modularityScores)).toEqual(Array.from(base.modularityScores));
        const s = uneven.freeze();
        expect(Array.from(grsbm(s).modularityScores)).not.toEqual(
            Array.from(grsbm(s, { weighted: false }).modularityScores),
        );
        // The root's bisection vector comes from the Laplacian alone, so this pins its weights.
        expect(Array.from(grsbm(s).clusters[0].split?.spectralValues ?? [])).not.toEqual(
            Array.from(grsbm(s, { weighted: false }).clusters[0].split?.spectralValues ?? []),
        );
    });

    /** An 8-cycle with self-loops on nodes 0 and 4. */
    function loopedCycle(directed: boolean): { builder: GraphBuilder; graph: Graph } {
        const builder = new GraphBuilder({ directed });
        const graph = new Graph({ directed });
        for (let i = 0; i < 8; i++) {
            builder.addEdge(i, (i + 1) % 8);
            graph.addEdge(i, (i + 1) % 8);
        }
        for (const i of [0, 4]) {
            builder.addEdge(i, i);
            graph.addEdge(i, i);
        }
        return { builder, graph };
    }

    it("scores the whole undirected graph as one community 0, self-loops counted twice", () => {
        const { builder } = loopedCycle(false);
        const s = builder.freeze();
        expect(grsbm(s).modularityScores[0]).toBeCloseTo(0, 12);
        expect(grsbm(s, { weighted: false }).modularityScores[0]).toBeCloseTo(0, 12);
        // Legacy counts a self-loop once in the degree and half in the internal edges, so it does not.
        expect((legacyResult() as GRSBMResult).modularityScores[0]).not.toBeCloseTo(0, 6);
    });

    it("leaves self-loops out of the bisection vector", () => {
        // Two 5-cliques joined by the edge 4-5.
        const barbell = (loops: number[]): ReturnType<GraphBuilder["freeze"]> => {
            const b = new GraphBuilder({ directed: false });
            for (const base of [0, 5]) {
                for (let i = 0; i < 5; i++) {
                    for (let j = i + 1; j < 5; j++) {
                        b.addEdge(base + i, base + j);
                    }
                }
            }
            b.addEdge(4, 5);
            for (const i of loops) {
                b.addEdge(i, i);
            }
            return b.freeze();
        };
        const plain = grsbm(barbell([])).clusters[0].split?.spectralValues;
        const looped = grsbm(barbell([2, 7])).clusters[0].split?.spectralValues;
        expect(plain).toBeDefined();
        expect(Array.from(looped ?? [])).toEqual(Array.from(plain ?? []));
    });

    it("scores the whole directed graph as one community 0 when weighted, legacy's -0.5 when not", () => {
        const { builder, graph } = loopedCycle(true);
        const s = builder.freeze();
        expect(grsbm(s).modularityScores[0]).toBeCloseTo(0, 12);
        expect(grsbm(s, { weighted: false }).modularityScores[0]).toBeCloseTo(-0.5, 12);
        const plain = new Graph({ directed: true });
        for (let i = 0; i < 8; i++) {
            plain.addEdge(i, (i + 1) % 8);
        }
        expect((legacyResult() as GRSBMResult).modularityScores[0]).toBeCloseTo(-0.5, 12);
        expect(graph.nodeCount).toBe(8);
    });

    it("refuses a negative or infinite weight when weighted, and ignores it when not", () => {
        // NaN never reaches grsbm: the builder refuses it.
        for (const bad of [-5, Infinity]) {
            const b = new GraphBuilder({ directed: false });
            for (let i = 0; i < 8; i++) {
                b.addEdge(i, (i + 1) % 8, i === 3 ? bad : 1);
            }
            const s = b.freeze();
            expect(() => grsbm(s)).toThrow(RangeError);
            expect(() => grsbm(s, { weighted: false })).not.toThrow();
        }
    });

    it("counts a parallel edge as weight when weights are ignored", () => {
        const multi = new GraphBuilder({ directed: false });
        const weighted = new GraphBuilder({ directed: false });
        for (let i = 0; i < 6; i++) {
            multi.addEdge(i, (i + 1) % 6);
            weighted.addEdge(i, (i + 1) % 6, i === 2 ? 2 : 1);
        }
        multi.addEdge(2, 3);
        const a = grsbm(multi.freeze(), { weighted: false });
        const b = grsbm(weighted.freeze());
        expect(Array.from(a.labels)).toEqual(Array.from(b.labels));
        expect(Array.from(a.modularityScores)).toEqual(Array.from(b.modularityScores));
    });

    /** The root's bisection vector: the Fiedler vector of the whole graph. */
    function rootFiedler(s: ReturnType<GraphBuilder["freeze"]>, options: GrsbmOptions = {}): number[] {
        const values = grsbm(s, { maxDepth: 1, ...options }).clusters[0].split?.spectralValues;
        expect(values).toBeDefined();
        return Array.from(values ?? []);
    }

    it("splits along the Fiedler vector: a path graph's is cos(pi (k + 1/2) / n), up to sign", () => {
        const n = 10;
        const b = new GraphBuilder({ directed: false });
        for (let i = 0; i + 1 < n; i++) {
            b.addEdge(i, i + 1);
        }
        const values = rootFiedler(b.freeze(), { maxIterations: 1000, tolerance: 1e-12 });
        const exact = Array.from({ length: n }, (_, k) => Math.cos((Math.PI * (k + 0.5)) / n));
        const length = Math.hypot(...exact);
        const sign = Math.sign(values[0]);
        for (let k = 0; k < n; k++) {
            expect(sign * values[k]).toBeCloseTo(exact[k] / length, 6);
        }
    });

    it("gives two cliques joined by one edge opposite signs, with weighted degrees", () => {
        // Two 5-cliques joined by 4-5. Heavy clique weights make the Laplacian's largest eigenvalue
        // far exceed the unweighted degree, so a shift taken from counted arcs would not hold.
        for (const [inside, bridge] of [
            [1, 1],
            [10, 0.5],
        ]) {
            const b = new GraphBuilder({ directed: false });
            for (const base of [0, 5]) {
                for (let i = 0; i < 5; i++) {
                    for (let j = i + 1; j < 5; j++) {
                        b.addEdge(base + i, base + j, inside);
                    }
                }
            }
            b.addEdge(4, 5, bridge);
            const values = rootFiedler(b.freeze());
            const sign = Math.sign(values[0]);
            for (let i = 0; i < 10; i++) {
                expect(Math.sign(values[i]), `weights ${String(inside)}, node ${String(i)}`).toBe(i < 5 ? sign : -sign);
            }
        }
    });

    it("splits a two-block planted partition exactly along its blocks at depth 1", () => {
        const sample = plantedPartitionGraph({ groups: 2, groupSize: 20, pIn: 0.5, pOut: 0.02, seed: 1 });
        const truth = sample.nodeColumns?.community;
        if (!(truth instanceof Uint32Array)) {
            throw new Error("planted partition graph has no u32 community column");
        }
        const b = new GraphBuilder({ directed: false });
        for (let i = 0; i < sample.nodeCount; i++) {
            b.addNode(i);
        }
        for (let e = 0; e < sample.src.length; e++) {
            b.addEdge(sample.src[e], sample.dst[e]);
        }
        const s = b.freeze();
        const r = grsbm(s, { maxDepth: 1 });
        expect(r.count).toBe(2);
        const blocks = r.groups().map((group) => new Set([...group].map((i) => truth[Number(s.ids.idOf(i))])));
        expect(blocks.map((set) => set.size)).toEqual([1, 1]);
        expect(new Set(blocks.flatMap((set) => [...set])).size).toBe(2);
    });

    it("bisects a cluster with no internal arcs without NaN", () => {
        // Eight isolated nodes: the Laplacian is zero, so the iteration has nothing to multiply.
        const b = new GraphBuilder({ directed: false });
        for (let i = 0; i < 8; i++) {
            b.addNode(i);
        }
        const r = grsbm(b.freeze());
        for (const c of r.clusters) {
            expect(Number.isNaN(c.modularity) || Number.isNaN(c.spectralScore)).toBe(false);
            for (const v of c.split?.spectralValues ?? []) {
                expect(Number.isFinite(v)).toBe(true);
            }
        }
    });
});
