/**
 * The primitive model both sides of the oracle comparison are read into: what a program's own SVG
 * export draws (`svg-primitives.ts`) and what graphty-element drew (`drawn-primitives.ts`), as
 * resolved geometry and paint in one pixel frame per side, y down. Pure data, no DOM, so the
 * comparer (`compare-oracle.ts`) runs and is unit-tested in Node.
 */

/** A point in a side's own pixel frame, y down. */
export type Pt = [number, number];

/** An axis-aligned box in a side's pixel frame. */
export interface PBox {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

/** One color stop of a gradient. */
export interface PStop {
    offset: number;
    color: string;
    opacity: number;
}

/** A fill: a flat color, or a gradient (its first stop is also its `color`). */
export interface PFill {
    /** `#rrggbb`. */
    color: string;
    /** Fill opacity times every group opacity above it. */
    opacity: number;
    gradient: { kind: "linear" | "radial"; stops: PStop[] } | null;
}

/** Line style classes, from a dash array relative to the line width. */
export type DashClass = "solid" | "dashed" | "dotted" | "other";

/** A stroke, its width and dashes in the side's pixels. */
export interface PStroke {
    color: string;
    opacity: number;
    width: number;
    /** The dash array as drawn, or null for a solid line. */
    dash: number[] | null;
    dashClass: DashClass;
    /** A width in screen pixels at every zoom: judged as drawn, not through the frame's length scale. */
    screen?: boolean;
    /**
     * A line drawn in a pattern a dash class does not name (a zigzag, a sine wave, a double line of bars, read off a
     * filled outline: `outlinePaintedAsFill`): its dash class is not judged, nor its width where `width` is NaN.
     */
    patterned?: boolean;
    /** Read off a filled outline (`outlinePaintedAsFill`) rather than a stroke. */
    painted?: boolean;
}

/** Text as drawn. */
export interface PText {
    content: string;
    /** The text's anchor point in the side's frame (its box center when the side has no anchor). */
    x: number;
    y: number;
    box: PBox;
    /** Font size in the side's pixels. */
    sizePx: number;
    family: string;
    /** CSS numeric weight: 400 normal, 700 bold. */
    weight: number;
    style: "normal" | "italic" | "oblique";
    anchor: "start" | "middle" | "end";
    /** Degrees, clockwise on screen, of the text's baseline. */
    rotation: number;
    color: string;
    opacity: number;
}

/** The raw drawing primitives an SVG holds, before they are associated with graph elements. */
export interface Prim {
    /** Document order, for deterministic tie breaks and for findings. */
    index: number;
    tag: string;
    kind: "shape" | "path" | "text" | "image";
    box: PBox;
    /** The outline sampled by arc length (shapes and paths), in the side's frame. */
    points: Pt[];
    closed: boolean;
    /** Polygon vertex count, when the shape is a straight-sided polygon; 0 when curved. */
    corners: number;
    fill: PFill | null;
    stroke: PStroke | null;
    text: PText | null;
    /** marker-start / marker-end, when a marker draws an arrowhead. */
    markers: { start: boolean; end: boolean };
    /** What the program's own markup says this belongs to, when it says. */
    hint: {
        role: "node" | "edge" | "group" | "graph";
        /** The element's id as the markup writes it (a Graphviz title, a Gephi id class). */
        id: string;
        /** What groups primitives into one element: two parallel edges share an id, not a key. */
        key: string;
        /** An edge's ends, when the markup names them apart from its id. */
        ends?: [string, string];
    } | null;
}

/** 2D node shape classes a reader can tell apart from the drawing. */
export type PShape = "ellipse" | "rect" | "roundrect" | "triangle" | "diamond" | "hexagon" | "octagon" | "other";

/** A node as drawn. */
export interface PNode {
    id: string;
    cx: number;
    cy: number;
    w: number;
    h: number;
    shape: PShape | null;
    /** The visible fill, or null for none. */
    fill: PFill | null;
    /** The outline, or null for none. */
    stroke: PStroke | null;
    label: PText | null;
    /**
     * graphty's side only: whether its border was drawn in from the node's size (a border inside the size or centered
     * on it), so its fill lies inside the outline the program strokes, not on it.
     */
    inset?: boolean;
}

/** An arrowhead as drawn. */
export interface PArrow {
    /** Which end of its edge it sits on. */
    end: "source" | "target";
    /** Its extent along the edge and across it, in the side's pixels. */
    length: number;
    width: number;
    filled: boolean;
}

/** An edge as drawn. */
export interface PEdge {
    id: string;
    source: string;
    target: string;
    /** The path, source end first. */
    points: Pt[];
    stroke: PStroke | null;
    arrows: PArrow[];
    label: PText | null;
}

/** A group box as drawn. */
export interface PGroup {
    id: string;
    box: PBox;
    fill: PFill | null;
    stroke: PStroke | null;
    label: PText | null;
    /** Node ids drawn inside it. */
    members: string[];
}

/** An unassociated primitive, a finding of its own (an annotation, a stray shape). */
export interface PStray {
    index: number;
    tag: string;
    kind: Prim["kind"];
    box: PBox;
    fill: string | null;
    stroke: string | null;
    text: string | null;
}

/** One side's drawing, associated with graph elements. */
export interface PScene {
    side: "oracle" | "graphty";
    width: number;
    height: number;
    background: string | null;
    nodes: PNode[];
    edges: PEdge[];
    groups: PGroup[];
    /** Free text not owned by a node, edge or group (annotations, titles). */
    texts: PText[];
    /** Primitives associated with nothing. */
    strays: PStray[];
    /**
     * False when the labels carry only their words, not where or how they were drawn (a raster
     * oracle whose program reports which labels it drew but not their geometry): only a label's
     * presence and text are then judged.
     */
    labelGeometry?: boolean;
}

/**
 * A total order on ids by their UTF-16 code units, the same on every machine and locale.
 * @param a - one id
 * @param b - another
 * @returns negative, zero or positive
 */
export const compareIds = (a: string, b: string): number => Number(a > b) - Number(a < b);

/**
 * The dash class of a dash array.
 * @param dash - the dash array, or null
 * @param width - the line width
 * @returns the class
 */
export function dashClassOf(dash: readonly number[] | null, width: number): DashClass {
    if (dash === null || dash.length === 0 || dash.every((d) => d <= 0)) {
        return "solid";
    }
    const on = dash[0];
    return on <= Math.max(1, width) * 1.5 ? "dotted" : "dashed";
}

/**
 * The box of a set of points.
 * @param pts - the points
 * @returns the box
 */
export function boxOfPoints(pts: readonly Pt[]): PBox {
    const box: PBox = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const [x, y] of pts) {
        box.x0 = Math.min(box.x0, x);
        box.y0 = Math.min(box.y0, y);
        box.x1 = Math.max(box.x1, x);
        box.y1 = Math.max(box.y1, y);
    }
    return box;
}

/** The tag of a primitive read as an outline a program drew as a filled path (`outlinePaintedAsFill`). */
export const PAINTED_OUTLINE = "path:painted-outline";

/**
 * An outline a program drew as a filled path: the box it is drawn in, and how far its line can be
 * read. Dots are a dotted line as wide as a dot. A ring (a zigzag: two subpaths, one inside the
 * other) is a line as wide as the ring's area over half its two edges' length, in a pattern no dash
 * class names. Anything else (a sine wave, a double line of bars) is an outline of a pattern whose
 * width and dash class are not read: `width` is null.
 */
export interface PaintedOutline {
    width: number | null;
    dashClass: DashClass;
    /** Whether the line is drawn in a pattern a dash class does not name (zigzag, sine wave, bars). */
    patterned: boolean;
    box: PBox;
}

const signedArea = (pts: readonly Pt[]): number => {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        s += x0 * y1 - x1 * y0;
    }
    return s / 2;
};

/** The length of a closed outline, its closing side included. */
const lengthOf = (pts: readonly Pt[]): number => {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[(i + 1) % pts.length];
        s += Math.hypot(x1 - pts[i][0], y1 - pts[i][1]);
    }
    return s;
};

const areaOf = (b: PBox): number => (b.x1 - b.x0) * (b.y1 - b.y0);
const holds = (outer: PBox, inner: PBox): boolean =>
    inner.x0 > outer.x0 && inner.y0 > outer.y0 && inner.x1 < outer.x1 && inner.y1 < outer.y1;

/** The sectors a painted outline is read in, around its box's center. */
const SECTORS = 36;

/**
 * Whether many subpaths are drawn round a hole: in nearly every direction from their box's center,
 * and nearer the rim than the center (an arrowhead or a glyph is drawn to its middle).
 * @param subpaths - the subpaths, sampled
 * @param box - their box
 * @returns whether they ring a hole
 */
function ringsAHole(subpaths: readonly (readonly Pt[])[], box: PBox): boolean {
    const mx = (box.x0 + box.x1) / 2;
    const my = (box.y0 + box.y1) / 2;
    const near = new Array<number>(SECTORS).fill(Infinity);
    const far = new Array<number>(SECTORS).fill(-Infinity);
    for (const [x, y] of subpaths.flat()) {
        const k = Math.min(SECTORS - 1, Math.floor(((Math.atan2(y - my, x - mx) + Math.PI) / (2 * Math.PI)) * SECTORS));
        const r = Math.hypot(x - mx, y - my);
        near[k] = Math.min(near[k], r);
        far[k] = Math.max(far[k], r);
    }
    const drawn = near.flatMap((n, k) => (Number.isFinite(n) ? [n / Math.max(far[k], 1e-9)] : []));
    const hollow = [...drawn].sort((a, b) => a - b)[Math.floor(drawn.length / 2)];
    return drawn.length >= 0.75 * SECTORS && hollow >= 0.5;
}

/**
 * Whether pieces drawn one after another come back to where they started, as an outline's do and a
 * line's (a dotted edge bending past a node) do not: the last piece is about as near the first as
 * each piece is to the one before it.
 * @param boxes - the pieces' boxes, in drawing order
 * @returns whether they close
 */
function closesOnItself(boxes: readonly PBox[]): boolean {
    const centers = boxes.map((b): Pt => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]);
    const steps = centers.slice(1).map((c, i) => Math.hypot(c[0] - centers[i][0], c[1] - centers[i][1]));
    const step = [...steps].sort((a, b) => a - b)[Math.floor(steps.length / 2)];
    const first = centers[0];
    const last = centers[centers.length - 1];
    return Math.hypot(first[0] - last[0], first[1] - last[1]) <= 3 * Math.max(step, 1e-9);
}

/**
 * Whether a filled path is an outline stroked into a fill, and what of its line can be read.
 * Cytoscape desktop exports a node border it does not draw solid (dots, zigzag, sine wave, double)
 * as the stroke's own outline, filled: a ring of two subpaths, a loop of dots, or a band of many
 * pieces. Read as a fill, it is larger than the node's body and takes its place.
 * @param subpaths - the path's subpaths, each sampled in the side's frame
 * @returns the outline, or null when the path is no such outline
 */
export function outlinePaintedAsFill(subpaths: readonly (readonly Pt[])[]): PaintedOutline | null {
    if (subpaths.length < 2 || subpaths.some((q) => q.length < 3)) {
        return null;
    }
    const box = boxOfPoints(subpaths.flat());
    const boxes = subpaths.map((q) => boxOfPoints(q));
    const outer = boxes.reduce((a, b) => (areaOf(b) > areaOf(a) ? b : a));
    // a ring: every other subpath inside the outermost
    if (subpaths.length === 2 && boxes.every((b) => b === outer || holds(outer, b))) {
        const band = Math.abs(subpaths.reduce((sum, q) => sum + signedArea(q), 0));
        const width = (2 * band) / subpaths.reduce((sum, q) => sum + lengthOf(q), 0);
        return width > 0 ? { width, dashClass: "other", patterned: true, box } : null;
    }
    if (!ringsAHole(subpaths, box) || !closesOnItself(boxes)) {
        return null;
    }
    // dots are round
    const round = (q: readonly Pt[]): boolean => {
        const b = boxOfPoints(q);
        const w = b.x1 - b.x0;
        const h = b.y1 - b.y0;
        // a disc fills pi/4 of its box; a square bar (one piece of a double line) all of it
        const fills = w > 0 && h > 0 ? Math.abs(signedArea(q)) / (w * h) : 0;
        return w / h > 0.75 && w / h < 1.33 && fills > 0.65 && fills < 0.9;
    };
    if (subpaths.length >= 8 && subpaths.filter(round).length >= 0.8 * subpaths.length) {
        const areas = subpaths.map((q) => Math.abs(signedArea(q))).sort((a, b) => a - b);
        const width = 2 * Math.sqrt(areas[Math.floor(areas.length / 2)] / Math.PI);
        return { width, dashClass: "dotted", patterned: false, box };
    }
    return { width: null, dashClass: "other", patterned: true, box };
}
