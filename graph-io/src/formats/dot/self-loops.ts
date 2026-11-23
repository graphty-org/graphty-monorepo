/**
 * The self-loops Graphviz lays itself: `makeSelfEdge` and its four routines (`selfRight`, `selfLeft`, `selfTop`,
 * `selfBottom`, lib/common/splines.c), with the compass ports of `compassPort` (lib/common/shapes.c). Coordinates are
 * in points, relative to the node's center, y up.
 * @module
 */
import type { BendPoint } from "../../styles/canon/bends.js";

/** Graphviz's side bits (const.h). */
const BOTTOM = 1;
const RIGHT = 2;
const TOP = 4;
const LEFT = 8;

/** One end of a loop: where it leaves the node, which sides that is on, and whether a port placed it. */
export interface LoopEnd {
    readonly p: BendPoint;
    readonly side: number;
    readonly defined: boolean;
}

/** An end with no port: the node's center, on no side. */
export const CENTER_END: LoopEnd = { p: [0, 0], side: 0, defined: false };

/** The shapes Graphviz takes as their bounding box for compass ports (`IS_BOX`): a diagonal port is a corner. */
const BOX_SHAPES: ReadonlySet<string> = new Set(["box", "rect", "rectangle"]);

/** The shapes whose outline Graphviz's compass ray meets on an ellipse. */
const ROUND_SHAPES: ReadonlySet<string> = new Set(["", "ellipse", "oval", "circle", "doublecircle", "point"]);

/**
 * Where a compass port (`n`, `ne`, ... `c`, `_`) sits on a node: `compassPort`, which shoots a ray from the center
 * toward the compass direction and stops at the outline.
 * ponytail: polygons other than boxes and ellipses meet the diagonal ray at (min, min) of their half sizes, where
 * Graphviz clips the ray at the drawn outline; rankdir is ignored
 * @param compass - the port text, a bare compass point
 * @param w - the node's width
 * @param h - its height
 * @param shape - its shape, lower case
 * @returns the end, or null for a port that is not a bare compass point (a record field, an HTML port)
 */
export function compassEnd(compass: string, w: number, h: number, shape: string): LoopEnd | null {
    const [a, b] = [w / 2, h / 2];
    const d = ROUND_SHAPES.has(shape) ? (a * b) / Math.hypot(a, b) : Math.min(a, b);
    const [dx, dy] = BOX_SHAPES.has(shape) ? [a, b] : [d, d];
    const at = (x: number, y: number, side: number): LoopEnd => ({
        p: [x * dx, y * dy],
        side,
        defined: true,
    });
    switch (compass) {
        case "n":
            return { p: [0, b], side: TOP, defined: true };
        case "s":
            return { p: [0, -b], side: BOTTOM, defined: true };
        case "e":
            return { p: [a, 0], side: RIGHT, defined: true };
        case "w":
            return { p: [-a, 0], side: LEFT, defined: true };
        case "ne":
            return at(1, 1, TOP | RIGHT);
        case "nw":
            return at(-1, 1, TOP | LEFT);
        case "se":
            return at(1, -1, BOTTOM | RIGHT);
        case "sw":
            return at(-1, -1, BOTTOM | LEFT);
        case "c":
            return CENTER_END;
        default:
            // "_" lets Graphviz pick a side per edge; the rest name a field
            return null;
    }
}

/**
 * `convert_sides_to_points`: the two-digit code of a tail and head side pair the routines adjust some routes for.
 * @param tail - the tail's sides
 * @param head - the head's sides
 * @returns the code, or 0
 */
function sidePair(tail: number, head: number): number {
    const vertices = [12, 4, 6, 2, 3, 1, 9, 8];
    const t = vertices.indexOf(tail);
    const h = vertices.indexOf(head);
    return t < 0 || h < 0 ? 0 : (t + 1) * 10 + h + 1;
}

/** Which side of its node a loop is laid on. */
export type LoopSide = "right" | "left" | "top" | "bottom";

/**
 * `makeSelfEdge`'s choice of routine.
 * @param t - the tail end
 * @param h - the head end
 * @returns the side the loop goes round
 */
function loopSide(t: LoopEnd, h: LoopEnd): LoopSide {
    if (
        (!t.defined && !h.defined) ||
        ((t.side & LEFT) === 0 && (h.side & LEFT) === 0 && (t.side !== h.side || (t.side & (TOP | BOTTOM)) === 0))
    ) {
        return "right";
    }
    if (((t.side | h.side) & LEFT) !== 0) {
        return ((t.side | h.side) & RIGHT) !== 0 ? "top" : "left";
    }
    return (t.side & TOP) !== 0 ? "top" : "bottom";
}

/** The ends, size and place in its group of the loop one of the routines lays. */
interface LoopCase {
    readonly tp: BendPoint;
    readonly hp: BendPoint;
    readonly pair: number;
    readonly w: number;
    readonly ht: number;
    readonly k: number;
    readonly count: number;
    readonly step: number;
}

/**
 * `selfRight` and `selfLeft`: two curves out of the tail, down (or up) the far side and back into the head.
 * @param side - right or left
 * @param c - the loop
 * @returns the control points
 */
function sidewaysControls(side: "right" | "left", c: LoopCase): BendPoint[] {
    const { tp, hp, pair, w, k, count, step } = c;
    const stepy = Math.max(step / 2 / count, 2);
    let sgn = tp[1] >= hp[1] ? 1 : -1;
    if ((side === "right" ? pair === 32 || pair === 65 : pair === 12 || pair === 67) && tp[1] === hp[1]) {
        sgn = -sgn;
    }
    const m = side === "right" ? 1 : -1;
    const d0 = w / 2;
    const dx = d0 + step * k;
    const tx = Math.min(d0, 3 * (d0 - m * tp[0])) + step * k;
    const hx = Math.min(d0, 3 * (d0 - m * hp[0])) + step * k;
    const dy = sgn * stepy * k;
    return [
        tp,
        [tp[0] + (m * tx) / 3, tp[1] + dy],
        [m * dx, tp[1] + dy],
        [m * dx, (tp[1] + hp[1]) / 2],
        [m * dx, hp[1] - dy],
        [hp[0] + (m * hx) / 3, hp[1] - dy],
        hp,
    ];
}

/**
 * `selfTop`'s shifts of a loop's legs for some side pairs, before the step (`dx` before its loop).
 * @param c - the loop
 * @param stepx - the step across
 * @returns the shift, unsigned
 */
function topShift(c: LoopCase, stepx: number): number {
    const { tp, hp, pair, w } = c;
    const half = w / 2;
    const tl = half + tp[0];
    const hr = half - hp[0];
    const shifts: Record<number, number> = {
        15: hr + stepx,
        38: half + hp[0] + stepx,
        41: half - tp[0] + stepx,
        48: half - tp[0] + stepx,
        14: (tl + hr) / 3,
        37: (tl + hr) / 3,
        47: (tl + hr) / 3,
        51: (tl + hr) / 3,
        57: (tl + hr) / 3,
        58: (tl + hr) / 3,
        73: tl + stepx,
        83: tl,
        84: (tl + hr) / 2 + stepx,
        74: (tl + hr) / 2 + 2 * stepx,
        75: (tl + hr) / 2 + 2 * stepx,
        85: (tl + hr) / 2 + 2 * stepx,
    };
    return shifts[pair] ?? 0;
}

/**
 * `selfTop` and `selfBottom`: up (or down) out of the tail, across above (or below) the node and back into the head.
 * @param side - top or bottom
 * @param c - the loop
 * @returns the control points
 */
function verticalControls(side: "top" | "bottom", c: LoopCase): BendPoint[] {
    const { tp, hp, pair, ht, k, count, step } = c;
    const stepx = Math.max(step / 2 / count, 2);
    let sgn = tp[0] >= hp[0] ? 1 : -1;
    if (side === "bottom" && pair === 67) {
        sgn = -sgn;
    }
    const m = side === "top" ? 1 : -1;
    const d0 = ht / 2;
    const dy = d0 + step * k;
    const ty = Math.min(d0, 3 * (d0 - m * tp[1])) + step * k;
    const hy = Math.min(d0, 3 * (d0 - m * hp[1])) + step * k;
    const dx = sgn * ((side === "top" ? topShift(c, stepx) : 0) + stepx * k);
    return [
        tp,
        [tp[0] + dx, tp[1] + (m * ty) / 3],
        [tp[0] + dx, m * dy],
        [(tp[0] + hp[0]) / 2, m * dy],
        [hp[0] - dx, m * dy],
        [hp[0] - dx, hp[1] + (m * hy) / 3],
        hp,
    ];
}

/**
 * The control points (one 7-point cubic spline, tail to head) of the i-th of `count` loops with the same ends on a
 * node, as neato lays them (`makeSelfArcs` passes its 18-point step as both sizes).
 * ponytail: an edge label widens the next loop's step in Graphviz; here the step stays 18 points
 * @param t - the tail end
 * @param h - the head end
 * @param w - the node's width
 * @param ht - its height
 * @param i - which loop, from 0
 * @param count - how many loops share these ends
 * @param step - the step between loops (neato: 18)
 * @returns the control points and the side they go round
 */
export function selfLoopControls(
    t: LoopEnd,
    h: LoopEnd,
    w: number,
    ht: number,
    i: number,
    count: number,
    step = 18,
): { controls: BendPoint[]; side: LoopSide } {
    const side = loopSide(t, h);
    const c: LoopCase = { tp: t.p, hp: h.p, pair: sidePair(t.side, h.side), w, ht, k: i + 1, count, step };
    const controls = side === "right" || side === "left" ? sidewaysControls(side, c) : verticalControls(side, c);
    return { controls, side };
}
