/**
 * @file A node's underlay and overlay reach their padding past the node's box on every side, wherever its border
 * sits: a centered or inside border can draw a solid's fill in, and the plate must not shrink with it (issue #10403).
 */
import { type AbstractMesh, NullEngine, Scene } from "@babylonjs/core";
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

const halfWidth = (mesh: AbstractMesh): number => {
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    return (box.maximumWorld.x - box.minimumWorld.x) / 2;
};

for (const sizeMode of ["uniform", undefined] as const) {
    for (const type of ["sphere", "box", "ellipse"] as const) {
        for (const position of ["outside", "center", "inside"] as const) {
            for (const kind of ["underlay", "overlay"] as const) {
                const mode = sizeMode ?? "scale";
                test(`a ${kind} padded 0.3 round a ${mode} ${type} with its border ${position} reaches 0.3 past its box`, () => {
                    const shape = { type, size: 1, ...(sizeMode === undefined ? {} : { sizeMode }) };
                    const border = { width: 0.3, position };
                    // the node's box: its fill with the border outside, which never draws the fill in
                    const whole = { styleId: `${mode}-${type}-whole`, is2D: true, size: 1 };
                    const box = halfWidth(NodeMesh.create(cache, whole, { shape, border: { width: 0.3 } }, scene));
                    const options = { styleId: `${mode}-${type}-${position}-${kind}`, is2D: true, size: 1 };
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
                    const per = NodeMesh.extentPerSize(shape);
                    // half-width past the node's box, in units of size: the padding, within 1% of the border
                    assert.approximately((halfWidth(halo) - box) / per, 0.3, 0.003);
                });
            }
        }
    }
}
