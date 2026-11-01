/**
 * @file A bent edge's pieces meet at their corners: no notch outside the bend, no pixel drawn twice
 * inside it, and dashes that carry on round it.
 *
 * Every bend is drawn twice, by the line batch's own shader and by a reference: the browser's 2D
 * canvas (`lineJoin = "miter"`, `miterLimit = 4`, butt caps), plus, at a corner past the miter
 * limit, the clipped miter SVG 2 defines for `stroke-linejoin: miter-clip`, which no canvas draws,
 * filled from its geometry. The two are compared pixel by pixel. A pixel the canvas fills and the line leaves empty is a notch
 * or a hole; one the line fills and the canvas leaves empty is a spill; and on a translucent line,
 * a pixel darker than the line's own tint was drawn twice. Design: `design/edges/sharp-corners.md`.
 */

import { Camera, Color4, Engine, FreeCamera, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, test } from "vitest";

import { CustomLineRenderer } from "../../src/meshes/CustomLineRenderer";
import { EDGE_MITER_LIMIT, JOIN_FLOATS_PER_PIECE } from "../../src/meshes/edgeJoinShader";
import { EdgeLineBatch } from "../../src/meshes/EdgeLineBatch";
import { Simple2DLineRenderer } from "../../src/meshes/Simple2DLineRenderer";

const CELL = 160;
/** Interior angles of the bends, in degrees, then a U-turn and a U whose middle is 16 px. */
const CASES = [179, 170, 135, 90, 45, 20, 5, 0, "U"] as const;
const WIDTHS = [3, 8, 24];
const ALPHAS = [1, 0.5];
const WIDTH = CELL * WIDTHS.length * ALPHAS.length;
const HEIGHT = CELL * CASES.length;
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
    /** The batch's frame and the reference's, each the red channel's coverage per pixel (0 to 1). */
    readonly mine: Float32Array;
    readonly reference: Float32Array;
    /** The frame's width in pixels. */
    readonly width: number;
}

/**
 * The corner at `p` between the piece from `q0` and the piece to `q1`, as SVG 2's miter-clip
 * draws it: how far its point reaches from the corner along the miter direction, and, when the
 * miter is clipped (past the miter limit, or where it would reach past the shorter piece), the
 * outline of the clipped join.
 * @param q0 - The previous point.
 * @param p - The corner.
 * @param q1 - The next point.
 * @param hw - Half the line's width.
 * @returns The point's reach, the miter direction, and the clipped outline or undefined.
 */
function miterClip(
    q0: number[],
    p: number[],
    q1: number[],
    hw: number,
): { reach: number; m: number[]; clipped: number[][] | undefined } {
    const a = [p[0] - q0[0], p[1] - q0[1]];
    const b = [q1[0] - p[0], q1[1] - p[1]];
    const la = Math.hypot(a[0], a[1]);
    const lb = Math.hypot(b[0], b[1]);
    const dIn = [a[0] / la, a[1] / la];
    const dOut = [b[0] / lb, b[1] / lb];
    const outer = dIn[0] * dOut[1] - dIn[1] * dOut[0] > 0 ? -1 : 1;
    const nIn = [-dIn[1] * outer, dIn[0] * outer];
    const nOut = [-dOut[1] * outer, dOut[0] * outer];
    const sum = [nIn[0] + nOut[0], nIn[1] + nOut[1]];
    const sl = Math.hypot(sum[0], sum[1]);
    const cosH = Math.max(sl / 2, 1e-6);
    const sinH = Math.sqrt(Math.max(0, 1 - cosH * cosH));
    const m = sl > 1e-6 ? [sum[0] / sl, sum[1] / sl] : dIn;
    const tMiter = (hw * sinH) / cosH;
    const tLimit = 1 / cosH <= EDGE_MITER_LIMIT ? tMiter : ((EDGE_MITER_LIMIT - cosH) * hw) / sinH;
    const tMax = Math.min(la, lb, tLimit);
    if (tMiter <= tMax) {
        return { reach: hw / cosH, m, clipped: undefined };
    }
    const sIn = [p[0] + nIn[0] * hw, p[1] + nIn[1] * hw];
    const sOut = [p[0] + nOut[0] * hw, p[1] + nOut[1] * hw];
    return {
        reach: hw * cosH + tMax * sinH,
        m,
        clipped: [
            p,
            sIn,
            [sIn[0] + dIn[0] * tMax, sIn[1] + dIn[1] * tMax],
            [sOut[0] - dOut[0] * tMax, sOut[1] - dOut[1] * tMax],
            sOut,
        ],
    };
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
 * reference, and read both back.
 * @param dash - The dash length, or 0 for solid lines.
 * @param all - The bends.
 * @param W - The frame's width.
 * @param H - The frame's height.
 * @returns Both frames.
 */
async function draw(dash: number, all: Bend[] = bends(), W = WIDTH, H = HEIGHT): Promise<Drawn> {
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
        spacings.set(bend, data[slots[0] * JOIN_FLOATS_PER_PIECE + 13]);
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
    // Each bend is drawn opaque on its own layer and laid on at its opacity, so the stroke and a
    // clipped join overlapping it tint once, as one shape does.
    const layer = document.createElement("canvas");
    layer.width = W;
    layer.height = H;
    const l = layer.getContext("2d");
    assert(l, "a 2D canvas");
    l.lineJoin = "miter";
    l.miterLimit = EDGE_MITER_LIMIT;
    l.lineCap = "butt";
    l.strokeStyle = COLOR;
    l.fillStyle = COLOR;
    for (const bend of all) {
        l.clearRect(0, 0, W, H);
        l.lineWidth = bend.width;
        const spacing = spacings.get(bend) ?? 0;
        l.setLineDash(dash > 0 ? [dash, spacing - dash] : []);
        l.beginPath();
        const pts: number[][] = [];
        for (let i = 0; i < bend.points.length; i += 2) {
            pts.push([bend.points[i], bend.points[i + 1]]);
            if (i === 0) {
                l.moveTo(bend.points[i], bend.points[i + 1]);
            } else {
                l.lineTo(bend.points[i], bend.points[i + 1]);
            }
        }
        l.stroke();
        let along = 0;
        for (let i = 1; i < pts.length - 1; i++) {
            along += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
            const { clipped } = miterClip(pts[i - 1], pts[i], pts[i + 1], bend.width / 2);
            // A dashed line draws a corner's join only where a dash covers the corner.
            const onDash = dash === 0 || along % spacing <= dash;
            if (clipped && onDash) {
                l.setLineDash([]);
                l.beginPath();
                clipped.forEach(([x, y], k) => (k === 0 ? l.moveTo(x, y) : l.lineTo(x, y)));
                l.closePath();
                l.fill();
            }
        }
        g.globalAlpha = bend.alpha;
        g.drawImage(layer, 0, 0);
        g.globalAlpha = 1;
    }
    const reference = coverage(g.getImageData(0, 0, W, H).data);
    return { mine, reference, width: W };
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
            const m = drawn.mine[y * drawn.width + x] / bend.alpha;
            const q = drawn.reference[y * drawn.width + x] / bend.alpha;
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
        // The U whose middle is shorter than the line is wide included: its two arms are not
        // neighbours, and the later one gives the overlap to the earlier (issue #3096).
        const twice = report(drawn, (d) => d.overlap);
        assert.deepEqual(twice, [], "pixels drawn twice, per bend");
    });

    test("shrink a corner's point smoothly as the bend sharpens past the miter limit, with no jump to a bevel", async () => {
        // Bends from 40 degrees to 18 in half-degree steps: the miter limit of 4 is crossed at
        // 28.96 degrees. Each width's sweep is three rows of fifteen cells.
        const SWEEP = Array.from({ length: 45 }, (_, i) => 40 - i * 0.5);
        const S = 120;
        const COLS = 15;
        const sweep: (Bend & { angle: number })[] = [];
        WIDTHS.forEach((width, wi) => {
            SWEEP.forEach((angle, i) => {
                const row = wi * 3 + Math.floor(i / COLS);
                const col = i % COLS;
                const h = (angle / 2) * (Math.PI / 180);
                const cx = col * S + S / 2;
                const cy = row * S + 55;
                const points = [
                    [45 * Math.cos(-Math.PI / 2 - h), 45 * Math.sin(-Math.PI / 2 - h)],
                    [0, 0],
                    [45 * Math.cos(-Math.PI / 2 + h), 45 * Math.sin(-Math.PI / 2 + h)],
                ].flatMap(([x, y]) => [cx + x, cy + y]);
                sweep.push({ points, width, alpha: 1, row, col, angle });
            });
        });
        const W = S * COLS;
        const drawn = await draw(0, sweep, W, S * 3 * WIDTHS.length);

        const wrong: string[] = [];
        for (const width of WIDTHS) {
            const hw = width / 2;
            let last: number | undefined;
            for (const bend of sweep.filter((b) => b.width === width)) {
                const p = bend.points;
                const { m } = miterClip([p[0], p[1]], [p[2], p[3]], [p[4], p[5]], hw);
                // How far a point reaches along the miter direction: the furthest pixel centre at
                // least half covered, within the line's width of the miter's axis. Measured the
                // same way in the line's frame and in the reference's.
                const reachOf = (frame: Float32Array): number => {
                    let far = 0;
                    for (let y = bend.row * S; y < (bend.row + 1) * S; y++) {
                        for (let x = bend.col * S; x < (bend.col + 1) * S; x++) {
                            const u = [x + 0.5 - p[2], y + 0.5 - p[3]];
                            if (frame[y * W + x] >= 0.5 && Math.abs(u[0] * m[1] - u[1] * m[0]) <= hw) {
                                far = Math.max(far, u[0] * m[0] + u[1] * m[1]);
                            }
                        }
                    }
                    return far;
                };
                const tip = reachOf(drawn.mine);
                const reach = reachOf(drawn.reference);
                const at = `${String(bend.angle)} deg, ${String(width)} px`;
                if (Math.abs(tip - reach) > 1.5) {
                    wrong.push(`${at}: the point reaches ${tip.toFixed(1)} px, the clipped miter ${reach.toFixed(1)}`);
                }
                // The point moves 0.07 half-widths a step as a miter, and not at all once clipped;
                // a switch to a bevel drops it by about 3 half-widths in one step.
                if (last !== undefined && Math.abs(tip - last) > 1.5 + 0.1 * hw) {
                    wrong.push(`${at}: the point jumps from ${last.toFixed(1)} px to ${tip.toFixed(1)}`);
                }
                last = tip;
            }
        }
        assert.deepEqual(wrong, [], "corner points that jump or reach the wrong distance");
    });

    test("carry the dash pattern round the bend, as dashing the centre line and then stroking does", async () => {
        const drawn = await draw(12);
        const wrong = report(drawn, (d) => d.hole + d.spill);
        assert.deepEqual(wrong, [], "pixels the dashed canvas stroke and the line disagree on, per bend");
    });
});
