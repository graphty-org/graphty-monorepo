/**
 * @file A border's position on a solid node shape (sphere, box, polyhedra) under the default size mode: "inside"
 * puts the ring's outer edge at the node's size, so the fill shrinks; "center" runs the ring's middle along it
 * (issue #10403).
 */
import { type AbstractMesh, NullEngine, Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import type { NodeStyleConfig } from "../../src/config/NodeStyle";
import { MeshCache } from "../../src/meshes/MeshCache";
import { NODE_EXTENT_PER_SIZE, NodeMesh } from "../../src/meshes/NodeMesh";

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
 * How wide a mesh is drawn along x in world units.
 * @param mesh - The mesh.
 * @returns Its world width.
 */
function widthOf(mesh: AbstractMesh): number {
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;

    return box.maximumWorld.x - box.minimumWorld.x;
}

/**
 * The fill's and the ring's widths for one shape and border position.
 * @param type - The solid shape.
 * @param position - Where the border sits.
 * @returns The two widths.
 */
function drawn(
    type: NonNullable<NodeStyleConfig["shape"]>["type"],
    position: "inside" | "center" | "outside",
): { fill: number; ring: number } {
    const options = { styleId: `${String(type)}-${position}`, is2D: true, size: 1 };
    const shape = { type, size: 1 };
    const border = { width: 0.2, position, color: "#0000ff" };
    const fill = NodeMesh.create(cache, options, { shape, border }, scene);
    const ring = NodeMesh.createBorder(cache, options, { shape, border }, fill, scene);
    assert.exists(ring);

    return { fill: widthOf(fill), ring: widthOf(ring) };
}

describe("a border's position on a solid shape (#10403)", () => {
    for (const type of ["sphere", "box", "icosahedron"] as const) {
        test(`an inside border on a ${type} ends where the plain ${type} ends, and its fill shrinks`, () => {
            const outside = drawn(type, "outside");
            const inside = drawn(type, "inside");
            const center = drawn(type, "center");
            // the border's width in world units; the ring's outer edge is the plain outline offset (issue #10438)
            const width = 0.2 * NODE_EXTENT_PER_SIZE;

            assert.isAbove(outside.ring - outside.fill, width);
            // inside: the fill comes in by the whole width on every side, and the ring ends where the plain fill does
            assert.approximately(inside.fill, outside.fill - 2 * width, 0.02);
            assert.approximately(inside.ring, outside.fill, 0.02);
            // center: by half the width, so the ring's middle runs along the plain fill's edge
            assert.approximately(center.fill, outside.fill - width, 0.02);
            // the outline offset half as far as the outside ring's: a mitred corner reaches out in step with it
            assert.approximately(center.ring, (outside.ring + outside.fill) / 2, 0.02);
        });
    }
});
