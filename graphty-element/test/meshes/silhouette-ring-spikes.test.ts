/**
 * @file A ring round a traced silhouette (a model's, or a solid that is not convex, such as a torus-knot) keeps its
 * width all the way round. The silhouette is traced along a grid, and a triangle's corner marks the cell it lies in,
 * so a round outline came back with one-cell bumps at its vertices; each bump's square corners were mitred out
 * about 1.4 widths, and the ring showed spikes past its width (bs-torus-knot-outside-3d-near-a4 read off center).
 */
import { assert, describe, test } from "vitest";

import { mitredEdges, type Point2, silhouetteOutline } from "../../src/meshes/shapeOutlines";

/**
 * A disc of radius 1 as a fan of triangles round its middle.
 * @param sides - How many triangles.
 * @returns Its points (the middle first) and its triangles.
 */
function disc(sides: number): { points: Point2[]; triangles: number[] } {
    const points: Point2[] = [[0, 0]];
    const triangles: number[] = [];
    for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        points.push([Math.cos(a), Math.sin(a)]);
        triangles.push(0, 1 + i, 1 + ((i + 1) % sides));
    }
    return { points, triangles };
}

describe("a ring round a traced silhouette", () => {
    test("reaches its width past a disc's outline and no further than its sides' own mitres", () => {
        const sides = 48;
        const { points, triangles } = disc(sides);
        const outline = silhouetteOutline(points, triangles);
        const width = 0.3;
        const [, outer] = mitredEdges(outline, [0, width]);
        const reach = Math.max(...outer.map(([x, y]) => Math.hypot(x, y) - 1));

        // the disc's own sides turn 360 / 48 degrees at each corner, mitred out width / cos(half of that); the traced
        // outline may lie a grid cell (2 / 256 of the disc) off the circle, and its smoothing a cell more
        const cell = 2 / 256;
        assert.isAtMost(reach, width / Math.cos(Math.PI / sides) + 2 * cell);
    });
});
