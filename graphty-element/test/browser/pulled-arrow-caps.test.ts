/**
 * @file A pulled arrow cap (`CAP_PULLED`, `PulledCapBatch`) draws the pixels of the placed cap (`ArrowCapBatch`),
 * stood where `Edge.placeArrowHead` stands it over the trim mirror's ends
 * (`trimEnds`), reads its place from the row table so a move uploads no cap byte, and draws nothing
 * once either end's row has w = 0 or the cap is handed back. Design:
 * `design/rendering/row-renderer.md`, section 4.3, stage 17.
 */

import { Color4, Constants, Engine, FreeCamera, Logger, RawTexture, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, test } from "vitest";

import { ArrowCapBatch } from "../../src/meshes/ArrowCapBatch";
import { trimEnds } from "../../src/meshes/edgeTrim";
import { FilledArrowRenderer } from "../../src/meshes/FilledArrowRenderer";

const SIZE = 240;
const ROWS = 60;
/** One cap a head row: caps meeting at one node tie in depth, which a float's last bit settles. */
const CAPS = ROWS / 2;
const ROW_TEXELS = 1024;
/**
 * Pixels the pulled caps draw differently from the placed ones. None: a pulled cap once lost a sample at its tip,
 * because the unbound `arrowClip` attribute read 0 and clipped it there. Never widened to pass.
 */
const KNOWN = { still: 0, moved: 0, hidden: 0 };
/** One sample of four, in levels, rounded up. */
const ONE_SAMPLE = 64;

let engine: Engine | undefined;

afterEach(() => {
    engine?.dispose();
    engine = undefined;
    document.querySelectorAll("canvas[data-pulled-caps]").forEach((c) => c.remove());
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

describe("pulled arrow caps", () => {
    test("draw the placed cap's pixels, upload nothing on a move, and go at a row of w = 0", async () => {
        const canvas = document.createElement("canvas");
        canvas.dataset.pulledCaps = "";
        canvas.width = SIZE;
        canvas.height = SIZE;
        canvas.style.width = `${String(SIZE)}px`;
        canvas.style.height = `${String(SIZE)}px`;
        document.body.appendChild(canvas);
        // Anti-aliasing on, as the element draws.
        engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
        engine.setHardwareScalingLevel(1);
        const scene = new Scene(engine);
        scene.clearColor = new Color4(1, 1, 1, 1);
        const camera = new FreeCamera("camera", new Vector3(0.3, -0.2, -12), scene);
        camera.setTarget(Vector3.Zero());

        const random = rng(11);
        // rowPosition: x, y, z, w. rowExtent, three texels a row: scale, round radius, border,
        // flags (1, round); half extents and bounding radius; a spare texel.
        const places = new Float32Array(ROW_TEXELS * 4);
        const extents = new Float32Array(ROW_TEXELS * 4);
        const rows = Array.from({ length: ROWS }, (_, r) => {
            const row = {
                scale: r % 3 === 0 ? 1.5 : 1,
                radius: 0.2 + random() * 0.3,
                border: r % 4 === 0 ? 0.1 : 0,
            };
            places.set([random() * 8 - 4, random() * 8 - 4, random() * 2 - 1, 1], r * 4);
            extents.set([row.scale, row.radius, row.border, 1], r * 12);
            extents.set([row.radius, row.radius, row.radius, row.radius], r * 12 + 4);
            return row;
        });
        const texture = (floats: Float32Array): RawTexture =>
            RawTexture.CreateRGBATexture(
                floats,
                ROW_TEXELS,
                1,
                scene,
                false,
                false,
                Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                Constants.TEXTURETYPE_FLOAT,
            );
        const positionTexture = texture(places);
        const extentTexture = texture(extents);
        const caps = Array.from({ length: CAPS }, (_, e) => {
            return {
                from: Math.floor(random() * CAPS),
                head: CAPS + e,
                capGap: e % 3 === 0 ? 0.05 : 0,
                centreBack: e % 2 === 0 ? 0 : 0.1,
                size: 0.5 * (1 + (e % 4) * 0.25),
                colour: ["#204080", "#802040", "#000000"][e % 3],
            };
        });
        const at = (row: number): Vector3 => Vector3.FromArray(places, row * 4);
        const end = (row: number, gap: number): Parameters<typeof trimEnds>[0]["source"] => ({
            radius: rows[row].radius,
            half: { x: rows[row].radius, y: rows[row].radius, z: rows[row].radius },
            flat: false,
            border: rows[row].border,
            gap,
            measured: -1,
            leaves: false,
            group: false,
        });

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
        // The largest difference in any channel: one sample of four is 255 / 4 levels.
        const farthest = (x: Uint8ClampedArray, y: Uint8ClampedArray): number => {
            let most = 0;
            for (let i = 0; i < x.length; i++) {
                most = Math.max(most, Math.abs(x[i] - y[i]));
            }
            return most;
        };
        const ink = (x: Uint8ClampedArray): number => {
            let n = 0;
            for (let i = 0; i < x.length; i += 4) {
                n += x[i] < 250 ? 1 : 0;
            }
            return n;
        };

        const placed = caps.map((cap) =>
            FilledArrowRenderer.createArrowCap(
                "normal",
                () => FilledArrowRenderer.createTriangle(false, scene),
                { size: cap.size, color: cap.colour, opacity: 1 },
                scene,
            ),
        );
        const placedMesh = placed[0].batchMesh;
        assert(placedMesh, "the placed caps' batch");
        // The row table as the batch reads it: its textures, and on the CPU what a rest placement reads.
        let settled = false;
        let moves = 0;
        const table = {
            get positionTexture() {
                return positionTexture;
            },
            get extentTexture() {
                return extentTexture;
            },
            get moves() {
                return moves;
            },
            extentWrites: 0,
            restingCenterOf: at,
            extentOf: (row: number) => ({
                scale: rows[row].scale,
                round: rows[row].radius,
                half: end(row, 0).half,
                border: rows[row].border,
            }),
            seenThrough: () => false,
            drawnPart: (row: number) => places[row * 4 + 3],
        };
        const pulled = new ArrowCapBatch(
            FilledArrowRenderer.applyInstancedShader(
                FilledArrowRenderer.createTriangle(false, scene),
                1,
                scene,
                undefined,
                true,
            ),
            "pulled",
            scene,
            true,
            { rows: table as never, settled: () => settled },
        );
        const slots = caps.map((cap) => {
            const slot = pulled.acquire();
            const { scale } = rows[cap.head];
            const look = {
                size: cap.size,
                centreAt: (tip: Vector3, direction: Vector3) => tip.subtract(direction.scale(cap.centreBack * scale)),
                lineStopAt: () => 0,
            };
            pulled.setPulled(slot, cap, cap, look, cap.colour, 1);
            return slot;
        });

        // Edge.placeArrowHead over the mirror's ends.
        let overlapping = 0;
        const placeAll = (): void => {
            caps.forEach((cap, e) => {
                const ends = trimEnds({
                    src: at(cap.from),
                    dst: at(cap.head),
                    source: end(cap.from, 0),
                    target: end(cap.head, 0),
                    capBack: 0,
                });
                const { scale } = rows[cap.head];
                if (ends.src === null || ends.dst === null) {
                    // Edge.placeArrowFromCentres: two round ends that overlap have boxes that do too, so no head
                    placed[e].setDrawn(false);
                    overlapping++;
                    return;
                }

                const src = new Vector3(ends.src.x, ends.src.y, ends.src.z);
                const dst = new Vector3(ends.dst.x, ends.dst.y, ends.dst.z);
                const direction = dst.subtract(src).normalize();
                placed[e].setScale(scale);
                placed[e].place(dst.subtract(direction.scale(cap.capGap + cap.centreBack * scale)), direction);
            });
        };
        const both = async (): Promise<[Uint8ClampedArray, Uint8ClampedArray]> => {
            placedMesh.setEnabled(true);
            pulled.mesh.setEnabled(false);
            const p = await frame();
            placedMesh.setEnabled(false);
            pulled.mesh.setEnabled(true);
            const q = await frame();
            return [p, q];
        };

        placeAll();
        const [still, stillPulled] = await both();
        assert.isAbove(ink(still), 500, "the placed caps draw");
        assert.isAbove(overlapping, 0, "some caps join overlapping nodes");
        assert.strictEqual(differing(still, stillPulled), KNOWN.still, "pixels differ at rest");
        assert.isAtMost(farthest(still, stillPulled), ONE_SAMPLE, "at rest, by one sample at most");

        // At rest the batch places its caps on the CPU, by the placed caps' own arithmetic: the same picture.
        settled = true;
        await both();
        const [, stillPlaced] = await both();
        assert.strictEqual(pulled.placedCaps, CAPS - overlapping, "caps placed at rest");
        assert.strictEqual(differing(still, stillPlaced), 0, "pixels differ once placed at rest");
        const placedAtRest = pulled.placedCaps;

        // Move every row: the placed caps are placed again, the pulled ones only read.
        settled = false;
        moves++;
        for (let r = 0; r < ROWS; r++) {
            places[r * 4] += 0.37;
            places[r * 4 + 1] -= 0.21;
        }
        positionTexture.update(places);
        placeAll();
        const [moved, movedPulled] = await both();
        assert.strictEqual(pulled.placedCaps, placedAtRest, "caps placed on the CPU on a move");
        assert.strictEqual(differing(moved, movedPulled), KNOWN.moved, "pixels differ after a move");
        assert.isAtMost(farthest(moved, movedPulled), ONE_SAMPLE, "after a move, by one sample at most");

        // Row 0 hidden (w = 0), and one cap handed back.
        places[3] = 0;
        positionTexture.update(places);
        pulled.release(slots[1]);
        caps.forEach((cap, e) => {
            if (cap.from === 0 || cap.head === 0 || e === 1) {
                placed[e].setDrawn(false);
            }
        });
        const [hidden, hiddenPulled] = await both();
        assert.isBelow(ink(hidden), ink(moved), "hiding a row takes caps away");
        assert.strictEqual(differing(hidden, hiddenPulled), KNOWN.hidden, "pixels differ with a row at w = 0");
        assert.isAtMost(farthest(hidden, hiddenPulled), ONE_SAMPLE, "with a row at w = 0, by one sample at most");

        pulled.dispose();
    });
});
