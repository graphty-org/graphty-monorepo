/**
 * @file The traced outline of triangles that do not fill their convex hull follows their hollows (issue #10492).
 * An L of three unit squares has area 3 and a convex hull of area 3.5: an outline that bridged the notch, as the hull
 * does, left the background showing between a ring round it and the fill.
 */
import { assert, describe, test } from "vitest";

import { outlineOfTriangles, type Point2, silhouetteOutline } from "../../src/meshes/shapeOutlines";

/** Three unit squares in an L: (0,0), (1,0) and (0,1), two triangles each. */
const L_POINTS: Point2[] = [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [0, 2],
    [1, 2],
];
const L_TRIANGLES = [0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 3, 4, 7, 3, 7, 6];

/**
 * The area inside a closed outline.
 * @param outline - Its points in order.
 * @returns The area, whichever way round it runs.
 */
function area(outline: readonly Point2[]): number {
    let twice = 0;
    outline.forEach(([x, y], n) => {
        const [u, v] = outline[(n + 1) % outline.length];
        twice += x * v - u * y;
    });
    return Math.abs(twice) / 2;
}

describe("the outline of triangles with a hollow", () => {
    test("follows the notch of an L instead of bridging it", () => {
        // the trace may lie a grid cell (2 / 256 of the L) outside the squares all round
        const slack = 4 * 2 * (2 / 256) * 2;
        assert.approximately(area(silhouetteOutline(L_POINTS, L_TRIANGLES)), 3, slack);
        assert.approximately(area(outlineOfTriangles(L_POINTS, L_TRIANGLES)), 3, slack);
    });
});
