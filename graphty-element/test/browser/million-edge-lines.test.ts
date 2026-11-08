/**
 * @file A million edges load and draw on whatever renderer the browser has, SwiftShader included:
 * a placed line batch (`EdgeLineBatch`, every `"objects"` edge and each `"batched"` edge that is
 * not pulled) and a pulled one (`PulledLineBatch`, the `"batched"` path's plain edges). Before
 * stage 16 a software renderer drew joined lines expanded, one plain mesh repeating every slot
 * per template vertex, which died past 524,288 pieces. Design: `design/rendering/row-renderer.md`,
 * section 4.3, stage 16.
 */

import { Color3, Color4, Constants, Engine, FreeCamera, Logger, RawTexture, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, test } from "vitest";

import { CustomLineRenderer } from "../../src/meshes/CustomLineRenderer";
import { EdgeLineBatch } from "../../src/meshes/EdgeLineBatch";
import { PulledLineBatch } from "../../src/meshes/PulledLineBatch";

const SIZE = 120;
const EDGES = 1_000_000;
const LOOK = { width: 4, color: "#000000" };

/**
 * Every edge but the last runs from row 0 to row 1, a speck at the top, so a frame does not fill a
 * million lines' worth of pixels; the last, from row 2 to 3, runs across the bottom.
 */
const ROWS = [
    [-3, 2, 0],
    [-2.7, 2, 0],
    [-3, -2, 0],
    [3, -2, 0],
] as const;

let engine: Engine | undefined;

afterEach(() => {
    engine?.dispose();
    engine = undefined;
    document.querySelectorAll("canvas[data-million-edges]").forEach((c) => c.remove());
});

describe("a million edge lines", () => {
    test("draw every piece, the last included, placed and pulled", async () => {
        const canvas = document.createElement("canvas");
        canvas.dataset.millionEdges = "";
        canvas.width = SIZE;
        canvas.height = SIZE;
        canvas.style.width = `${String(SIZE)}px`;
        canvas.style.height = `${String(SIZE)}px`;
        document.body.appendChild(canvas);
        engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
        engine.setHardwareScalingLevel(1);
        const scene = new Scene(engine);
        scene.clearColor = new Color4(1, 1, 1, 1);
        const camera = new FreeCamera("camera", new Vector3(0, 0, -12), scene);
        camera.setTarget(Vector3.Zero());

        const places = new Float32Array(1024 * 4);
        ROWS.forEach((row, r) => {
            places.set([...row, 1], r * 4);
        });
        const rowTexture = RawTexture.CreateRGBATexture(
            places,
            1024,
            1,
            scene,
            false,
            false,
            Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            Constants.TEXTURETYPE_FLOAT,
        );
        const at = (row: number): Vector3 => Vector3.FromArray(places, row * 4);
        const rowsOf = (e: number): readonly [number, number] => (e === EDGES - 1 ? [2, 3] : [0, 1]);

        const compileError = new Promise<never>((_, reject) => {
            Logger.OnNewCacheEntry = (entry): void => {
                if (/unable to compile|error/i.test(entry)) {
                    reject(new Error(entry));
                }
            };
        });
        const read = document.createElement("canvas");
        read.width = SIZE;
        read.height = SIZE;
        const g = read.getContext("2d", { willReadFrequently: true });
        assert(g, "a 2D canvas");
        const gl = engine._gl;
        /** Ink in the top and bottom halves of one frame, and the GL error after it. */
        const frame = async (): Promise<{ top: number; bottom: number; error: number }> => {
            await Promise.race([scene.whenReadyAsync(), compileError]);
            scene.render();
            const error = gl.getError();
            g.drawImage(canvas, 0, 0);
            const { data } = g.getImageData(0, 0, SIZE, SIZE);
            let top = 0;
            let bottom = 0;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] < 250) {
                    if (i / 4 < (SIZE * SIZE) / 2) {
                        top++;
                    } else {
                        bottom++;
                    }
                }
            }

            return { top, bottom, error };
        };
        const { renderer } = engine.getGlInfo();

        const plain = new EdgeLineBatch(CustomLineRenderer.createJoinedLineMesh(LOOK, scene), scene);
        for (let e = 0; e < EDGES; e++) {
            const [a, b] = rowsOf(e);
            plain.place(plain.acquire(), at(a), at(b));
        }
        const placed = await frame();
        plain.dispose();
        assert.strictEqual(placed.error, gl.NO_ERROR, `placed on ${renderer}: no GL error`);
        assert.isAbove(placed.top, 0, `placed on ${renderer}: the first edges draw`);
        assert.isAbove(placed.bottom, 0, `placed on ${renderer}: the millionth edge draws`);

        const pulled = new PulledLineBatch(
            CustomLineRenderer.createJoinedLineMesh({ ...LOOK, pulled: true }, scene),
            scene,
            () => rowTexture,
        );
        for (let e = 0; e < EDGES; e++) {
            const [a, b] = rowsOf(e);
            const piece = pulled.acquire();
            pulled.setRows(piece, a, b);
            pulled.setLook(piece, Color3.FromHexString(LOOK.color), 1, LOOK.width);
        }
        const drawn = await frame();
        pulled.dispose();
        assert.strictEqual(drawn.error, gl.NO_ERROR, `pulled on ${renderer}: no GL error`);
        assert.isAbove(drawn.top, 0, `pulled on ${renderer}: the first edges draw`);
        assert.isAbove(drawn.bottom, 0, `pulled on ${renderer}: the millionth edge draws`);
    });
});
