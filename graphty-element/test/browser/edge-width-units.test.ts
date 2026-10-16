/**
 * @file What an edge's `line.width` measures on screen.
 *
 * A study reader set a width of 8 and saw hairlines, then 30 and saw a thick line, and read the
 * number as broken. This measures the drawn thickness of a solid 3D edge against its width and
 * its distance from the camera, the way `EdgeMesh` draws it: the style's width times 20 is the
 * line shader's width uniform, and the shader widens the line in clip space before the
 * perspective divide, so the line tapers with distance like the nodes do.
 *
 * Measured: a line `width` W, `depth` units in front of the camera, draws 10 x W / depth pixels
 * thick. So W is pixels only at a depth of 10; a graph framed from 50 units away draws the
 * default width of 8 under 2 pixels. Every width keeps that ratio, at every depth: the units are
 * consistent, not a rendering fault.
 */

import { Color4, Engine, FreeCamera, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { CustomLineRenderer } from "../../src/meshes/CustomLineRenderer";

const WIDTH = 800;
const HEIGHT = 400;

/** `EdgeMesh` hands the shader the style's width times this. */
const EDGE_MESH_SCALE = 20;

describe("edge width units", () => {
    let canvas: HTMLCanvasElement;
    let engine: Engine;
    let scene: Scene;
    let camera: FreeCamera;

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
        camera = new FreeCamera("perspective", new Vector3(0, 0, -10), scene);
        camera.setTarget(Vector3.Zero());
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
        canvas.remove();
    });

    /**
     * The lit height of a horizontal line through the canvas centre, in pixels.
     * @param width - The style's line width.
     * @param depth - The line's distance in front of the camera.
     * @returns The pixels lit in the centre column.
     */
    async function drawnThickness(width: number, depth: number): Promise<number> {
        camera.position = new Vector3(0, 0, -depth);
        camera.setTarget(Vector3.Zero());
        const mesh = CustomLineRenderer.create(
            {
                points: [new Vector3(-depth, 0, 0), new Vector3(depth, 0, 0)],
                width: width * EDGE_MESH_SCALE,
                color: "#FF0000",
            },
            scene,
        );
        // The line's shader compiles asynchronously: wait for it, then draw.
        await scene.whenReadyAsync();
        scene.render();

        const column = (await engine.readPixels(WIDTH / 2, 0, 1, HEIGHT)) as unknown as Uint8Array;
        mesh.dispose();
        let lit = 0;
        for (let at = 0; at < column.length; at += 4) {
            if (column[at] > 127) {
                lit++;
            }
        }

        return lit;
    }

    test("a line of width W at depth d draws 10 x W / d pixels, for every width and depth", async () => {
        const seen: string[] = [];
        for (const depth of [10, 20, 50]) {
            for (const width of [1, 8, 30]) {
                const want = (10 * width) / depth;
                const drawn = await drawnThickness(width, depth);
                seen.push(`width ${String(width)} at depth ${String(depth)}: ${String(drawn)} px`);
                // Rasterization rounds a thin line to whole pixels.
                assert.closeTo(drawn, want, Math.max(1, want * 0.1), seen.join("; "));
            }
        }
    });
});
