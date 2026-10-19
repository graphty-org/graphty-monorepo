/**
 * The arcs the direction-optimizing BFS reads (issue #1358), counted on the device at cadence 1: a top-down level
 * reads its frontier's out-arcs (`frontierDegreeSum`), a bottom-up level the in-arcs its sweep scanned (the
 * `arcsScanned` delta). A 10,000-node binary tree must stay within 1.1x its arc count (before the fix the directed
 * one switched to bottom-up a level early, on the unvisited OUT-degree sum, and read 11,808 arcs for 9,999), and a
 * power-law and a small-world graph must still switch and read under 0.7x theirs. The sizes are not scaled by
 * `gpuScale()`: the switch depends on the level shapes of these sizes, and the traversals take about 2 s on
 * lavapipe. run-twice exempt: a count of reads, not a kernel result; bfs.test.ts runs the kernels twice.
 */

import { type GraphSnapshot } from "@graphty/graph-format";
import { type TestContext } from "vitest";

import { type BfsTuning, bfsWithTuning } from "../../src/algorithms/bfs.js";
import { type EdgeSpec, snapshotOf, xorshift } from "../helpers/graphs.js";
import { bfsOracle } from "../oracle/traversal.js";
import { acquire, requireGpu } from "../setup/gpu.js";

/**
 * The arcs one traversal from vertex 0 read, summed over its levels.
 * @param ctx - the context
 * @param s - the snapshot
 * @param tuning - the direction rule
 * @returns the reads and the depths
 */
async function arcReads(
    ctx: Awaited<ReturnType<typeof acquire>>,
    s: GraphSnapshot,
    tuning: BfsTuning,
): Promise<{ readonly reads: number; readonly depth: Uint32Array }> {
    let reads = 0;
    let scanned = 0;
    let bottomUp = 0;
    const result = await bfsWithTuning(ctx, s, 0, undefined, {
        ...tuning,
        levelsPerSubmit: 1,
        onLevel: (_level, block) => {
            const up = Number(block.bottomUpLevels) > bottomUp;
            reads += up ? Number(block.arcsScanned) - scanned : Number(block.frontierDegreeSum);
            scanned = Number(block.arcsScanned);
            bottomUp = Number(block.bottomUpLevels);
        },
    });
    return { reads, depth: result.depth };
}

/**
 * A complete binary tree, node i's children 2i + 1 and 2i + 2.
 * @param n - the node count
 * @returns the edges
 */
function binaryTree(n: number): EdgeSpec[] {
    const edges: EdgeSpec[] = [];
    for (let i = 1; i < n; i++) {
        edges.push([(i - 1) >> 1, i]);
    }
    return edges;
}

/**
 * Preferential attachment: each new node attaches to m endpoints of earlier edges.
 * @param n - the node count
 * @param m - the edges per new node
 * @returns the edges
 */
function powerLaw(n: number, m: number): EdgeSpec[] {
    const rand = xorshift(11);
    const edges: EdgeSpec[] = [];
    const ends = [0];
    for (let i = 1; i < n; i++) {
        for (let j = 0; j < Math.min(m, i); j++) {
            const t = ends[Math.floor(rand() * ends.length)];
            edges.push([i, t]);
            ends.push(t, i);
        }
    }
    return edges;
}

/**
 * A Watts-Strogatz ring: each node links to its next k neighbours, a fraction p rewired at random.
 * @param n - the node count
 * @param k - the neighbours per side
 * @param p - the rewiring probability
 * @returns the edges
 */
function smallWorld(n: number, k: number, p: number): EdgeSpec[] {
    const rand = xorshift(7);
    const edges: EdgeSpec[] = [];
    for (let i = 0; i < n; i++) {
        for (let j = 1; j <= k; j++) {
            edges.push([i, rand() < p ? Math.floor(rand() * n) : (i + j) % n]);
        }
    }
    return edges;
}

describe("breadthFirstSearch arc reads (issue #1358)", () => {
    it("stays top-down on a 10,000-node binary tree, directed and undirected, reading each arc about once", async (t: TestContext) => {
        requireGpu(t);
        const ctx = await acquire({ label: "bfs-arc-reads-tree" });
        for (const directed of [true, false]) {
            const tree = snapshotOf(binaryTree(10_000), { directed });
            const { reads, depth } = await arcReads(ctx, tree, {});
            expect(Array.from(depth)).toEqual(Array.from(bfsOracle(tree, 0).depth));
            expect(reads, directed ? "directed" : "undirected").toBeLessThanOrEqual(1.1 * tree.arcCount);
            ctx.release(tree);
        }
    });

    it("switches to bottom-up on a power-law and a small-world graph and reads fewer arcs than top-down", async (t: TestContext) => {
        requireGpu(t);
        const ctx = await acquire({ label: "bfs-arc-reads-switch" });
        for (const [name, edges] of [
            ["power-law", powerLaw(10_000, 4)],
            ["small-world", smallWorld(10_000, 8, 0.1)],
        ] as const) {
            const g = snapshotOf(edges);
            const plain = await arcReads(ctx, g, { direction: "top-down" });
            const auto = await arcReads(ctx, g, {});
            expect(Array.from(auto.depth), name).toEqual(Array.from(plain.depth));
            expect(plain.reads, name).toBe(g.arcCount);
            expect(auto.reads, name).toBeLessThan(0.7 * g.arcCount);
            ctx.release(g);
        }
    });
});
