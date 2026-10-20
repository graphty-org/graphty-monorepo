/**
 * @file A node border that is not seen still takes its room: Cytoscape desktop draws a node whose border sits
 * inside its size at opacity 0 with its fill out to the middle of the border, where the stroke it would be starts to
 * cover the fill.
 */
import { NullEngine, Scene } from "@babylonjs/core";
import { assert, beforeEach, test } from "vitest";

import { MeshCache } from "../../src/meshes/MeshCache";
import { NodeMesh } from "../../src/meshes/NodeMesh";

let scene: Scene;
let cache: MeshCache;

beforeEach(() => {
    scene = new Scene(new NullEngine());
    cache = new MeshCache();
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
