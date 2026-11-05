/**
 * @file What a frame of joined edge lines costs drawn as instances and drawn as one plain mesh
 * (issue #3095), on whatever renderer the browser has.
 *
 * Each size places that many three-piece edges in one batch and times, per mode, a still frame
 * (render and read one pixel back, which waits for the GPU) and a moving frame (every edge placed
 * again first, then the same), for the plain line (six attributes a piece) and the widened one a
 * shader or a taper draws (eleven). The renderer's name is printed beside the numbers: run it without
 * flags for SwiftShader, what CI's browser tests draw with, and with GRAPHTY_BROWSER_GPU=nvidia
 * (and GRAPHTY_EGL_LIB_DIR) for a real GPU.
 *
 * It asserts nothing about speed, only that each mode drew every piece. Numbers go to the console.
 * Run with: npx vitest run --project=browser-bench test/browser/instanced-lines.bench.test.ts
 */

import { ArcRotateCamera, Camera, Engine, Scene, Vector3 } from "@babylonjs/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { CustomLineRenderer } from "../../src/meshes/CustomLineRenderer";
import { drawsExpandedLines, EdgeLineBatch, forceExpandedLines } from "../../src/meshes/EdgeLineBatch";

const WIDTH = 1280;
const HEIGHT = 720;
const FRAMES = 10;

function report(line: string): void {
    console.log(`[instanced-lines-bench] ${line}`);
}

describe("joined line cost, instanced against one plain mesh", () => {
    let canvas: HTMLCanvasElement;
    let engine: Engine;

    beforeAll(() => {
        canvas = document.createElement("canvas");
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        document.body.appendChild(canvas);
        engine = new Engine(canvas, false, { preserveDrawingBuffer: false });
        report(`renderer="${engine.getGlInfo().renderer}" expanded_by_default=${String(drawsExpandedLines(engine))}`);
    });

    afterAll(() => {
        forceExpandedLines(null);
        engine.dispose();
        canvas.remove();
    });

    function frame(scene: Scene): void {
        scene.render();
        const gl = engine._gl;
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    }

    for (const edges of [2500, 10_000]) {
        for (const [expanded, widened] of [
            [false, false],
            [false, true],
            [true, false],
            [true, true],
        ]) {
            it(`${String(edges)} edges ${expanded ? "expanded" : "instanced"}${widened ? " widened" : ""}`, () => {
                forceExpandedLines(expanded);
                const scene = new Scene(engine);
                const side = Math.ceil(Math.sqrt(edges));
                const camera = new ArcRotateCamera("c", -Math.PI / 2, 0, 10, new Vector3(side, side, 0), scene);
                camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
                camera.orthoLeft = -side * 1.2;
                camera.orthoRight = side * 1.2;
                camera.orthoTop = side * 0.7;
                camera.orthoBottom = -side * 0.7;
                camera.setPosition(new Vector3(side, side, -10));
                camera.setTarget(new Vector3(side, side, 0));
                const mesh = CustomLineRenderer.createJoinedLineMesh(
                    { width: 0.2, color: "#336699", worldWidth: true, widened },
                    scene,
                );
                const batch = new EdgeLineBatch(mesh, scene);
                const runs = Array.from({ length: edges }, () => [batch.acquire(), batch.acquire(), batch.acquire()]);
                const place = (shift: number): void => {
                    for (const [i, run] of runs.entries()) {
                        const x = (i % side) * 2 + shift;
                        const y = Math.floor(i / side) * 2;
                        batch.placeRun(run, [x, y, 0, x + 0.6, y, 0, x + 0.6, y + 0.6, 0, x + 1.2, y + 1.2, 0]);
                    }
                };

                place(0);
                frame(scene);
                frame(scene);
                let start = performance.now();
                for (let at = 0; at < FRAMES; at++) {
                    frame(scene);
                }

                const still = (performance.now() - start) / FRAMES;
                start = performance.now();
                for (let at = 0; at < FRAMES; at++) {
                    place(at * 0.01);
                    frame(scene);
                }

                const moving = (performance.now() - start) / FRAMES;
                report(
                    `edges=${String(edges)} pieces=${String(batch.drawnCount)} mode=${expanded ? "expanded" : "instanced"} widened=${String(widened)} ` +
                        `still_ms=${still.toFixed(2)} moving_ms=${moving.toFixed(2)}`,
                );
                assert.strictEqual(batch.drawnCount, edges * 3, "every piece is drawn");
                assert.strictEqual(mesh.forcedInstanceCount, expanded ? 0 : edges * 3);
                scene.dispose();
            });
        }
    }
});
