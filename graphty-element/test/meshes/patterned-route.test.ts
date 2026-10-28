/**
 * @file A patterned line laid along a route (issue #3102): its dashes, dots and wave pieces are spread along the
 * route's own length and turn its corners, rather than along the straight line between its two ends.
 */
import { NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { PatternedLineMesh } from "../../src/meshes/PatternedLineMesh";
import type { PatternType } from "../../src/meshes/PatternedLineRenderer";

/** An L: ten along x, then ten up y. */
const ELL = [new Vector3(0, 0, 0), new Vector3(10, 0, 0), new Vector3(10, 10, 0)];

/**
 * How far a point is from the nearest segment of a route.
 * @param p - The point.
 * @param route - The route.
 * @returns The distance.
 */
function offRoute(p: Vector3, route: readonly Vector3[]): number {
    let best = Number.POSITIVE_INFINITY;
    for (let i = 1; i < route.length; i++) {
        const [a, b] = [route[i - 1], route[i]];
        const ab = b.subtract(a);
        const t = Math.max(0, Math.min(1, Vector3.Dot(p.subtract(a), ab) / ab.lengthSquared()));
        best = Math.min(best, Vector3.Distance(p, a.add(ab.scale(t))));
    }
    return best;
}

describe("a patterned line laid along a route", () => {
    let scene: Scene;
    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });
    afterEach(() => {
        scene.getEngine().dispose();
    });

    const line = (pattern: PatternType): PatternedLineMesh =>
        new PatternedLineMesh(pattern, ELL[0], ELL[2], scene, { width: 0.5, color: "#505050", opacity: 1 });

    for (const pattern of ["dash", "dot", "dash-dot", "zigzag", "forward-slash"] as const) {
        test(`${pattern}: every element sits on the route and the elements reach both of its legs`, () => {
            const mesh = line(pattern);
            mesh.updatePath(ELL);
            assert.isAbove(mesh.elements.length, 2);
            for (const element of mesh.elements) {
                assert.isBelow(offRoute(element.position, ELL), 1e-6, `${pattern} element off the route`);
            }
            // the chord from (0,0) to (10,10) passes through neither leg's middle: elements are on both legs
            assert.isTrue(mesh.elements.some((e) => e.position.y < 1e-6 && e.position.x < 9));
            assert.isTrue(mesh.elements.some((e) => e.position.x > 10 - 1e-6 && e.position.y > 1));
        });
    }

    test("a dash pattern holds as many elements as a straight line of the route's length", () => {
        const routed = line("dash");
        routed.updatePath(ELL);
        const straight = new PatternedLineMesh("dash", Vector3.Zero(), new Vector3(20, 0, 0), scene, {
            width: 0.5,
            color: "#505050",
            opacity: 1,
        });
        assert.strictEqual(routed.elements.length, straight.elements.length);
    });

    test("laid along two points it is the straight line update() lays, and its route is those two points", () => {
        const a = line("dash");
        const b = line("dash");
        a.update(new Vector3(1, 2, 0), new Vector3(7, 5, 0));
        b.updatePath([new Vector3(1, 2, 0), new Vector3(7, 5, 0)]);
        assert.deepEqual(
            a.elements.map((e) => e.position.asArray()),
            b.elements.map((e) => e.position.asArray()),
        );
        assert.lengthOf(b.drawnRoute() ?? [], 2);
    });

    test("its drawn route is the route it was laid along", () => {
        const mesh = line("dot");
        mesh.updatePath(ELL);
        assert.deepEqual(
            mesh.drawnRoute()?.map((p) => p.asArray()),
            ELL.map((p) => p.asArray()),
        );
    });
});
