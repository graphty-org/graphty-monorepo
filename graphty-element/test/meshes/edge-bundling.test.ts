/**
 * Force-directed edge bundling (src/meshes/edgeBundling.ts): near-parallel edges gather, strength 0 draws them
 * straight, and an edge with nothing compatible stays straight.
 */
import { assert, describe, it } from "vitest";

import { type BundleEdge, bundleEdges, ForceBundles } from "../../src/meshes/edgeBundling";

/** Twenty near-parallel edges, 2 apart, from x = 0 to x = 40. */
const PARALLEL: BundleEdge[] = Array.from({ length: 20 }, (_, i) => ({
    src: { x: 0, y: i * 2 },
    dst: { x: 40, y: i * 2 + 1 },
}));

/**
 * The mean distance between every two edges' middles: each edge's middle point when it has one, else its chord's.
 * @param edges - The edges.
 * @param points - Their inner points.
 * @returns The mean distance.
 */
function meanMiddleDistance(edges: readonly BundleEdge[], points: readonly number[][]): number {
    const middles = edges.map((edge, e) => {
        const own = points[e];
        if (own.length === 0) {
            return { x: (edge.src.x + edge.dst.x) / 2, y: (edge.src.y + edge.dst.y) / 2 };
        }
        const k = Math.floor(own.length / 4) * 2;
        return { x: own[k], y: own[k + 1] };
    });
    let sum = 0;
    let pairs = 0;
    for (let a = 0; a < middles.length; a++) {
        for (let b = a + 1; b < middles.length; b++) {
            sum += Math.hypot(middles[a].x - middles[b].x, middles[a].y - middles[b].y);
            pairs++;
        }
    }
    return sum / pairs;
}

describe("bundleEdges", () => {
    it("gathers near-parallel edges: their middles end at least twice as close", () => {
        const straight = meanMiddleDistance(PARALLEL, bundleEdges(PARALLEL, { strength: 0, iterations: 50 }));
        const bundled = meanMiddleDistance(PARALLEL, bundleEdges(PARALLEL, { strength: 1, iterations: 50 }));
        assert.isBelow(bundled, straight / 2);
    });

    it("strength 0 draws every edge straight", () => {
        for (const points of bundleEdges(PARALLEL, { strength: 0, iterations: 50 })) {
            assert.deepEqual(points, []);
        }
    });

    it("leaves an edge with nothing compatible straight", () => {
        const edges: BundleEdge[] = [
            { src: { x: 0, y: 0 }, dst: { x: 10, y: 0 } },
            { src: { x: 100, y: 0 }, dst: { x: 100, y: 10 } },
        ];
        const [first] = bundleEdges(edges, { strength: 1, iterations: 50 });
        for (let i = 1; i < first.length; i += 2) {
            assert.closeTo(first[i], 0, 1e-9);
        }
    });
});

describe("ForceBundles", () => {
    it("works the bundles out once a frame however many bundled edges move in it", async () => {
        const bundles = new ForceBundles<number>();
        const ids = PARALLEL.map((_, i) => i);
        const read = (i: number): { edge: BundleEdge; options: { strength: number; iterations: number } } => ({
            edge: PARALLEL[i],
            options: { strength: 1, iterations: 5 },
        });
        // one frame: every edge moves, then is placed
        for (const id of ids) {
            bundles.touch();
            bundles.bendsOf(id, () => ids, read);
        }
        assert.strictEqual(bundles.version, 1);
        // a change made after the frame's read waits for the next frame, which works them out once more
        assert.isTrue(bundles.stale);
        await Promise.resolve();
        for (const id of ids) {
            bundles.touch();
            bundles.bendsOf(id, () => ids, read);
        }
        assert.strictEqual(bundles.version, 2);
    });
});
