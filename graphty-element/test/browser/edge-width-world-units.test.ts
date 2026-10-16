/**
 * @file `line.width` is one length in world units, whatever draws the line.
 *
 * A solid 3D edge used to take `line.width` as screen pixels (times 20) while a patterned edge
 * took it as world units (over 40), so a solid and a dashed edge of the same width drew at
 * different thicknesses and the ratio between them changed as the camera zoomed (issue #125).
 *
 * Both lines here are built the way `Edge` builds them -- the solid one as a slot in the batch
 * `EdgeMesh.lineBatch` hands out, the dashed one by `EdgeMesh.createPatternedLine` -- and drawn
 * with a perspective camera at two distances. At each distance the two must measure the same
 * thickness, and moving the camera twice as far must halve both, as it halves a node.
 */

import { Color4, Engine, FreeCamera, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import type { EdgeStyleConfig } from "../../src/config";
import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { MeshCache } from "../../src/meshes/MeshCache";

const WIDTH = 800;
const HEIGHT = 400;

/** The style's `line.width`, the same for both lines. */
const LINE_WIDTH = 8;

/** Half the horizontal span of the measuring window, in pixels from the canvas centre. */
const WINDOW = 120;

const FRAMES = 20;

describe("line.width is in world units for every edge renderer", () => {
    let canvas: HTMLCanvasElement;
    let engine: Engine;
    let scene: Scene;
    let camera: FreeCamera;
    let cache: MeshCache;

    beforeEach(() => {
        canvas = document.createElement("canvas");
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        canvas.style.width = `${String(WIDTH)}px`;
        canvas.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(canvas);

        engine = new Engine(canvas, false, { preserveDrawingBuffer: true });
        scene = new Scene(engine);
        scene.clearColor = new Color4(0, 0, 0, 1);
        camera = new FreeCamera("perspective", new Vector3(0, 0, -6), scene);
        camera.fov = 0.8;
        camera.setTarget(Vector3.Zero());
        cache = new MeshCache();
    });

    afterEach(() => {
        cache.clear();
        scene.dispose();
        engine.dispose();
        canvas.remove();
    });

    /**
     * The thickest run of lit pixels in any column of the window, within one half of the canvas.
     * The maximum rather than the mean, so a dashed line's gaps do not count against it.
     * @param pixels - The frame, bottom row first.
     * @param top - Measure the upper half of the canvas, otherwise the lower.
     * @returns The thickness in pixels.
     */
    function thickness(pixels: Uint8Array, top: boolean): number {
        const [from, to] = top ? [HEIGHT / 2, HEIGHT] : [0, HEIGHT / 2];
        let thickest = 0;
        for (let x = WIDTH / 2 - WINDOW; x < WIDTH / 2 + WINDOW; x++) {
            let lit = 0;
            for (let y = from; y < to; y++) {
                if (pixels[(y * WIDTH + x) * 4] > 127) {
                    lit++;
                }
            }

            thickest = Math.max(thickest, lit);
        }

        return thickest;
    }

    async function measureAt(distance: number): Promise<{ solid: number; dashed: number }> {
        camera.position.set(0, 0, -distance);
        camera.setTarget(Vector3.Zero());

        // Wait until every material's shader has compiled, then draw a few animation frames.
        await scene.whenReadyAsync();
        for (let frame = 0; frame < FRAMES; frame++) {
            scene.render();
            await new Promise<void>((done) => {
                requestAnimationFrame(() => {
                    done();
                });
            });
        }

        const pixels = (await engine.readPixels(0, 0, WIDTH, HEIGHT)) as unknown as Uint8Array;
        return { solid: thickness(pixels, true), dashed: thickness(pixels, false) };
    }

    test("a solid and a dashed edge of the same width match at two zoom levels", async () => {
        const options = { width: LINE_WIDTH, color: "#FF0000" };
        const solidStyle: EdgeStyleConfig = { line: { type: "solid", width: LINE_WIDTH } };
        const dashedStyle: EdgeStyleConfig = { line: { type: "dash", width: LINE_WIDTH } };

        const batch = EdgeMesh.lineBatch(cache, { ...options, styleId: "solid" }, solidStyle, scene);
        assert(batch, "a solid line is a slot in a line batch");
        batch.place(batch.acquire(), new Vector3(-3, 0.5, 0), new Vector3(3, 0.5, 0));
        batch.flush();

        const dashed = EdgeMesh.createPatternedLine({ ...options, styleId: "dashed" }, dashedStyle, scene);
        dashed.update(new Vector3(-3, -0.5, 0), new Vector3(3, -0.5, 0));

        const near = await measureAt(6);
        const far = await measureAt(12);

        assert.isAbove(near.solid, 4, "the solid line is drawn");
        assert.isAbove(near.dashed, 4, "the dashed line is drawn");
        assert.closeTo(
            near.dashed,
            near.solid,
            1,
            `near: dashed ${String(near.dashed)} px vs solid ${String(near.solid)} px`,
        );
        assert.closeTo(
            far.dashed,
            far.solid,
            1,
            `far: dashed ${String(far.dashed)} px vs solid ${String(far.solid)} px`,
        );
        assert.closeTo(far.solid * 2, near.solid, 2, "twice as far draws the solid line half as thick");
    });
});
