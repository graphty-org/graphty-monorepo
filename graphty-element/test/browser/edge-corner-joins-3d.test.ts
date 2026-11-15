/**
 * @file Every pixel of a bent edge is drawn by exactly one of its pieces, under the 3D camera's
 * perspective -- which draws each piece as a trapezoid, wider at its nearer end -- at every tilt,
 * and where a piece shorter than the line is wide lets the pieces either side of it overlap.
 *
 * Each piece of the joined edge is drawn on its own, from the slot the batch wrote for it (a slot
 * carries its neighbours' corners, so the others need not be drawn), with no anti-aliasing so a
 * pixel is either drawn or not. The pieces' drawings must not overlap, and together they must
 * cover every pixel inside the outline the same pieces cover when each is drawn as a plain
 * straight line. (A pixel on that outline is not compared: where the pieces meet at a shared miter
 * line, a piece's side runs along the plain line's side but from a different vertex, so a pixel
 * centre exactly on it can round either way.) Design:
 * `design/edges/sharp-corners.md`.
 */

import { Color4, Effect, Engine, FreeCamera, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, test, vi } from "vitest";

import { CustomLineRenderer } from "../../src/meshes/CustomLineRenderer";
import { EdgeLineBatch } from "../../src/meshes/EdgeLineBatch";

const SIZE = 200;
/** The camera's turn away from straight on, in degrees, about a diagonal axis. */
const TILTS = Array.from({ length: 41 }, (_, i) => i * 2);
/** Interior angles of the bends, then U-turns whose middle is shorter than the line is wide. */
const SHAPES = [150, 90, 60, 35, "U", "narrow U"] as const;
/** The line's half width in pixels where it is 10 units from the camera. */
const HALF_WIDTH = 12;

let engine: Engine | undefined;

afterEach(() => {
    vi.restoreAllMocks();
    engine?.dispose();
    engine = undefined;
    document.querySelectorAll("canvas[data-corner-joins-3d]").forEach((c) => c.remove());
});

/**
 * One shape's points in world units, in the z = 0 plane around the origin.
 * @param shape - The bend's interior angle, or a U.
 * @returns Flat x, y, z.
 */
function pointsOf(shape: (typeof SHAPES)[number]): number[] {
    if (shape === "U" || shape === "narrow U") {
        const half = shape === "U" ? 0.2 : 0.1;
        return [-half, 2, 0, -half, 0, 0, half, 0, 0, half, 1.8, 0];
    }
    const h = (shape / 2) * (Math.PI / 180);
    return [-2 * Math.sin(h), 2 * Math.cos(h), 0, 0, 0, 0, 1.8 * Math.sin(h), 1.8 * Math.cos(h), 0];
}

describe("a bent edge's pieces under the 3D camera", () => {
    test("cover every pixel of the line exactly once, at every tilt", async () => {
        const canvas = document.createElement("canvas");
        canvas.dataset.cornerJoins3d = "";
        canvas.width = SIZE;
        canvas.height = SIZE;
        canvas.style.width = `${String(SIZE)}px`;
        canvas.style.height = `${String(SIZE)}px`;
        document.body.appendChild(canvas);
        engine = new Engine(canvas, false, { preserveDrawingBuffer: true });
        engine.setHardwareScalingLevel(1);
        const scene = new Scene(engine);
        scene.clearColor = new Color4(1, 1, 1, 1);
        const camera = new FreeCamera("perspective", new Vector3(0, 0, -10), scene);
        camera.minZ = 0.1;
        // The 3D line's half width in pixels is a quarter of `width` over the depth.
        const width = HALF_WIDTH * 4 * 10;

        const read = document.createElement("canvas");
        read.width = SIZE;
        read.height = SIZE;
        const g = read.getContext("2d", { willReadFrequently: true });
        assert(g, "a 2D canvas");
        const frame = async (): Promise<Uint8Array> => {
            await scene.whenReadyAsync();
            scene.render();
            g.drawImage(canvas, 0, 0);
            const { data } = g.getImageData(0, 0, SIZE, SIZE);
            const out = new Uint8Array(SIZE * SIZE);
            for (let i = 0; i < out.length; i++) {
                out[i] = data[i * 4] < 128 ? 1 : 0;
            }
            return out;
        };

        // The shader snaps to the pixel it draws only when it is told the viewport's size.
        const sizes: number[][] = [];
        const { setFloat2 } = Effect.prototype;
        vi.spyOn(Effect.prototype, "setFloat2").mockImplementation(function (this: Effect, name, x, y) {
            if (name === "fragmentSize") {
                sizes.push([x, y]);
            }
            return setFloat2.call(this, name, x, y);
        });

        const wrong: string[] = [];
        for (const shape of SHAPES) {
            const flat = pointsOf(shape);
            const count = flat.length / 3 - 1;
            const joined = new EdgeLineBatch(
                CustomLineRenderer.createJoinedLineMesh({ width, color: "#000000" }, scene),
                scene,
            );
            const plain = new EdgeLineBatch(
                CustomLineRenderer.createJoinedLineMesh({ width, color: "#000000" }, scene),
                scene,
            );
            const slots = Array.from({ length: count }, () => joined.acquire());
            const plainSlots = Array.from({ length: count }, () => plain.acquire());
            plainSlots.forEach((slot, i) => {
                plain.place(slot, Vector3.FromArray(flat, i * 3), Vector3.FromArray(flat, i * 3 + 3));
            });

            for (const tilt of TILTS) {
                const t = (tilt * Math.PI) / 180;
                camera.position.set(7 * Math.sin(t), -7 * Math.sin(t), -10 * Math.cos(t));
                camera.setTarget(Vector3.Zero());

                // Each piece alone: every other slot hidden, its own carrying its neighbours.
                plain.mesh.setEnabled(false);
                joined.mesh.setEnabled(true);
                const drawnBy = new Uint8Array(SIZE * SIZE);
                for (let k = 0; k < count; k++) {
                    joined.placeRun(slots, flat);
                    slots.forEach((slot, j) => {
                        if (j !== k) {
                            joined.setDrawn(slot, false);
                        }
                    });
                    const piece = await frame();
                    piece.forEach((on, i) => (drawnBy[i] += on));
                }
                joined.mesh.setEnabled(false);
                plain.mesh.setEnabled(true);
                const union = await frame();

                let hole = 0;
                let twice = 0;
                for (let i = 0; i < drawnBy.length; i++) {
                    const x = i % SIZE;
                    const inside =
                        x > 0 &&
                        x < SIZE - 1 &&
                        union[i - 1] === 1 &&
                        union[i + 1] === 1 &&
                        union[i - SIZE] === 1 &&
                        union[i + SIZE] === 1;
                    hole += inside && drawnBy[i] === 0 ? 1 : 0;
                    twice += drawnBy[i] > 1 ? 1 : 0;
                }
                if (hole > 0 || twice > 0) {
                    wrong.push(
                        `${String(shape)} at ${String(tilt)} deg: ${String(hole)} holes, ${String(twice)} drawn twice`,
                    );
                }
            }

            joined.dispose();
            plain.dispose();
        }
        assert.deepEqual(wrong, [], "pixels no piece draws or two pieces draw, per shape and tilt");
        assert.isNotEmpty(sizes, "every draw tells the shader the viewport's size");
        assert.isTrue(
            sizes.every(([x, y]) => x === SIZE && y === SIZE),
            "as the canvas's size in pixels",
        );
    });

    test("draw an opaque curve as one solid line under anti-aliasing, with no light dot at any join", async () => {
        // The element draws with anti-aliasing on. Where two pieces of a curve meet, a pixel has
        // samples in both: if either piece discards the pixel the other cannot fill it, and the
        // curve shows a light dot at every join (issue #5799).
        const canvas = document.createElement("canvas");
        canvas.dataset.cornerJoins3d = "";
        canvas.width = SIZE;
        canvas.height = SIZE;
        canvas.style.width = `${String(SIZE)}px`;
        canvas.style.height = `${String(SIZE)}px`;
        document.body.appendChild(canvas);
        engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
        engine.setHardwareScalingLevel(1);
        const scene = new Scene(engine);
        scene.clearColor = new Color4(1, 1, 1, 1);
        // Straight on, so the curve in the z = 0 plane is a circular arc on screen.
        const camera = new FreeCamera("perspective", new Vector3(0, 0, -10), scene);
        camera.setTarget(Vector3.Zero());
        camera.minZ = 0.1;
        const pxPerUnit = SIZE / 2 / Math.tan(camera.fov / 2) / 10;
        const R = 2;
        const PIECES = 64;
        const flat: number[] = [];
        for (let i = 0; i <= PIECES; i++) {
            const a = Math.PI * (0.1 + (0.8 * i) / PIECES);
            flat.push(R * Math.cos(a), R * Math.sin(a) - 1, 0);
        }
        const batch = new EdgeLineBatch(
            CustomLineRenderer.createJoinedLineMesh({ width: HALF_WIDTH * 4 * 10, color: "#000000" }, scene),
            scene,
        );
        batch.placeRun(
            Array.from({ length: PIECES }, () => batch.acquire()),
            flat,
        );
        await scene.whenReadyAsync();
        scene.render();
        const read = document.createElement("canvas");
        read.width = SIZE;
        read.height = SIZE;
        const g = read.getContext("2d", { willReadFrequently: true });
        assert(g, "a 2D canvas");
        g.drawImage(canvas, 0, 0);
        const { data } = g.getImageData(0, 0, SIZE, SIZE);

        // World y is up and the canvas's y down; the arc's centre is at world (0, -1).
        const cx = SIZE / 2;
        const cy = SIZE / 2 + pxPerUnit;
        const rPx = R * pxPerUnit;
        let inside = 0;
        let light = 0;
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                const dx = x + 0.5 - cx;
                const dy = cy - (y + 0.5);
                const a = Math.atan2(dy, dx);
                if (Math.abs(Math.hypot(dx, dy) - rPx) > HALF_WIDTH - 1.5 || a < Math.PI * 0.15 || a > Math.PI * 0.85) {
                    continue;
                }
                inside++;
                light += data[(y * SIZE + x) * 4] > 8 ? 1 : 0;
            }
        }
        batch.dispose();
        assert.isAbove(inside, 0, "the curve is on screen");
        assert.strictEqual(light, 0, `pixels inside the curve lighter than its color, of ${String(inside)}`);
    });
});
