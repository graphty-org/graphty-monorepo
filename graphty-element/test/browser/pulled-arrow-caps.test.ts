/**
 * @file A pulled arrow cap (`CAP_PULLED`, `PulledCapBatch`) draws the same pixels as the placed
 * cap (`ArrowCapBatch`) stood where `Edge.placeArrowHead` stands it over the trim mirror's ends
 * (`trimEnds`), reads its place from the row table so a move uploads no cap byte, and draws nothing
 * once either end's row has w = 0 or the cap is handed back. Design:
 * `design/rendering/row-renderer.md`, section 4.3, stage 17.
 */

import { Color4, Constants, Engine, FreeCamera, Logger, RawTexture, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, test } from "vitest";

import { surfaceReach } from "../../src/meshes/edgeRoute";
import { trimEnds } from "../../src/meshes/edgeTrim";
import { FilledArrowRenderer } from "../../src/meshes/FilledArrowRenderer";
import { PulledCapBatch } from "../../src/meshes/PulledCapBatch";

const SIZE = 240;
const ROWS = 60;
/** One cap a head row: caps meeting at one node tie in depth, which a float's last bit settles. */
const CAPS = ROWS / 2;
const ROW_TEXELS = 1024;

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
                fromGap: e % 5 === 0 ? 0.08 : 0,
                headGap: e % 7 === 0 ? 0.06 : 0,
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
        const pulled = new PulledCapBatch(
            FilledArrowRenderer.applyPulledShader(FilledArrowRenderer.createTriangle(false, scene), 1, scene),
            scene,
            () => ({ position: positionTexture, extent: extentTexture }),
        );
        const slots = caps.map((cap) => {
            const slot = pulled.acquire();
            pulled.setCap(slot, cap);
            return slot;
        });

        // Edge.placeArrowHead over the mirror's ends.
        let overlapping = 0;
        const placeAll = (): void => {
            caps.forEach((cap, e) => {
                const ends = trimEnds({
                    src: at(cap.from),
                    dst: at(cap.head),
                    source: end(cap.from, cap.fromGap),
                    target: end(cap.head, cap.headGap),
                    capBack: 0,
                });
                const { scale } = rows[cap.head];
                if (ends.src === null || ends.dst === null) {
                    // Edge.placeArrowFromCentres: overlapping nodes, the tip at the target's box
                    const direction = at(cap.head).subtract(at(cap.from)).normalize();
                    const reach = surfaceReach(direction, end(cap.head, 0).half, null);
                    const tip = at(cap.head).subtract(direction.scale(reach));
                    placed[e].setScale(scale);
                    placed[e].place(tip.subtract(direction.scale(cap.capGap + cap.centreBack * scale)), direction);
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
        assert.strictEqual(differing(still, stillPulled), 0, "pixels differ at rest");

        // Move every row: the placed caps are placed again, the pulled ones only read.
        const uploaded = pulled.uploadedBytes;
        for (let r = 0; r < ROWS; r++) {
            places[r * 4] += 0.37;
            places[r * 4 + 1] -= 0.21;
        }
        positionTexture.update(places);
        placeAll();
        const [moved, movedPulled] = await both();
        assert.strictEqual(pulled.uploadedBytes, uploaded, "cap bytes uploaded on a move");
        assert.strictEqual(differing(moved, movedPulled), 0, "pixels differ after a move");

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
        assert.strictEqual(differing(hidden, hiddenPulled), 0, "pixels differ with a row at w = 0");

        pulled.dispose();
    });
});
