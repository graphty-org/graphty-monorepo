import { NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { PatternedLineRenderer, type PatternType } from "../../src/meshes/PatternedLineRenderer";
import { borderRing, type Point2 } from "../../src/meshes/shapeOutlines";

/**
 * Cytoscape desktop's line types that are strokes of their own -- slashes, arrows, a chevron line,
 * parallel lines -- as edge line patterns and node border styles. Each is drawn as its own glyph,
 * never as the solid line they were drawn as before.
 */

/** The x and z extent of an element's geometry, in units of the line's width (y is 0). */
function extentOf(pattern: PatternType, scene: Scene): { x: number[]; z: number[]; tiltedForward: boolean } {
    const line = PatternedLineRenderer.create(pattern, new Vector3(0, 0, 0), new Vector3(10, 0, 0), scene, {
        width: 0.1,
        color: "#505050",
        opacity: 1,
        is2DMode: true,
    });
    const mesh = line.elements[0].batchMesh;
    assert.isNotNull(mesh, `${pattern}: its element is drawn from a batch`);
    const positions = Array.from(mesh?.getVerticesData("position") ?? []);
    const xs = positions.filter((_v, i) => i % 3 === 0);
    const zs = positions.filter((_v, i) => i % 3 === 2);
    // the vertex farthest to the line's left (-z, up on screen): ahead of the middle for "/", behind for "\"
    const top = zs.indexOf(Math.min(...zs));
    line.dispose();
    return { x: [Math.min(...xs), Math.max(...xs)], z: [Math.min(...zs), Math.max(...zs)], tiltedForward: xs[top] > 0 };
}

describe("glyph edge line patterns", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    afterEach(() => {
        scene.getEngine().dispose();
    });

    test("every Cytoscape stroke line type is drawn as pattern elements on a straight edge", () => {
        for (const type of [
            "double",
            "forward-slash",
            "backward-slash",
            "vertical-slash",
            "separate-arrow",
            "contiguous-arrow",
        ] as const) {
            assert.isTrue(EdgeMesh.drawsAsPattern({ line: { type } }), type);
        }
    });

    test("slashes cross the line two widths tall, leaning forward, back or not at all", () => {
        const forward = extentOf("forward-slash", scene);
        const backward = extentOf("backward-slash", scene);
        const vertical = extentOf("vertical-slash", scene);

        for (const slash of [forward, backward, vertical]) {
            assert.approximately(slash.z[1] - slash.z[0], 2, 0.2);
        }
        assert.isTrue(forward.tiltedForward);
        assert.isFalse(backward.tiltedForward);
        assert.isBelow(vertical.x[1] - vertical.x[0], 0.5);
    });

    test("parallel lines, separate arrows and a chevron line are glyphs of their own, not a dot", () => {
        const double = extentOf("double", scene);
        const arrow = extentOf("separate-arrow", scene);
        const chevron = extentOf("contiguous-arrow", scene);

        // two bars four widths long, overlapping their neighbors into one line
        assert.approximately(double.x[1] - double.x[0], 4, 1e-6);
        // an arrow two widths long
        assert.approximately(arrow.x[1] - arrow.x[0], 2, 1e-6);
        // a bar under a chevron wider than the bar
        assert.approximately(chevron.x[1] - chevron.x[0], 4, 1e-6);
        assert.isAbove(chevron.z[1], 0.5);
    });
});

describe("stroked node borders", () => {
    // a circle-ish outline, counter-clockwise, 40 units round
    const outline: Point2[] = Array.from({ length: 32 }, (_v, i): Point2 => {
        const a = (i / 32) * Math.PI * 2;
        return [Math.cos(a) * 6.4, Math.sin(a) * 6.4];
    });
    const radius = ([x, y]: Point2): number => Math.hypot(x, y);

    test("zigzag and sine wave borders are one closed line waving across the band", () => {
        for (const style of ["zigzag", "sinewave"]) {
            const [ring, ...rest] = borderRing(outline, 1, style);
            assert.lengthOf(rest, 0, style);
            assert.isTrue(ring.closed, style);
            const radii = ring.inner.map(radius);
            // it reaches toward both edges of the band, which a solid ring's inner edge never leaves
            assert.isAbove(Math.max(...radii) - Math.min(...radii), 0.5, style);
        }
    });

    test("slash borders are short strokes across the band", () => {
        for (const style of ["forward-slash", "backward-slash", "vertical-slash"]) {
            const pieces = borderRing(outline, 1, style);
            assert.isAbove(pieces.length, 20, style);
            assert.isTrue(
                pieces.every((p) => !p.closed && p.inner.length === 2),
                style,
            );
            // each stroke runs from the band's inner edge to its outer edge
            const [a, b] = pieces[0].inner;
            assert.approximately(Math.abs(radius(b) - radius(a)), 1, 0.15, style);
        }
    });

    test("a separate-arrow border is a ring of arrows, each a shaft and a head", () => {
        const pieces = borderRing(outline, 1, "separate-arrow");
        assert.isAbove(pieces.length, 4);
        assert.strictEqual(pieces.length % 2, 0);
    });
});
