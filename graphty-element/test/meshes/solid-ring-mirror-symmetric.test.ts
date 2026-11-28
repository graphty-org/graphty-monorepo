/**
 * @file A solid's outer border in a 3D view, seen from a camera the node is mirror-symmetric to, is drawn
 * mirror-symmetric (issue #10502). A cylinder seen from above has seam vertices that project a rounding error apart;
 * the hull kept both, and the side between them, a 1e-16 long edge with a direction of noise, cut one of the two
 * mirrored corners square and mitred the other.
 */
import { NullEngine, Scene, TransformNode, UniversalCamera, Vector3, VertexBuffer } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

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

describe("a solid's ring on a mirror-symmetric view (#10502)", () => {
    test("a wide cylinder's outer border seen from above reaches as far left as right", () => {
        // the camera straight above the node and a little behind it: the node, the camera and the cylinder are
        // symmetric under x -> -x
        const camera = new UniversalCamera("camera", new Vector3(0, 13.58, -3.4), scene);
        camera.setTarget(Vector3.Zero());
        const options = { styleId: "wide-cylinder", is2D: false, size: 1 };
        const shape = { type: "cylinder" as const, size: 1, width: 1.6, height: 1 };
        const border = { width: 0.3, position: "center" as const, color: "#00ff00" };
        const outerBorder = { width: 0.2, offset: 0.2, color: "#0000ff" };
        const anchor = new TransformNode("node", scene);
        const fill = NodeMesh.create(cache, options, { shape, border }, scene);
        fill.parent = anchor;
        const ring = NodeMesh.createOuterBorder(cache, options, { shape, border, outerBorder }, fill, scene);
        assert.exists(ring);
        ring.parent = fill;
        // the ring is rebuilt round the outline the camera sees before a frame is drawn
        scene.render();

        const positions = ring.sourceMesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
        const xs = positions.filter((_, i) => i % 3 === 0);
        assert.isAbove(xs.length, 0);
        const [left, right] = [-Math.min(...xs), Math.max(...xs)];
        assert.approximately(left, right, 1e-3, `the ring reaches ${String(left)} left and ${String(right)} right`);
    });
});
