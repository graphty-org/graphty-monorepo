import { GraphBuilder, INVALID_INDEX } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import { grsbm, type GrsbmOptions, type GrsbmResult } from "../../../src/indexed/grsbm.js";
import { toSnapshot } from "../../../src/indexed/to-snapshot.js";
import { grsbm as legacyGrsbm, type GRSBMCluster, type GRSBMResult } from "../../../src/research/grsbm.js";
import type { NodeId } from "../../../src/types/index.js";
import { expectFacadeMatchesLegacy, type FacadeFixture } from "../../helpers/facade-differential.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

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

    it("leaves Math.random alone", () => {
        const before = Math.random;
        grsbm(toSnapshot(undirectedFixtures()[2].graph));
        expect(Math.random).toBe(before);
    });

    it("equals legacy on every fixture, weights ignored", () => {
        expectFacadeMatchesLegacy(
            fixtures,
            (g) => legacyGrsbm(g),
            (g) => portShape(g, { weighted: false }),
        );
    });

    it("equals legacy on every fixture with every option set", () => {
        const options = { maxDepth: 2, minClusterSize: 3, tolerance: 1e-8, maxIterations: 40, seed: 7 };
        expectFacadeMatchesLegacy(
            fixtures,
            (g) => legacyGrsbm(g, { ...options, numEigenvectors: 3 }),
            (g) => portShape(g, { ...options, weighted: false }),
        );
    });

    it("gives an unweighted snapshot the same result weighted or not", () => {
        for (const { graph } of fixtures) {
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
});
