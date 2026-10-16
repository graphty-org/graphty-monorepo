/**
 * @file A bent edge's pieces meet at their corners: no notch outside the bend, no pixel drawn twice
 * inside it, and dashes that carry on round it.
 *
 * Every bend is drawn twice, by the line batch's own shader and by the browser's 2D canvas
 * (`lineJoin = "miter"`, `miterLimit = 4`, butt caps: the stroke SVG and Canvas define), and the
 * two are compared pixel by pixel. A pixel the canvas fills and the line leaves empty is a notch
 * or a hole; one the line fills and the canvas leaves empty is a spill; and on a translucent line,
 * a pixel darker than the line's own tint was drawn twice. Design: `design/edges/sharp-corners.md`.
 */

import { Camera, Color4, Engine, FreeCamera, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, test } from "vitest";

import { CustomLineRenderer } from "../../src/meshes/CustomLineRenderer";
import { EdgeLineBatch } from "../../src/meshes/EdgeLineBatch";
import { Simple2DLineRenderer } from "../../src/meshes/Simple2DLineRenderer";

const CELL = 160;
/** Interior angles of the bends, in degrees, then a U-turn and a U whose middle is 16 px. */
const CASES = [179, 170, 135, 90, 45, 20, 5, 0, "U"] as const;
const WIDTHS = [3, 8, 24];
const ALPHAS = [1, 0.5];
const W = CELL * WIDTHS.length * ALPHAS.length;
const H = CELL * CASES.length;
const COLOR = "#1f4d99";
/**
 * Pixels per bend the two may disagree on: the canvas anti-aliases analytically and the line by
 * multisampling, so a pixel or two on an edge lands either side of a threshold. The defects these
 * tests exist for are far larger: the notch outside a 135 degree bend of an 8 px line drawn as two
 * rectangles is tens of pixels, the overlap inside it hundreds.
 */
const ANTI_ALIASING = 3;
const RED = 0x1f;

interface Bend {
    readonly points: number[];
    readonly width: number;
    readonly alpha: number;
    readonly row: number;
    readonly col: number;
}

/**
 * Every test bend, as screen-pixel points (x right, y down), each centred in its own cell.
 * @returns The bends.
 */
function bends(): Bend[] {
    const out: Bend[] = [];
    const turn = (10 * Math.PI) / 180;
    CASES.forEach((angle, row) => {
        ALPHAS.forEach((alpha, ai) => {
            WIDTHS.forEach((width, wi) => {
                const col = ai * WIDTHS.length + wi;
                const cx = col * CELL + CELL / 2;
                const cy = row * CELL + 115;
                let local: number[][];
                if (angle === "U") {
                    local = [
                        [-8, -70],
                        [-8, 0],
                        [8, 0],
                        [8, -60],
                    ];
                } else {
                    const h = (angle / 2) * (Math.PI / 180);
                    local = [
                        [70 * Math.cos(-Math.PI / 2 - h), 70 * Math.sin(-Math.PI / 2 - h)],
                        [0, 0],
                        [60 * Math.cos(-Math.PI / 2 + h), 60 * Math.sin(-Math.PI / 2 + h)],
                    ];
                }
                const points = local.flatMap(([x, y]) => [
                    cx + x * Math.cos(turn) - y * Math.sin(turn),
                    cy + x * Math.sin(turn) + y * Math.cos(turn),
                ]);
                out.push({ points, width, alpha, row, col });
            });
        });
    });
    return out;
}

interface Drawn {
    /** The batch's frame and the canvas's, each the red channel's coverage per pixel (0 to 1). */
    readonly mine: Float32Array;
    readonly reference: Float32Array;
}

let engine: Engine | undefined;

afterEach(() => {
    engine?.dispose();
    engine = undefined;
    document.querySelectorAll("canvas[data-corner-joins]").forEach((c) => c.remove());
});

/**
 * Coverage of the line's colour at each pixel, read from the red channel over white.
 * @param data - RGBA bytes.
 * @returns Coverage per pixel.
 */
function coverage(data: Uint8ClampedArray): Float32Array {
    const out = new Float32Array(data.length / 4);
    for (let i = 0; i < out.length; i++) {
        out[i] = Math.max(0, (255 - data[i * 4]) / (255 - RED));
    }
    return out;
}

/**
 * Draw every bend with the line batch (2D: orthographic, one world unit a pixel) and with the
 * canvas, and read both back.
 * @param dash - The dash length, or 0 for solid lines.
 * @returns Both frames.
 */
async function draw(dash: number): Promise<Drawn> {
    const canvas = document.createElement("canvas");
    canvas.dataset.cornerJoins = "";
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = `${String(W)}px`;
    canvas.style.height = `${String(H)}px`;
    document.body.appendChild(canvas);
    engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
    engine.setHardwareScalingLevel(1);
    const scene = new Scene(engine);
    scene.clearColor = new Color4(1, 1, 1, 1);
    const camera = new FreeCamera("ortho", new Vector3(0, 0, -100), scene);
    camera.setTarget(Vector3.Zero());
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    camera.orthoLeft = 0;
    camera.orthoRight = W;
    camera.orthoTop = 0;
    camera.orthoBottom = -H;

    const all = bends();
    const batches = new Map<string, EdgeLineBatch>();
    const spacings = new Map<Bend, number>();
    for (const bend of all) {
        const key = `${String(bend.width)}|${String(bend.alpha)}`;
        let batch = batches.get(key);
        if (!batch) {
            const mesh =
                dash > 0
                    ? CustomLineRenderer.createJoinedLineMesh(
                          {
                              width: bend.width,
                              color: COLOR,
                              opacity: bend.alpha,
                              worldWidth: true,
                              pattern: { kind: "dash", elementLength: dash },
                          },
                          scene,
                      )
                    : Simple2DLineRenderer.createBatchMesh(bend.width, COLOR, bend.alpha, scene);
            batch = new EdgeLineBatch(mesh, scene);
            batches.set(key, batch);
        }
        const slots = Array.from({ length: bend.points.length / 2 - 1 }, () => batch.acquire());
        // World y is up; the canvas's y is down.
        const flat: number[] = [];
        for (let i = 0; i < bend.points.length; i += 2) {
            flat.push(bend.points[i], -bend.points[i + 1], 0);
        }
        batch.placeRun(slots, flat);
        const data = (batch as unknown as { slots: Float32Array }).slots;
        spacings.set(bend, data[slots[0] * 14 + 13]);
    }

    await scene.whenReadyAsync();
    scene.render();

    const read = document.createElement("canvas");
    read.width = W;
    read.height = H;
    const g = read.getContext("2d", { willReadFrequently: true });
    assert(g, "a 2D canvas");
    g.drawImage(canvas, 0, 0);
    const mine = coverage(g.getImageData(0, 0, W, H).data);

    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, W, H);
    g.lineJoin = "miter";
    g.miterLimit = 4;
    g.lineCap = "butt";
    for (const bend of all) {
        g.strokeStyle = `rgba(31, 77, 153, ${String(bend.alpha)})`;
        g.lineWidth = bend.width;
        const spacing = spacings.get(bend) ?? 0;
        g.setLineDash(dash > 0 ? [dash, spacing - dash] : []);
        g.beginPath();
        for (let i = 0; i < bend.points.length; i += 2) {
            if (i === 0) {
                g.moveTo(bend.points[i], bend.points[i + 1]);
            } else {
                g.lineTo(bend.points[i], bend.points[i + 1]);
            }
        }
        g.stroke();
    }
    const reference = coverage(g.getImageData(0, 0, W, H).data);
    return { mine, reference };
}

interface Defects {
    overlap: number;
    hole: number;
    spill: number;
}

/**
 * Count the defects in one bend's cell.
 * @param drawn - Both frames.
 * @param bend - The bend.
 * @returns Pixels drawn twice (translucent lines only), holes and spills.
 */
function defects(drawn: Drawn, bend: Bend): Defects {
    const out = { overlap: 0, hole: 0, spill: 0 };
    for (let y = bend.row * CELL; y < (bend.row + 1) * CELL; y++) {
        for (let x = bend.col * CELL; x < (bend.col + 1) * CELL; x++) {
            const m = drawn.mine[y * W + x] / bend.alpha;
            const q = drawn.reference[y * W + x] / bend.alpha;
            // Drawn twice at 50% is 75%: well past what anti-aliasing can reach.
            if (bend.alpha < 1 && m > 1.2) {
                out.overlap++;
            }
            if (q > 0.85 && m < 0.25) {
                out.hole++;
            }
            if (q < 0.15 && m > 0.75) {
                out.spill++;
            }
        }
    }
    return out;
}

/**
 * Every bend's defects, as lines naming the bend, for an assertion message.
 * @param drawn - Both frames.
 * @param pick - Which defects count.
 * @returns The lines, empty when there are none.
 */
function report(drawn: Drawn, pick: (d: Defects, bend: Bend) => number): string[] {
    const lines: string[] = [];
    for (const bend of bends()) {
        const n = pick(defects(drawn, bend), bend);
        if (n > ANTI_ALIASING) {
            lines.push(
                `${String(CASES[bend.row])} deg, ${String(bend.width)} px, alpha ${String(bend.alpha)}: ${String(n)}`,
            );
        }
    }
    return lines;
}

describe("a bent edge's corners", () => {
    test("cover the outside of every bend as a miter or a bevel would, with no hole and no spill", async () => {
        const drawn = await draw(0);
        const wrong = report(drawn, (d) => d.hole + d.spill);
        assert.deepEqual(wrong, [], "pixels the canvas stroke and the line disagree on, per bend");
    });

    test("draw no pixel twice on a translucent line", async () => {
        const drawn = await draw(0);
        // The U whose middle is shorter than the line is wide is the one exception: its two arms
        // are not neighbours and overlap each other (design/edges/sharp-corners.md).
        const twice = report(drawn, (d, bend) => (CASES[bend.row] === "U" ? 0 : d.overlap));
        assert.deepEqual(twice, [], "pixels drawn twice, per bend");
    });

    test("carry the dash pattern round the bend, as dashing the centre line and then stroking does", async () => {
        const drawn = await draw(12);
        const wrong = report(drawn, (d) => d.hole + d.spill);
        assert.deepEqual(wrong, [], "pixels the dashed canvas stroke and the line disagree on, per bend");
    });
});
