/**
 * @file A node's shadow is the size of the node's box wherever its border sits: a centered or inside border draws
 * a solid's fill in, and the shadow, grown from that fill's outline, must grow back out by the same inset
 * (issue #10493).
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
            const mode = sizeMode ?? "scale";
            test(`a sharp shadow under a ${mode} ${type} with its border ${position} is as wide as its box`, () => {
                const shape = { type, size: 1, ...(sizeMode === undefined ? {} : { sizeMode }) };
                const border = { width: 0.3, position };
                // the node's box: its fill with the border outside, which never draws the fill in
                const whole = { styleId: `${mode}-${type}-whole`, is2D: true, size: 1 };
                const box = halfWidth(NodeMesh.create(cache, whole, { shape, border: { width: 0.3 } }, scene));
                const options = { styleId: `${mode}-${type}-${position}-shadow`, is2D: true, size: 1 };
                const fill = NodeMesh.create(cache, options, { shape, border }, scene);
                const layers = NodeMesh.createShadow(
                    cache,
                    options,
                    { shape, border },
                    { color: "#000000", opacity: 1, offsetX: 0, offsetY: 0, blur: 0 },
                    fill,
                    scene,
                );

                assert.lengthOf(layers, 1);
                const per = NodeMesh.extentPerSize(shape);
                // within 1% of the border of the node's box
                assert.approximately((halfWidth(layers[0]) - box) / per, 0, 0.003);
            });
        }
    }
}
