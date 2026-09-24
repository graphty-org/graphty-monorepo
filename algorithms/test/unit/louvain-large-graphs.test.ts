/**
 * louvain() switches to its optimised implementation above 50 nodes. These graphs sit above
 * that switch, so they pin the optimised path to the same answers as the reference path.
 */
import { describe, expect, it } from "vitest";

import { louvain } from "../../src/algorithms/community/louvain.js";
import { calculateModularity } from "../../src/algorithms/community/modularity-utils.js";
import { Graph } from "../../src/core/graph.js";
import type { CommunityResult, NodeId } from "../../src/types/index.js";

function rng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Cliques of `size` nodes joined in a chain by one edge each; returns the graph and its groups. */
function cliqueChain(n: number, size: number, weight = 1): { graph: Graph; groups: number[][] } {
    const graph = new Graph({ directed: false });
    const groups: number[][] = [];
    for (let start = 0; start < n; start += size) {
        const end = Math.min(n, start + size);
        const group: number[] = [];
        for (let i = start; i < end; i++) {
            group.push(i);
            graph.addNode(i);
            for (let j = start; j < i; j++) {
                graph.addEdge(j, i, weight);
            }
        }
        groups.push(group);
        if (end < n) {
            graph.addEdge(end - 1, end, weight);
        }
    }
    return { graph, groups };
}

/** Planted partition: `k` groups of `size`, edge probability pIn inside a group and pOut across. */
function plantedPartition(k: number, size: number, pIn: number, pOut: number, seed: number): { graph: Graph; groups: number[][] } {
    const random = rng(seed);
    const graph = new Graph({ directed: false });
    const n = k * size;
    for (let i = 0; i < n; i++) {
        graph.addNode(i);
    }
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const same = Math.floor(i / size) === Math.floor(j / size);
            if (random() < (same ? pIn : pOut)) {
                graph.addEdge(i, j);
            }
        }
    }
    const groups = Array.from({ length: k }, (_, g) => Array.from({ length: size }, (_, i) => g * size + i));
    return { graph, groups };
}

/** A ring whose blocks of `size` are joined by heavy edges and whose blocks meet on light ones. */
function weightedRing(blocks: number, size: number): { graph: Graph; groups: number[][] } {
    const graph = new Graph({ directed: false });
    const n = blocks * size;
    for (let i = 0; i < n; i++) {
        const next = (i + 1) % n;
        graph.addEdge(i, next, next % size === 0 ? 1 : 10);
    }
    const groups = Array.from({ length: blocks }, (_, g) => Array.from({ length: size }, (_, i) => g * size + i));
    return { graph, groups };
}

function partitionKey(communities: NodeId[][]): string {
    return communities
        .map((c) => [...c].map(Number).sort((a, b) => a - b).join(","))
        .sort()
        .join("|");
}

/** Every node appears exactly once, no community is empty, and the reported modularity is real. */
function assertWellFormed(graph: Graph, result: CommunityResult): void {
    const seen = new Set<NodeId>();
    for (const community of result.communities) {
        expect(community.length).toBeGreaterThan(0);
        for (const node of community) {
            expect(seen.has(node)).toBe(false);
            seen.add(node);
        }
    }
    expect(seen.size).toBe(graph.nodeCount);

    const assignment = new Map<NodeId, number>();
    result.communities.forEach((community, id) => {
        for (const node of community) {
            assignment.set(node, id);
        }
    });
    expect(result.modularity).toBeCloseTo(calculateModularity(graph, assignment, 1), 6);
}

describe("louvain above the optimised-path switch (more than 50 nodes)", () => {
    const planted: [string, () => { graph: Graph; groups: number[][] }][] = [
        ["a chain of 5 twelve-cliques (60 nodes)", () => cliqueChain(60, 12)],
        ["a chain of 20 ten-cliques (200 nodes)", () => cliqueChain(200, 10)],
        ["a weighted chain of 20 ten-cliques (200 nodes, weight 2.5)", () => cliqueChain(200, 10, 2.5)],
        ["a ring of 12 heavy blocks on light edges (120 nodes, weighted)", () => weightedRing(12, 10)],
        ["a planted partition of 10 groups of 50 (500 nodes)", () => plantedPartition(10, 50, 0.3, 0.002, 7)],
    ];

    for (const [name, build] of planted) {
        it(`finds the planted groups in ${name}`, () => {
            const { graph, groups } = build();
            const result = louvain(graph);

            assertWellFormed(graph, result);
            expect(result.communities.length).toBe(groups.length);
            expect(partitionKey(result.communities)).toBe(partitionKey(groups));
        });

        it(`matches the reference path's modularity on ${name}`, () => {
            const { graph } = build();
            const optimised = louvain(graph);
            const reference = louvain(graph, { useOptimized: false });

            expect(optimised.modularity).toBeGreaterThan(reference.modularity - 0.01);
        });
    }

    it("puts every pendant leaf with its only neighbour", () => {
        const { graph } = cliqueChain(60, 12);
        for (let i = 0; i < 60; i++) {
            graph.addEdge(i, 1000 + i);
        }
        const result = louvain(graph);
        assertWellFormed(graph, result);

        const assignment = new Map<NodeId, number>();
        result.communities.forEach((community, id) => {
            for (const node of community) {
                assignment.set(node, id);
            }
        });
        for (let i = 0; i < 60; i++) {
            expect(assignment.get(1000 + i)).toBe(assignment.get(i));
        }
        expect(result.communities.length).toBe(5);
    });

    it("finds structure on a weighted planted partition the same as the reference", () => {
        const { graph } = plantedPartition(8, 40, 0.25, 0.01, 11);
        const random = rng(3);
        const weighted = new Graph({ directed: false });
        for (const node of graph.nodes()) {
            weighted.addNode(node.id);
        }
        for (const edge of graph.edges()) {
            weighted.addEdge(edge.source, edge.target, 0.5 + 4 * random());
        }
        const optimised = louvain(weighted);
        const reference = louvain(weighted, { useOptimized: false });

        assertWellFormed(weighted, optimised);
        expect(optimised.communities.length).toBeGreaterThan(1);
        expect(optimised.modularity).toBeGreaterThan(reference.modularity - 0.01);
    });
});
