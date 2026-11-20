/**
 * @file A pulled curve batch's tables stay inside the card's largest texture (issue #9160).
 *
 * The edge table, the hidden table, the draw order table and the route table were 1024 texels wide
 * and grew only taller: about 2 million curve pieces (32,000 long curved edges, inside the default
 * limits) made the edge table taller than 8192, which WebGL refuses (INVALID_VALUE) and draws from
 * an invalid texture. Each table now grows wider once it would pass `maxTextureSize`, and the
 * shaders read its width from the texture. The card's limit is pinned at 2048 here, so a table past
 * it is a few hundred thousand pieces rather than millions; the pieces past the first 2048 lines'
 * worth must still draw, which they do only when the shader reads the wider table right.
 */

import { Color3, Color4, Constants, Engine, FreeCamera, RawTexture, Scene, Vector3 } from "@babylonjs/core";
import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine.js";
import { afterEach, assert, describe, test } from "vitest";

import { openWebGPUEngine } from "../../src/managers/RenderManager";
import { CustomLineRenderer } from "../../src/meshes/CustomLineRenderer";
import { curvePathPoint, curveSpan } from "../../src/meshes/pulledCurve";
import { PulledLineBatch } from "../../src/meshes/PulledLineBatch";

const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";
const RENDERERS = ADAPTER === "" ? (["webgl"] as const) : (["webgl", "webgpu"] as const);

const SIZE = 120;
/** The card's largest texture side, pinned below the real one. */
const MOST = 2048;
/** Curve pieces past what 1024-wide lines MOST tall hold: 2048 * 1024 texels / 4 a piece is 524,288. */
const PIECES = 560_000;
/** Route texels past the same: 2048 * 1024 is 2,097,152; filler routes of 64 points. */
const FILLER_ROUTES = 33_000;
const LOOK = { width: 4, color: "#000000" };

/** Rows 0 and 1 run across the top, 2 and 3 across the bottom. */
const ROWS = [
    [-3, 2, 0],
    [3, 2, 0],
    [-3, -2, 0],
    [3, -2, 0],
] as const;

let engine: AbstractEngine | undefined;

afterEach(() => {
    engine?.dispose();
    engine = undefined;
    document.querySelectorAll("canvas[data-pulled-table-width]").forEach((c) => c.remove());
});

describe("a pulled curve batch past the card's largest texture", () => {
    for (const renderer of RENDERERS) {
        test(`keeps every table inside it and draws the last curve and the last route on ${renderer}`, async () => {
            const canvas = document.createElement("canvas");
            canvas.dataset.pulledTableWidth = "";
            canvas.width = SIZE;
            canvas.height = SIZE;
            canvas.style.width = `${String(SIZE)}px`;
            canvas.style.height = `${String(SIZE)}px`;
            document.body.appendChild(canvas);
            if (renderer === "webgpu") {
                const opened = await openWebGPUEngine(canvas);
                assert(typeof opened !== "string", typeof opened === "string" ? opened : "WebGPU opens");
                engine = opened;
            } else {
                engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
            }
            engine.setHardwareScalingLevel(1);
            engine.getCaps().maxTextureSize = MOST;
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

            const batch = new PulledLineBatch(
                CustomLineRenderer.createJoinedLineMesh({ ...LOOK, pulled: true, pulledCurve: true }, scene),
                scene,
                () => rowTexture,
                true,
            );
            // pieces that draw nothing, filling the table past MOST lines of 1024 texels
            for (let p = 0; p < PIECES; p++) {
                batch.acquire();
            }
            // routes that fill the route table past MOST lines of 1024 texels
            const filler = Array.from({ length: 64 * 3 }, () => 0);
            for (let r = 0; r < FILLER_ROUTES; r++) {
                batch.writeRoute(-1, filler);
            }

            const color = Color3.FromHexString(LOOK.color);
            // nodes a tenth of a unit across: a point is outside one a tenth from its center
            const outside =
                (center: Vector3) =>
                (x: number, y: number, z: number): boolean =>
                    Math.hypot(x - center.x, y - center.y, z - center.z) > 0.1;
            const draw = (
                source: number,
                target: number,
                path: { bends?: readonly number[]; straight?: boolean },
            ): void => {
                const src = at(source);
                const dst = at(target);
                const span = curveSpan(src, dst, outside(src), outside(dst), path);
                assert(span !== null, "the line has a span");
                const points = Array.from({ length: span.pieces + 1 }, (_, j) =>
                    curvePathPoint(src, dst, span, j),
                ).flatMap((p) => [p.x, p.y, p.z]);
                const route = path.bends === undefined ? 0 : batch.writeRoute(-1, points);
                for (let j = 0; j < span.pieces; j++) {
                    const piece = batch.acquire();
                    batch.setRows(piece, source, target);
                    batch.setLook(piece, color, 1, LOOK.width);
                    batch.setCurve(piece, j, span, route);
                }
            };
            // the last curve, across the bottom, and the last route, a line through one bend across the top
            draw(2, 3, {});
            draw(0, 1, { bends: [0.5, 0.1], straight: true });

            await scene.whenReadyAsync();
            scene.render();
            const gl = engine instanceof Engine ? engine._gl : undefined;
            const error = gl?.getError() ?? 0;
            const pixels = new Uint8Array((await engine.readPixels(0, 0, SIZE, SIZE)).buffer);
            // which half is the top differs between WebGL and WebGPU readbacks; both must be inked
            let first = 0;
            let second = 0;
            for (let i = 0; i < pixels.length; i += 4) {
                if ((pixels[i] ?? 255) < 250) {
                    if (i / 4 < (SIZE * SIZE) / 2) {
                        first++;
                    } else {
                        second++;
                    }
                }
            }

            const sizes = batch.mesh.material?.getActiveTextures().map((t) => t.getSize()) ?? [];
            batch.dispose();
            rowTexture.dispose();

            assert.isAbove(sizes.length, 3, "the batch binds its tables");
            for (const { width, height } of sizes) {
                assert.isAtMost(
                    width,
                    MOST,
                    `a table ${String(width)} x ${String(height)} is no wider than the card allows`,
                );
                assert.isAtMost(
                    height,
                    MOST,
                    `a table ${String(width)} x ${String(height)} is no taller than the card allows`,
                );
            }
            assert.strictEqual(error, 0, "no GL error");
            assert.isAbove(first, 0, "one line draws");
            assert.isAbove(second, 0, "the other line draws");
        });
    }
});
