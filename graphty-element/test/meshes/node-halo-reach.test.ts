/**
 * @file A node's underlay and overlay reach their padding past the node's box on every side, wherever its border
 * sits: a centered or inside border shrinks a solid's fill, and the plate must not shrink with it (issue #10403).
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

for (const type of ["sphere", "box", "ellipse"] as const) {
    for (const position of ["outside", "center", "inside"] as const) {
        for (const kind of ["underlay", "overlay"] as const) {
            test(`a ${kind} padded 0.3 round a ${type} with its border ${position} reaches 0.3 past the box`, () => {
                const options = { styleId: `${type}-${position}-${kind}`, is2D: true, size: 1 };
                const shape = { type, size: 1, sizeMode: "uniform" as const };
                const border = { width: 0.3, position };
                const fill = NodeMesh.create(cache, options, { shape, border }, scene);
                const halo = NodeMesh.createHalo(
                    cache,
                    options,
                    { shape, border },
                    { color: "#ff0000", opacity: 1, padding: 0.3 },
                    kind,
                    fill,
                    scene,
                );

                assert.exists(halo);
                halo.computeWorldMatrix(true);
                const box = halo.getBoundingInfo().boundingBox;
                const per = NodeMesh.extentPerSize(shape);
                // half-width past the node's box, in units of size: the padding, within 1% of the border
                const reach = ((box.maximumWorld.x - box.minimumWorld.x) / 2 - 0.5 * per) / per;
                assert.approximately(reach, 0.3, 0.003);
            });
        }
    }
}
