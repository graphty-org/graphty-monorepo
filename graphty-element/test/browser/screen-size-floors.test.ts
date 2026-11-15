/**
 * @file Two rules a program draws in screen pixels, whatever the drawing's scale: a node label hidden while its node
 * is drawn smaller than `label.minNodeScreenSize` pixels across (sigma.js's `labelRenderedSizeThreshold`), and a line
 * never drawn thinner than `line.minScreenWidth` pixels (sigma.js's `minEdgeThickness`).
 */

import { Camera, Color4, Engine, MeshBuilder, NullEngine, Scene, UniversalCamera, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { EdgeLineBatch } from "../../src/meshes/EdgeLineBatch";
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
});

describe("a line's minimum screen width", () => {
    const SIZE = 200;

    /**
     * Draw one black horizontal 2D line on white, through the canvas's middle, with one scene unit
     * to one pixel, and count the rows of the middle column it inked.
     * @param width - The line's width in scene units, which is pixels here.
     * @param minScreenWidth - Its floor in screen pixels.
     * @returns How many rows of the middle column are dark.
     */
    async function drawnRows(width: number, minScreenWidth: number): Promise<number> {
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        canvas.style.width = `${String(SIZE)}px`;
        canvas.style.height = `${String(SIZE)}px`;
        document.body.appendChild(canvas);
        const engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
        const scene = new Scene(engine);
        scene.clearColor = new Color4(1, 1, 1, 1);
        const camera = new UniversalCamera("c", new Vector3(0, 0, -10), scene);
        camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
        camera.orthoTop = SIZE / 2;
        camera.orthoBottom = -SIZE / 2;
        camera.orthoLeft = -SIZE / 2;
        camera.orthoRight = SIZE / 2;
        camera.setTarget(Vector3.Zero());
        scene.activeCamera = camera;
        // The batch mesh every solid 2D line is drawn from, one straight piece in it.
        const line = new EdgeLineBatch(
            Simple2DLineRenderer.createBatchMesh(width, "#000000", 1, scene, false, minScreenWidth),
            scene,
        );
        line.place(line.acquire(), new Vector3(-80, 0, 0), new Vector3(80, 0, 0));
        await scene.whenReadyAsync();
        scene.render();
        const pixels = (await engine.readPixels(0, 0, SIZE, SIZE)) as unknown as Uint8Array;
        engine.dispose();
        canvas.remove();
        let rows = 0;
        for (let y = 0; y < SIZE; y++) {
            if (pixels[(y * SIZE + SIZE / 2) * 4] < 128) {
                rows++;
            }
        }

        return rows;
    }

    test("draws a line thinner than its floor as wide as the floor, in the shader every solid line uses", async () => {
        assert.isAtMost(await drawnRows(0.5, 0), 1, "with no floor a half-pixel line draws at most one faint row");
        assert.closeTo(await drawnRows(0.5, 4), 4, 1, "a 4 px floor draws the same line 4 px wide");
    });

    test("leaves a line wider than its floor at its own width", async () => {
        assert.strictEqual(await drawnRows(6, 2), await drawnRows(6, 0));
    });
});
