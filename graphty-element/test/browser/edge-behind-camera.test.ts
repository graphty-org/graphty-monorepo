/**
 * @file An edge with one end behind the 3D camera draws only what is in front of the camera.
 *
 * The line shaders divide clip coordinates by w. A point behind the camera has a negative w, so
 * dividing by it mirrors the point through the screen's centre (issue #7126). The GPU's own clipping
 * still draws a lone straight piece right, but a corner in front of the camera whose neighbour is
 * behind it was joined as if the line arrived from the mirrored side, a wedge of wrong pixels at the
 * corner. The camera here sits between connected nodes and looks along +z; the edges run at
 * x > 0, so every point of them that is in front of the camera is right of the screen's centre.
 */

import { Color4, Engine, FreeCamera, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { CustomLineRenderer } from "../../src/meshes/CustomLineRenderer";
import { EdgeLineBatch } from "../../src/meshes/EdgeLineBatch";

const SIZE = 200;
const WIDTH = 40;
const FRONT = new Vector3(1, 0, 5);
const BEHIND = new Vector3(1, 0, -5);

describe("an edge with one end behind the camera", () => {
    let canvas: HTMLCanvasElement;
    let engine: Engine;
    let scene: Scene;

    beforeEach(() => {
        canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        canvas.style.width = `${String(SIZE)}px`;
        canvas.style.height = `${String(SIZE)}px`;
        document.body.appendChild(canvas);
        engine = new Engine(canvas, false, { preserveDrawingBuffer: true });
        engine.setHardwareScalingLevel(1);
        scene = new Scene(engine);
        scene.clearColor = new Color4(1, 1, 1, 1);
        const camera = new FreeCamera("between", Vector3.Zero(), scene);
        camera.setTarget(new Vector3(0, 0, 1));
        camera.minZ = 0.1;
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
        canvas.remove();
    });

    /**
     * Render and count the drawn pixels left of the screen's centre and in its right-most column.
     * @returns The two counts.
     */
    async function drawn(): Promise<{ left: number; rightEdge: number }> {
        await scene.whenReadyAsync();
        scene.render();
        const pixels = (await engine.readPixels(0, 0, SIZE, SIZE)) as unknown as Uint8Array;
        let left = 0;
        let rightEdge = 0;
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                if (pixels[(y * SIZE + x) * 4] >= 128) {
                    continue;
                }
                left += x < SIZE / 2 ? 1 : 0;
                rightEdge += x === SIZE - 1 ? 1 : 0;
            }
        }
        return { left, rightEdge };
    }

    test("a joined line draws from its front end to the screen's edge, and nothing past the centre", async () => {
        const batch = new EdgeLineBatch(
            CustomLineRenderer.createJoinedLineMesh({ width: WIDTH, color: "#000000" }, scene),
            scene,
        );
        batch.place(batch.acquire(), FRONT, BEHIND);
        const { left, rightEdge } = await drawn();
        assert.strictEqual(left, 0, "pixels drawn left of the centre");
        assert.isAbove(rightEdge, 0, "the line reaches the screen's right edge");
        batch.dispose();
    });

    test("a joined run whose corner is behind the camera draws both pieces in front of it only", async () => {
        const batch = new EdgeLineBatch(
            CustomLineRenderer.createJoinedLineMesh({ width: WIDTH, color: "#000000" }, scene),
            scene,
        );
        const flat = [...FRONT.asArray(), ...BEHIND.asArray(), 1, 0.5, 5];
        batch.placeRun([batch.acquire(), batch.acquire()], flat);
        const { left, rightEdge } = await drawn();
        assert.strictEqual(left, 0, "pixels drawn left of the centre");
        assert.isAbove(rightEdge, 0, "the pieces reach the screen's right edge");
        batch.dispose();
    });

    test("a corner in front of the camera whose neighbour is behind it is joined as the line runs on screen", async () => {
        // An L: a piece from behind the camera to a corner in front of it, then a piece down. The
        // reference draws the same L with the first piece ending in front of the camera, at a
        // point on the same line whose screen position is far past the canvas's right edge, so
        // the canvas shows the same line either way.
        const corner = [0.5, 0, 5, 0.5, -1, 5];
        const pixelsOf = async (start: number[]): Promise<Uint8Array> => {
            const batch = new EdgeLineBatch(
                CustomLineRenderer.createJoinedLineMesh({ width: 200, color: "#000000" }, scene),
                scene,
            );
            batch.placeRun([batch.acquire(), batch.acquire()], [...start, ...corner]);
            await scene.whenReadyAsync();
            scene.render();
            const pixels = (await engine.readPixels(0, 0, SIZE, SIZE)) as unknown as Uint8Array;
            batch.dispose();
            return pixels;
        };
        const behind = await pixelsOf([0.5, 0, -5]);
        const reference = await pixelsOf([0.5, 0, 0.2]);
        let drawn = 0;
        let differ = 0;
        for (let i = 0; i < SIZE * SIZE; i++) {
            const a = behind[i * 4] < 128;
            const b = reference[i * 4] < 128;
            drawn += b ? 1 : 0;
            differ += a === b ? 0 : 1;
        }
        assert.isAbove(drawn, 0, "the reference draws the L");
        assert.isAtMost(differ, SIZE, `pixels that differ from the reference, of ${String(drawn)} drawn`);
    });

    test("a plain custom line draws from its front end to the screen's edge, and nothing past the centre", async () => {
        CustomLineRenderer.create({ points: [FRONT, BEHIND], width: WIDTH, color: "#000000" }, scene);
        const { left, rightEdge } = await drawn();
        assert.strictEqual(left, 0, "pixels drawn left of the centre");
        assert.isAbove(rightEdge, 0, "the line reaches the screen's right edge");
    });

    test("a line wholly behind the camera draws nothing", async () => {
        const batch = new EdgeLineBatch(
            CustomLineRenderer.createJoinedLineMesh({ width: WIDTH, color: "#000000" }, scene),
            scene,
        );
        batch.place(batch.acquire(), new Vector3(1, 0, -1), new Vector3(-1, 0, -5));
        CustomLineRenderer.create(
            { points: [new Vector3(1, 0, -1), new Vector3(-1, 0, -5)], width: WIDTH, color: "#000000" },
            scene,
        );
        const { left, rightEdge } = await drawn();
        assert.strictEqual(left + rightEdge, 0, "pixels drawn");
        batch.dispose();
    });
});
