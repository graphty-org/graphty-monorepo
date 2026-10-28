/**
 * @file A node border that is not seen still takes its room: Cytoscape desktop draws a node whose border sits
 * inside its size at opacity 0 with its fill out to the middle of the border, where the stroke it would be starts to
 * cover the fill.
 */
import { NullEngine, Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, test } from "vitest";

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

for (const [position, fillWidth] of [
    ["inside", 30],
    ["center", 36],
    ["outside", 36],
] as const) {
    test(`a border of opacity 0 ${position} a 36-wide node draws its fill ${String(fillWidth)} wide and no ring`, () => {
        const options = { styleId: `clear-${position}`, is2D: true, size: 36 };
        const shape = { type: "ellipse" as const, size: 36, sizeMode: "diameter" as const };
        const border = { width: 6, position, opacity: 0 };
        const fill = NodeMesh.create(cache, options, { shape, border }, scene);

        assert.approximately(fill.getBoundingInfo().boundingBox.extendSize.x * 2, fillWidth, 0.05);
        assert.isNull(NodeMesh.createBorder(cache, options, { shape, border }, fill, scene));
    });
}

for (const [size, outer] of [
    [0, 1],
    [0.5, 1.5],
    [36, 37],
] as const) {
    test(`a border 1 wide centered on a ${String(size)}-wide node reaches ${String(outer)} across, as a stroke does`, () => {
        // Pajek's x_fact 0 vertex is an ellipse of radius 0 stroked 1 wide: a dot 1 across, not 2
        const options = { styleId: `centered-${String(size)}`, is2D: true, size };
        const shape = { type: "ellipse" as const, size, sizeMode: "diameter" as const };
        const border = { width: 1, position: "center" as const };
        const fill = NodeMesh.create(cache, options, { shape, border }, scene);
        const ring = NodeMesh.createBorder(cache, options, { shape, border }, fill, scene);

        assert.isNotNull(ring);
        ring.computeWorldMatrix(true);
        const box = ring.getBoundingInfo().boundingBox;
        assert.approximately(box.maximumWorld.x - box.minimumWorld.x, outer, 0.02);
    });
}
