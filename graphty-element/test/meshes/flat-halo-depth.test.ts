/**
 * @file A 3D halo round a flat shape (a star, a slab) is no thicker than the node: grown in depth like its face, its
 * side walls reached through the border's front face and drew halo-colored lines across the border band (issue #10494).
 */
import { NullEngine, Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, test } from "vitest";

import { haloAxisScale } from "../../src/meshes/flatHalo";
import { MeshCache } from "../../src/meshes/MeshCache";
import { NodeMesh } from "../../src/meshes/NodeMesh";

let scene: Scene;

beforeEach(() => {
    scene = new Scene(new NullEngine());
});

afterEach(() => {
    scene.getEngine().dispose();
});

for (const type of ["star", "box"] as const) {
    test(`a 3D halo round a ${type} with an outside border is no thicker than the node`, () => {
        const style = { shape: { type, size: 1 }, border: { width: 0.2 } };
        const node = NodeMesh.create(
            new MeshCache(),
            { styleId: `halo-depth-${type}`, is2D: false, size: 1 },
            style,
            scene,
        );
        node.computeWorldMatrix(true);
        const extent = node.getBoundingInfo().boundingBox.extendSize;
        const grow = haloAxisScale(extent, 1.45, 0.2 * NodeMesh.extentPerSize(style.shape));

        if (type === "box") {
            // a solid grows in depth like across its face
            assert.isAbove(grow.z, 1);
        } else {
            // the star is a slab: its depth is a sliver of its face
            assert.isAtMost(extent.z, Math.min(extent.x, extent.y) / 4);
            assert.isAtMost(grow.z, 1);
        }
    });
}
