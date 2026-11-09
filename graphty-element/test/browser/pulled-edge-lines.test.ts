/**
 * @file A pulled edge (`EDGE_PULLED`, `PulledLineBatch`) draws the same pixels as the plain line
 * placed at the same two points, reads its ends from the row table so a move uploads no edge byte,
 * and draws nothing once either end's row has w = 0 (hidden, or not placed). The lean program
 * (`EDGE_PULLED_LEAN`: the piece's rectangle alone, 4 vertices and 6 indices, not the join template's
 * 14 and 30) draws the same pixels too, with multisampling and without. Design:
 * `design/rendering/row-renderer.md`, section 4.3, stage 15, and `design/rendering/cosmos-gap.md`, G12.
 * `GRAPHTY_BROWSER_GPU=nvidia` runs it on the RTX, where the lean program's stray pixel was seen.
 */

import { Color3, Color4, Constants, Engine, FreeCamera, Logger, RawTexture, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, test } from "vitest";

import { CustomLineRenderer } from "../../src/meshes/CustomLineRenderer";
import { EdgeLineBatch } from "../../src/meshes/EdgeLineBatch";
import { PulledLineBatch } from "../../src/meshes/PulledLineBatch";

const SIZE = 240;
const ROWS = 30;
const EDGES = 60;

let engine: Engine | undefined;

afterEach(() => {
    engine?.dispose();
    engine = undefined;
    document.querySelectorAll("canvas[data-pulled-edges]").forEach((c) => c.remove());
});

/**
 * A seeded generator, so every run draws the same scene.
 * @param seed - The seed.
 * @returns Numbers in [0, 1).
 */
function rng(seed: number): () => number {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const PROGRAMS = [
    { antialias: true, lean: false },
    { antialias: false, lean: false },
    { antialias: false, lean: true },
    { antialias: true, lean: true },
];

describe("pulled edge lines", () => {
    test.each(PROGRAMS)(
        "antialias $antialias, lean $lean: draw the plain line's pixels, upload nothing on a move, and end at a row of w = 0",
        async ({ antialias, lean }) => {
            const canvas = document.createElement("canvas");
            canvas.dataset.pulledEdges = "";
            canvas.width = SIZE;
            canvas.height = SIZE;
            canvas.style.width = `${String(SIZE)}px`;
            canvas.style.height = `${String(SIZE)}px`;
            document.body.appendChild(canvas);
            // Anti-aliasing as the element's `antialias` option builds the engine.
            engine = new Engine(canvas, antialias, { preserveDrawingBuffer: true });
            engine.setHardwareScalingLevel(1);
            const scene = new Scene(engine);
            scene.clearColor = new Color4(1, 1, 1, 1);
            const camera = new FreeCamera("camera", new Vector3(0.3, -0.2, -12), scene);
            camera.setTarget(Vector3.Zero());

            for (const seed of [7, 3, 5]) {
                const random = rng(seed);
                const places = new Float32Array(1024 * 4);
                for (let r = 0; r < ROWS; r++) {
                    places.set([random() * 8 - 4, random() * 8 - 4, random() * 2 - 1, 1], r * 4);
                }
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
                const pairs = Array.from({ length: EDGES }, (_, e) => {
                    const a = e % ROWS;
                    return [a, (a + 1 + Math.floor(random() * (ROWS - 1))) % ROWS] as const;
                });
                const at = (row: number): Vector3 => Vector3.FromArray(places, row * 4);

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
                const frame = async (): Promise<Uint8ClampedArray> => {
                    // A shader that fails to compile is never ready: fail on Babylon's error, not on a hang.
                    await Promise.race([scene.whenReadyAsync(), compileError]);
                    scene.render();
                    g.drawImage(canvas, 0, 0);
                    return g.getImageData(0, 0, SIZE, SIZE).data;
                };
                const differing = (x: Uint8ClampedArray, y: Uint8ClampedArray): number => {
                    let n = 0;
                    for (let i = 0; i < x.length; i += 4) {
                        n += x[i] !== y[i] || x[i + 1] !== y[i + 1] || x[i + 2] !== y[i + 2] ? 1 : 0;
                    }
                    return n;
                };
                const ink = (x: Uint8ClampedArray): number => {
                    let n = 0;
                    for (let i = 0; i < x.length; i += 4) {
                        n += x[i] < 250 ? 1 : 0;
                    }
                    return n;
                };

                for (const look of [
                    { width: 160, color: "#204080" },
                    { width: 0.05, color: "#802040", worldWidth: true },
                    { width: 4, color: "#000000", minScreenWidth: 1 },
                ]) {
                    const plain = new EdgeLineBatch(CustomLineRenderer.createJoinedLineMesh(look, scene), scene);
                    const pulled = new PulledLineBatch(
                        CustomLineRenderer.createJoinedLineMesh({ ...look, pulled: true, pulledLean: lean }, scene),
                        scene,
                        () => rowTexture,
                        false,
                        lean,
                    );
                    const plainSlots = pairs.map(() => plain.acquire());
                    const pieces = pairs.map(() => pulled.acquire());
                    pairs.forEach(([a, b], e) => {
                        pulled.setRows(pieces[e], a, b);
                        pulled.setLook(pieces[e], Color3.FromHexString(look.color), 1, look.width);
                    });
                    const placeAll = (): void => {
                        pairs.forEach(([a, b], e) => {
                            plain.place(plainSlots[e], at(a), at(b));
                        });
                    };
                    const both = async (): Promise<[Uint8ClampedArray, Uint8ClampedArray]> => {
                        plain.mesh.setEnabled(true);
                        pulled.mesh.setEnabled(false);
                        const p = await frame();
                        plain.mesh.setEnabled(false);
                        pulled.mesh.setEnabled(true);
                        const q = await frame();
                        return [p, q];
                    };
                    const name = `seed ${String(seed)} ${JSON.stringify(look)}`;
                    // The lean program draws a piece's rectangle alone: 6 indices, not the join template's 30.
                    assert.strictEqual(
                        pulled.mesh.subMeshes[0].indexCount,
                        EDGES * (lean ? 6 : 30),
                        `${name}: indices drawn`,
                    );

                    placeAll();
                    const [still, stillPulled] = await both();
                    assert.isAbove(ink(still), 500, `${name}: the plain lines draw`);
                    assert.strictEqual(differing(still, stillPulled), 0, `${name}: pixels differ at rest`);

                    // Move every row: the plain batch rewrites its slots, the pulled one only reads.
                    const uploaded = pulled.uploadedBytes;
                    for (let r = 0; r < ROWS; r++) {
                        places[r * 4] += 0.37;
                        places[r * 4 + 1] -= 0.21;
                    }
                    rowTexture.update(places);
                    placeAll();
                    const [moved, movedPulled] = await both();
                    assert.strictEqual(pulled.uploadedBytes, uploaded, `${name}: edge bytes uploaded on a move`);
                    assert.strictEqual(differing(moved, movedPulled), 0, `${name}: pixels differ after a move`);

                    // Row 0 hidden (w = 0), and one piece handed back.
                    places[3] = 0;
                    rowTexture.update(places);
                    pulled.release(pieces[1]);
                    pairs.forEach(([a, b], e) => {
                        if (a === 0 || b === 0 || e === 1) {
                            plain.setDrawn(plainSlots[e], false);
                        }
                    });
                    const [hidden, hiddenPulled] = await both();
                    assert.isBelow(ink(hidden), ink(moved), `${name}: hiding a row takes lines away`);
                    assert.strictEqual(
                        differing(hidden, hiddenPulled),
                        0,
                        `${name}: pixels differ with a row at w = 0`,
                    );

                    places[3] = 1;
                    rowTexture.update(places);
                    plain.dispose();
                    pulled.dispose();
                }
                rowTexture.dispose();
            }
        },
    );
});
