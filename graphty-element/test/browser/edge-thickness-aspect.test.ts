/**
 * @file A solid 3D edge draws the same thickness at every angle on a non-square canvas.
 *
 * The line shader widens a line in screen space. When it took the perpendicular in NDC, where x
 * and y have different pixel scales on any non-square canvas, a diagonal line drew up to about
 * 20% thinner than a horizontal or vertical one of the same width. This reads pixels, because
 * the defect lives entirely in the shader.
 *
 * The camera is orthographic with one world unit per pixel, so a line's world angle is its
 * pixel angle and its drawn thickness can be measured directly: the lit area inside a disk
 * centred on the line, divided by the disk's diameter.
 */

import { Camera, Color4, Engine, FreeCamera, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { CustomLineRenderer } from "../../src/meshes/CustomLineRenderer";

/** A 4:1 canvas, where the NDC skew is large. */
const WIDTH = 1200;
const HEIGHT = 300;

/** The shader's width uniform. */
const LINE_WIDTH = 40;

/** Radius of the disk the thickness is measured in, in pixels. */
const RADIUS = 60;

const FRAMES = 30;
const FRAME_MS = 10;

describe("solid edge thickness on a non-square canvas", () => {
    let canvas: HTMLCanvasElement;
    let engine: Engine;
    let scene: Scene;

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

        const camera = new FreeCamera("ortho", new Vector3(0, 0, -10), scene);
        camera.setTarget(Vector3.Zero());
        camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
        camera.orthoLeft = -WIDTH / 2;
        camera.orthoRight = WIDTH / 2;
        camera.orthoTop = HEIGHT / 2;
        camera.orthoBottom = -HEIGHT / 2;
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
        canvas.remove();
    });

    /**
     * The drawn thickness of the line through a centre, in pixels.
     * @param pixels - The frame, bottom row first.
     * @param cx - Centre x in world units (= pixels from the canvas centre).
     * @param cy - Centre y in world units.
     * @returns Lit area in the disk over its diameter.
     */
    function thicknessAt(pixels: Uint8Array, cx: number, cy: number): number {
        const px = cx + WIDTH / 2;
        const py = cy + HEIGHT / 2;
        let lit = 0;
        for (let y = Math.floor(py - RADIUS); y <= Math.ceil(py + RADIUS); y++) {
            for (let x = Math.floor(px - RADIUS); x <= Math.ceil(px + RADIUS); x++) {
                const dx = x + 0.5 - px;
                const dy = y + 0.5 - py;
                if (dx * dx + dy * dy > RADIUS * RADIUS) {
                    continue;
                }

                if (pixels[(y * WIDTH + x) * 4] > 127) {
                    lit++;
                }
            }
        }

        return lit / (2 * RADIUS);
    }

    test("a 45-degree edge is within 1 px of a horizontal and a vertical one", async () => {
        const lines: { centre: Vector3; dir: Vector3 }[] = [
            { centre: new Vector3(-400, 0, 0), dir: new Vector3(1, 0, 0) },
            { centre: new Vector3(0, 0, 0), dir: new Vector3(1, 1, 0).normalize() },
            { centre: new Vector3(400, 0, 0), dir: new Vector3(0, 1, 0) },
        ];
        for (const { centre, dir } of lines) {
            CustomLineRenderer.create(
                {
                    points: [centre.subtract(dir.scale(140)), centre.add(dir.scale(140))],
                    width: LINE_WIDTH,
                    color: "#FF0000",
                },
                scene,
            );
        }

        for (let frame = 0; frame < FRAMES; frame++) {
            scene.render();
            await new Promise<void>((done) => {
                setTimeout(done, FRAME_MS);
            });
        }

        const pixels = (await engine.readPixels(0, 0, WIDTH, HEIGHT)) as unknown as Uint8Array;
        const [horizontal, diagonal, vertical] = lines.map(({ centre }) => thicknessAt(pixels, centre.x, centre.y));

        assert.isAbove(horizontal, 5, "the horizontal line is drawn");
        assert.closeTo(vertical, horizontal, 1, "vertical matches horizontal");
        assert.closeTo(diagonal, horizontal, 1, `45-degree edge ${diagonal.toFixed(2)} px vs horizontal ${horizontal.toFixed(2)} px`);
    });
});
