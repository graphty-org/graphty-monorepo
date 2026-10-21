/**
 * @file Two rules a program draws in screen pixels, whatever the drawing's scale: a node label hidden while its node
 * is drawn smaller than `label.minNodeScreenSize` pixels across (sigma.js's `labelRenderedSizeThreshold`), and a line
 * never drawn thinner than `line.minScreenWidth` pixels (sigma.js's `minEdgeThickness`).
 */

import { Camera, MeshBuilder, NullEngine, Scene, UniversalCamera, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { EDGE_JOIN_VERTEX_SHADER } from "../../src/meshes/edgeJoinShader";
import { RichTextLabel } from "../../src/meshes/RichTextLabel";
import { Simple2DLineRenderer } from "../../src/meshes/Simple2DLineRenderer";

describe("screen-size floors", () => {
    let engine: NullEngine;
    let scene: Scene;
    let camera: UniversalCamera;

    beforeEach(() => {
        engine = new NullEngine({
            renderWidth: 200,
            renderHeight: 200,
            textureSize: 512,
            deterministicLockstep: false,
            lockstepMaxSteps: 1,
        });
        scene = new Scene(engine);
        camera = new UniversalCamera("c", new Vector3(0, 0, -10), scene);
        camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
        // one scene unit is one pixel: the render is 200 px tall over 200 units
        camera.orthoTop = 100;
        camera.orthoBottom = -100;
        camera.orthoLeft = -100;
        camera.orthoRight = 100;
        scene.activeCamera = camera;
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
    });

    /**
     * Whether a node label is hidden for its node's size on screen.
     * @param nodePx - the node's diameter, in pixels
     * @param minNodeScreenSize - the label's floor
     * @returns true when hidden
     */
    function hidden(nodePx: number, minNodeScreenSize: number): boolean {
        const node = MeshBuilder.CreateDisc("n", { radius: nodePx / 2 }, scene);
        node.computeWorldMatrix(true);
        const label = new RichTextLabel(scene, { text: "Small", fontSize: 12, attachTo: node, minNodeScreenSize });
        const result = label.tooSmall(camera);
        label.dispose();
        node.dispose();
        return result;
    }

    test("hides a label while its node is drawn under the floor, and shows it at or over it", () => {
        assert.isTrue(hidden(10, 12), "a 10 px node under a 12 px floor");
        assert.isFalse(hidden(14, 12), "a 14 px node over it");
        assert.isFalse(hidden(10, 0), "no floor");
    });

    test("draws a line no thinner than its minimum screen width, in the shader every solid line uses", () => {
        const mesh = Simple2DLineRenderer.createBatchMesh(0, "#000000", 1, scene, false, 0.85);
        const floats = (mesh.material as unknown as { _floats: Record<string, number> })._floats;
        assert.strictEqual(floats.minWidth, 0.85);
        assert.strictEqual(floats.width, 0);
        // the half width the vertex shader offsets each side by is never under half the floor
        assert.include(EDGE_JOIN_VERTEX_SHADER, "return max(hw, minWidth * 0.5);");
        const plain = Simple2DLineRenderer.createBatchMesh(1, "#000000", 1, scene);
        assert.strictEqual((plain.material as unknown as { _floats: Record<string, number> })._floats.minWidth, 0);
    });
});
