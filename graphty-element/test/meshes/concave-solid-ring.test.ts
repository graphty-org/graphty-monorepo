/**
 * @file A ring round a solid that is not convex, such as a torus-knot, follows the solid's own outline: a ring
 * built round its convex hull bridged the hollows between the knot's lobes, so the background showed between the
 * fill and the ring (issue #10492).
 */
import { type AbstractMesh, NullEngine, Ray, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import type { NodeStyleConfig } from "../../src/config/NodeStyle";
import { MeshCache } from "../../src/meshes/MeshCache";
import { NodeMesh } from "../../src/meshes/NodeMesh";

let scene: Scene;
let cache: MeshCache;

beforeEach(() => {
    scene = new Scene(new NullEngine());
    cache = new MeshCache();
});

afterEach(() => {
    scene.getEngine().dispose();
});

/**
 * Whether a line along z through a point meets a mesh.
 * @param mesh - The mesh.
 * @param x - The point's x.
 * @param y - The point's y.
 * @returns Whether it does.
 */
function covers(mesh: AbstractMesh, x: number, y: number): boolean {
    return mesh.intersects(new Ray(new Vector3(x, y, 100), new Vector3(0, 0, -1), 200), false).hit;
}

/**
 * The widest run of background between a node's fill and its ring, walking out from the middle along many
 * directions: from the last point the fill covers to the first one the ring covers past it.
 * @param type - The solid shape.
 * @returns The run, in world units, and the step it was walked in.
 */
function widestGap(type: NonNullable<NodeStyleConfig["shape"]>["type"]): { gap: number; step: number } {
    const options = { styleId: `${String(type)}-gap`, is2D: true, size: 1 };
    const shape = { type, size: 1 };
    const border = { width: 0.1, position: "outside" as const, color: "#0000ff" };
    const fill = NodeMesh.create(cache, options, { shape, border }, scene);
    const ring = NodeMesh.createBorder(cache, options, { shape, border }, fill, scene);
    assert.exists(ring);
    // the cache keeps its meshes parked off screen: measure both at the origin
    for (const mesh of [fill, ring]) {
        mesh.position.setAll(0);
        mesh.computeWorldMatrix(true);
    }
    const box = ring.getBoundingInfo().boundingBox;
    const reach = Math.max(box.maximumWorld.x, box.maximumWorld.y, -box.minimumWorld.x, -box.minimumWorld.y);
    const step = reach / 200;

    let gap = 0;
    for (let a = 0; a < 90; a++) {
        const [dx, dy] = [Math.cos((a * Math.PI) / 45), Math.sin((a * Math.PI) / 45)];
        let lastFill = 0;
        for (let r = 0; r <= reach; r += step) {
            if (covers(fill, r * dx, r * dy)) {
                lastFill = r;
            }
        }
        for (let r = lastFill; r <= reach; r += step) {
            if (covers(ring, r * dx, r * dy)) {
                gap = Math.max(gap, r - lastFill);
                break;
            }
        }
    }

    return { gap, step };
}

describe("a ring round a solid that is not convex (#10492)", () => {
    test("a torus-knot's border touches its fill all the way round", () => {
        const { gap, step } = widestGap("torus-knot");

        // within the walk's step and the outline's grid cell (1/256 of the shape) of touching
        assert.isAtMost(gap, 3 * step);
    });

    test("a sphere's border still touches its fill", () => {
        const { gap, step } = widestGap("sphere");

        assert.isAtMost(gap, 2 * step);
    });
});
