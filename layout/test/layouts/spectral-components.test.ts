import assert from "node:assert";

import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, it } from "vitest";

import { spectral } from "../../src";

// three components: a 12-node cycle (nodes 0-11), a 6-node path (12-17) and a triangle (18-20), plus an isolate (21)
const edges: [number, number][] = [
    ...Array.from({ length: 12 }, (_, i): [number, number] => [i, (i + 1) % 12]),
    ...Array.from({ length: 5 }, (_, i): [number, number] => [12 + i, 13 + i]),
    [18, 19],
    [19, 20],
    [20, 18],
];
const parts = [
    Array.from({ length: 12 }, (_, i) => i),
    Array.from({ length: 6 }, (_, i) => 12 + i),
    [18, 19, 20],
    [21],
];
const s = fromEdgeArrays({
    directed: false,
    nodeCount: 22,
    src: Uint32Array.from(edges.map(([u]) => u)),
    dst: Uint32Array.from(edges.map(([, v]) => v)),
});

describe("spectral over several connected components", () => {
    for (const dim of [2, 3] as const) {
        it(`lays out each component apart, none on one point (${dim}D)`, () => {
            const r = spectral(s, { seed: 1, dim, scale: 2, center: dim === 2 ? [1, 1] : [1, 1, 1] });
            const at = (i: number): number[] => Array.from(r.positions.subarray(dim * i, dim * i + 2));
            const boxes = parts.map((nodes) => {
                const xs = nodes.map((i) => at(i)[0]);
                const ys = nodes.map((i) => at(i)[1]);
                return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
            });
            assert.ok(r.positions.every(Number.isFinite));
            // every component of more than one node is spread out, not collapsed
            for (const [p, b] of boxes.slice(0, 3).entries()) {
                assert.ok(b.x1 - b.x0 + (b.y1 - b.y0) > 0.05, `component ${p} collapsed: ${JSON.stringify(b)}`);
            }
            // within each component, the nodes are distinct
            for (const nodes of parts.slice(0, 3)) {
                const keys = new Set(
                    nodes.map((i) =>
                        at(i)
                            .map((v) => v.toFixed(4))
                            .join(","),
                    ),
                );
                assert.equal(keys.size, nodes.length);
            }
            // no two components' bounding boxes overlap in the plane
            for (let a = 0; a < boxes.length; a++) {
                for (let b = a + 1; b < boxes.length; b++) {
                    const [p, q] = [boxes[a], boxes[b]];
                    const apart = p.x1 < q.x0 || q.x1 < p.x0 || p.y1 < q.y0 || q.y1 < p.y0;
                    assert.ok(apart, `components ${a} and ${b} overlap`);
                }
            }
            // the farthest node is `scale` from the center
            let farthest = 0;
            for (let i = 0; i < r.n; i++) {
                const p = Array.from(r.positions.subarray(dim * i, dim * i + dim));
                farthest = Math.max(farthest, Math.hypot(...p.map((v) => v - 1)));
            }
            assert.ok(Math.abs(farthest - 2) < 1e-5, `${farthest}`);
        });
    }

    it("is the same layout for the same seed", () => {
        assert.deepEqual(spectral(s, { seed: 5 }).positions, spectral(s, { seed: 5 }).positions);
    });
});
