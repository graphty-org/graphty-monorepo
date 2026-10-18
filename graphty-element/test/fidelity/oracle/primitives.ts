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

/**
 * A gradient as drawn: its kind, its stops and, for a linear one, the screen direction it runs in (degrees, clockwise
 * from the +x axis, y down: from its first stop towards its last), or null where the drawing does not say.
 */
export interface PGradient {
    kind: "linear" | "radial";
    stops: PStop[];
    angle: number | null;
}

/** A fill: a flat color, or a gradient (its first stop is also its `color`). */
export interface PFill {
    /** `#rrggbb`. */
    color: string;
    /** Fill opacity times every group opacity above it. */
    opacity: number;
    gradient: PGradient | null;
}

/**
 * Line style classes: from a dash array and its gaps relative to the line width (solid, dotted, dashed, dash-dot), or
 * from the pattern of an outline a program drew as a fill (`outlinePaintedAsFill`, `bandPaintedAsFill`): a double line,
 * a zigzag, a sine wave, slashes across the line, a row of arrows. "other" is a pattern no class names: it matches
 * nothing, not even another "other".
 */
export type DashClass =
    "solid" | "dashed" | "dotted" | "dash-dot" | "double" | "zigzag" | "sinewave" | "slashes" | "arrows" | "other";

/** The classes a dash array can name; every other class is a pattern drawn as a shape of its own. */
const DASH_ARRAY_CLASSES: ReadonlySet<DashClass> = new Set(["solid", "dashed", "dotted", "dash-dot"]);

/**
 * Whether a line style is a pattern drawn as a shape of its own (a zigzag, slashes), not a dash array.
 * @param c - the class
 * @returns true for a pattern
 */
export const isPattern = (c: DashClass): boolean => !DASH_ARRAY_CLASSES.has(c);

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
     * A line drawn in a pattern a dash array does not name (a zigzag, a sine wave, slashes, read off a filled outline:
     * `outlinePaintedAsFill`): its width is not judged where `width` is NaN.
     */
    patterned?: boolean;
    /** Read off a filled outline (`outlinePaintedAsFill`) rather than a stroke. */
    painted?: boolean;
    /** A stroke painted with a gradient (its first stop is also its `color`), or null for a flat color. */
    gradient?: PGradient | null;
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
    /** Each line's own box, top line first, where the side says (an SVG's separate texts or tspans). */
    lines?: PBox[];
    /**
     * How the lines are aligned, where the side declares it (graphty's `textAlign`); the oracle's is read off `lines`.
     */
    align?: "start" | "middle" | "end";
    /** The outline (halo) stroked round the letters: its color, opacity and width outside the letters, in pixels. */
    outline?: { color: string; opacity: number; width: number } | null;
    /** The box drawn behind the words: its fill, its border and its shape. */
    background?: PLabelBox | null;
}

/** A box drawn behind a label's words (Cytoscape.js `text-background-*`, `text-border-*`; graphty's label plane). */
export interface PLabelBox {
    box: PBox;
    fill: PFill | null;
    stroke: PStroke | null;
    /** Its outline's class: a rectangle, a rounded one, an ellipse. */
    shape: "rect" | "roundrect" | "ellipse" | "other" | null;
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
    /**
     * A filled, unstroked path's subpaths, each sampled evenly by arc length: what a pattern drawn as a fill (a zigzag
     * edge, a dotted border) is read from. Absent for everything else.
     */
    subpaths?: Pt[][];
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

/**
 * Arrowhead shape classes a reader can tell apart, read from the outline in the frame of the line it caps: a triangle
 * pointing on along the line, one pointing back ("inverted"), a concave arrow ("vee": an arrow with a notch, a
 * chevron), a crow's foot, a diamond, a circle, a box, a bar across the line ("tee"), half an arrow on one side of the
 * line. "other" matches nothing.
 */
export type ArrowShape =
    "triangle" | "inverted" | "vee" | "crow" | "diamond" | "circle" | "box" | "tee" | "half" | "other";

/** An arrowhead as drawn. */
export interface PArrow {
    /** Which end of its edge it sits on. */
    end: "source" | "target";
    /** Its extent along the edge and across it, in the side's pixels. */
    length: number;
    width: number;
    filled: boolean;
    /** Its shape class. */
    shape: ArrowShape;
    /** `#rrggbb`: its fill where it is filled, else its outline's color; null where the drawing does not say. */
    color: string | null;
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
    /**
     * True when only the nodes were read (a raster oracle whose program records where it drew its nodes and nothing
     * else): what graphty draws besides nodes cannot be told extra there.
     */
    nodesOnly?: boolean;
}

/**
 * A total order on ids by their UTF-16 code units, the same on every machine and locale.
 * @param a - one id
 * @param b - another
 * @returns negative, zero or positive
 */
export const compareIds = (a: string, b: string): number => Number(a > b) - Number(a < b);

/**
 * The dash class of a dash array, from its dashes and its gaps relative to the line's width. A round or square line
 * cap draws each dash half a width longer at either end, so into its gaps; gaps that add to a tenth of the pattern or
 * less read as a solid line. Dashes no longer than one and a half widths (or pixels, for a hairline) are dots; long
 * dashes and short ones, one at least twice the other, are a dash-dot.
 * @param dash - the dash array, or null
 * @param width - the line width
 * @param cap - the line cap (`butt`, `round` or `square`)
 * @returns the class
 */
export function dashClassOf(dash: readonly number[] | null, width: number, cap = "butt"): DashClass {
    if (dash === null || dash.length === 0 || dash.every((d) => d <= 0)) {
        return "solid";
    }
    // an odd-length dash array repeats to an even one
    const pairs = dash.length % 2 === 1 ? [...dash, ...dash] : [...dash];
    const grow = cap === "butt" ? 0 : width;
    const on = pairs.filter((_, i) => i % 2 === 0).map((d) => Math.max(0, d) + grow);
    const off = pairs.filter((_, i) => i % 2 === 1).map((d) => Math.max(0, d - grow));
    const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
    if (sum(off) <= 0.1 * (sum(on) + sum(off))) {
        return "solid";
    }
    const dot = Math.max(1, width) * 1.5;
    if (on.every((d) => d <= dot)) {
        return "dotted";
    }
    // long dashes and short ones (a dot, drawn two widths long by a round cap) alternate
    return Math.max(...on) >= 2 * Math.min(...on) ? "dash-dot" : "dashed";
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
 * An outline a program drew as a filled path: the box it is drawn in, the width of its line where one can be read, and
 * its pattern. Dots are a dotted line as wide as a dot. A ring of two subpaths, one inside the other, is a line as wide
 * as the ring's area over half its two edges' length, solid, zigzag or a sine wave by its outer edge. Pieces round the
 * ring are read one by one against the ring's tangent where they sit: dots, dashes, slashes across the line, arrows,
 * or two rows of them (a double line). `width` is null where a pattern has no width to read (slashes, arrows).
 */
export interface PaintedOutline {
    width: number | null;
    dashClass: DashClass;
    /** Whether the line is drawn in a pattern a dash array does not name (zigzag, sine wave, slashes, a double line). */
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
const median = (xs: readonly number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;

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
 * How an outline turns, sample by sample: the absolute turn at each sample of a closed outline sampled evenly by arc
 * length.
 * @param pts - the closed outline
 * @returns the turns, in radians
 */
function turnsOf(pts: readonly Pt[]): number[] {
    const turns: number[] = [];
    for (let i = 0; i < pts.length; i++) {
        const a = pts[(i + pts.length - 1) % pts.length];
        const b = pts[i];
        const c = pts[(i + 1) % pts.length];
        const [ux, uy, vx, vy] = [b[0] - a[0], b[1] - a[1], c[0] - b[0], c[1] - b[1]];
        if (Math.hypot(ux, uy) > 1e-9 && Math.hypot(vx, vy) > 1e-9) {
            turns.push(Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)));
        }
    }
    return turns;
}

/**
 * The share of an outline's samples at which it runs straight on: a zigzag's sides are straight between sharp
 * corners, a sine wave turns a little at every sample. A sample is straight where it turns under a quarter of the
 * outline's mean turn. The outline must be sampled evenly by arc length.
 * @param pts - the closed outline
 * @returns the share, 0 to 1
 */
export function straightShare(pts: readonly Pt[]): number {
    const turns = turnsOf(pts);
    const mean = turns.reduce((x, y) => x + y, 0) / Math.max(turns.length, 1);
    return turns.length === 0 ? 0 : turns.filter((t) => t < 0.25 * mean).length / turns.length;
}

/** The frame a pattern is read in: at a point, the line's direction there and how far across the line it is. */
type PatternFrame = (c: Pt) => { tangent: Pt; across: number };

/** One piece of a pattern, measured in its own principal frame and against the line's tangent where it sits. */
interface Piece {
    /** Its extents along its own longest axis and across it. */
    long: number;
    short: number;
    /** Its area over its principal box's: a disc pi/4, a bar 1, a triangle 1/2. */
    fill: number;
    /** Degrees between its longest axis and the line's tangent, 0 to 90. */
    tilt: number;
    /** How far across the line its center is. */
    offset: number;
    area: number;
}

function pieceOf(q: readonly Pt[], frame: PatternFrame): Piece {
    const n = q.length;
    const mx = q.reduce((s, p) => s + p[0], 0) / n;
    const my = q.reduce((s, p) => s + p[1], 0) / n;
    let [sxx, syy, sxy] = [0, 0, 0];
    for (const [x, y] of q) {
        sxx += (x - mx) ** 2;
        syy += (y - my) ** 2;
        sxy += (x - mx) * (y - my);
    }
    const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const [ax, ay] = [Math.cos(theta), Math.sin(theta)];
    const along = q.map(([x, y]) => (x - mx) * ax + (y - my) * ay);
    const across = q.map(([x, y]) => -(x - mx) * ay + (y - my) * ax);
    const long = Math.max(...along) - Math.min(...along);
    const short = Math.max(...across) - Math.min(...across);
    const area = Math.abs(signedArea(q));
    const { tangent, across: offset } = frame([mx, my]);
    const cos = Math.abs(ax * tangent[0] + ay * tangent[1]);
    return {
        long,
        short,
        fill: long > 0 && short > 0 ? area / (long * short) : 0,
        tilt: (Math.acos(Math.min(1, cos)) * 180) / Math.PI,
        offset,
        area,
    };
}

/**
 * The pattern of a line drawn as many pieces (dots, dashes, slashes, arrows, a double row of any of them).
 * @param subpaths - the pieces
 * @param frame - the line's frame
 * @returns the class and the width of the line where one can be read
 */
/**
 * How far a piece is from its own mirror image across the line it is drawn on: next to nothing for an arrow or a
 * chevron drawn square on the line, as far as the piece reaches for a lobe of a wave, which lies to one side.
 * @param q - the piece
 * @param mirror - a point's mirror image across the line
 * @returns the median distance from a mirrored point to the piece's nearest point
 */
function mirrorGap(q: readonly Pt[], mirror: (p: Pt) => Pt): number {
    const step = Math.max(1, Math.floor(q.length / 64));
    const gaps: number[] = [];
    for (let i = 0; i < q.length; i += step) {
        const [x, y] = mirror(q[i]);
        gaps.push(Math.min(...q.map((p) => Math.hypot(p[0] - x, p[1] - y))));
    }
    return median(gaps);
}

/** A line a pattern's pieces are laid along: its length, how far along it a point is, and a point's mirror image. */
interface PatternRun {
    length: number;
    /** Round a ring: `along` runs round and starts again. */
    circular?: boolean;
    along: (p: Pt) => number;
    mirror: (p: Pt) => Pt;
}

function piecesPattern(
    subpaths: readonly (readonly Pt[])[],
    frame: PatternFrame,
    run: PatternRun,
): { dashClass: DashClass; width: number | null } {
    const pieces = subpaths.map((q) => pieceOf(q, frame));
    // Pieces that run on into one another along the whole line, each a thin stroke reaching far across it and lying
    // to one side of it, are one wavy line drawn a lobe at a time (Cytoscape desktop's sine-wave edge and border); a
    // row of arrows touching one another is drawn square on the line.
    {
        // round a ring, a piece across the seam of the angle reaches all the way round less its widest gap
        const covered = subpaths.reduce((sum, q) => {
            const a = q.map(run.along).sort((x, y) => x - y);
            const span = (a.at(-1) ?? 0) - (a[0] ?? 0);
            if (run.circular !== true) {
                return sum + span;
            }
            const widest = Math.max(run.length - span, ...a.slice(1).map((x, i) => x - a[i]));
            return sum + run.length - widest;
        }, 0);
        const thin = median(subpaths.map((q) => (2 * Math.abs(signedArea(q))) / Math.max(lengthOf(q), 1e-9)));
        const reach = median(pieces.map((p) => p.short));
        const lopsided = median(subpaths.map((q) => mirrorGap(q, run.mirror))) > 2 * thin;
        if (covered >= 0.9 * run.length && reach > 4 * thin && lopsided) {
            const straight = subpaths.reduce((sum, q) => sum + straightShare(q), 0) / subpaths.length;
            return { dashClass: straight > 0.5 ? "zigzag" : "sinewave", width: thin };
        }
    }
    // two rows of pieces either side of the line: a double line
    const offsets = pieces.map((p) => p.offset).sort((a, b) => a - b);
    // the widest gap between neighboring offsets
    let split = 0;
    let gap = 0;
    for (let i = 1; i < offsets.length; i++) {
        if (offsets[i] - offsets[i - 1] > gap) {
            gap = offsets[i] - offsets[i - 1];
            split = i;
        }
    }
    const thick = median(pieces.map((p) => Math.min(p.short, p.long)));
    if (split > 0 && gap > 1.5 * thick && Math.min(split, offsets.length - split) >= 0.25 * offsets.length) {
        return { dashClass: "double", width: null };
    }
    const kind = (p: Piece): "dot" | "dash" | "slash" | "arrow" => {
        if (p.fill < 0.7) {
            return "arrow";
        }
        if (p.long <= 1.6 * p.short) {
            return "dot";
        }
        return p.tilt < 25 ? "dash" : "slash";
    };
    const kinds = pieces.map(kind);
    const count = (k: string): number => kinds.filter((x) => x === k).length;
    const n = pieces.length;
    if (count("dash") >= 0.25 * n && count("dot") >= 0.25 * n) {
        return { dashClass: "dash-dot", width: median(pieces.map((p) => p.short)) };
    }
    const top = (["dot", "dash", "slash", "arrow"] as const).reduce((a, b) => (count(b) > count(a) ? b : a));
    if (top === "dot") {
        return { dashClass: "dotted", width: 2 * Math.sqrt(median(pieces.map((p) => p.area)) / Math.PI) };
    }
    if (top === "dash") {
        return { dashClass: "dashed", width: median(pieces.map((p) => p.short)) };
    }
    return { dashClass: top === "slash" ? "slashes" : "arrows", width: null };
}

/**
 * The pattern of a line drawn as one closed outline (or a ring's two): a plain line's outline turns once round in all
 * (a rectangle's, a circle's, a square ring's), a zigzag's or a sine wave's many times; then a zigzag runs straight
 * between its corners and a sine wave turns all along.
 * @param outer - the outer outline, sampled evenly by arc length
 * @returns the class
 */
function continuousPattern(outer: readonly Pt[]): DashClass {
    const turning = turnsOf(outer).reduce((x, y) => x + y, 0);
    if (turning <= 3 * Math.PI) {
        return "solid";
    }
    return straightShare(outer) > 0.5 ? "zigzag" : "sinewave";
}

const patternResult = (dashClass: DashClass, width: number | null, box: PBox): PaintedOutline => ({
    width,
    dashClass,
    patterned: isPattern(dashClass),
    box,
});

/**
 * Whether a filled path is an outline stroked into a fill, and what of its line can be read.
 * Cytoscape desktop exports a node border it does not draw solid (dots, zigzag, sine wave, double, slashes) as the
 * stroke's own outline, filled: a ring of two subpaths, or many pieces round the node. Read as a fill, it is larger
 * than the node's body and takes its place.
 * @param subpaths - the path's subpaths, each sampled evenly by arc length in the side's frame
 * @returns the outline, or null when the path is no such outline
 */
export function outlinePaintedAsFill(subpaths: readonly (readonly Pt[])[]): PaintedOutline | null {
    if (subpaths.length < 2 || subpaths.some((q) => q.length < 3)) {
        return null;
    }
    const box = boxOfPoints(subpaths.flat());
    const boxes = subpaths.map((q) => boxOfPoints(q));
    const outerBox = boxes.reduce((a, b) => (areaOf(b) > areaOf(a) ? b : a));
    const mx = (box.x0 + box.x1) / 2;
    const my = (box.y0 + box.y1) / 2;
    // round the ring: the tangent is square to the radius, and across is the radius
    const frame: PatternFrame = ([x, y]) => {
        const r = Math.hypot(x - mx, y - my);
        return { tangent: r > 1e-9 ? [-(y - my) / r, (x - mx) / r] : [1, 0], across: r };
    };
    // a ring: every other subpath inside the outermost
    if (subpaths.length === 2 && boxes.every((b) => b === outerBox || holds(outerBox, b))) {
        const band = Math.abs(subpaths.reduce((sum, q) => sum + signedArea(q), 0));
        const width = (2 * band) / subpaths.reduce((sum, q) => sum + lengthOf(q), 0);
        if (!(width > 0)) {
            return null;
        }
        return patternResult(continuousPattern(subpaths[boxes.indexOf(outerBox)]), width, box);
    }
    if (!ringsAHole(subpaths, box) || !closesOnItself(boxes)) {
        return null;
    }
    // round the ring: along is the angle at the ring's mean radius, its mirror the circle there
    const r0 = median(subpaths.flat().map((p) => frame(p).across));
    const { dashClass, width } = piecesPattern(subpaths, frame, {
        length: 2 * Math.PI * r0,
        circular: true,
        along: ([x, y]) => r0 * (Math.atan2(y - my, x - mx) + Math.PI),
        mirror: ([x, y]) => {
            const r = Math.hypot(x - mx, y - my);
            const k = r > 1e-9 ? (2 * r0 - r) / r : 0;
            return [mx + (x - mx) * k, my + (y - my) * k];
        },
    });
    return patternResult(dashClass, width, box);
}

/** An edge a program drew as a filled band between its two ends: the ends of its axis and its line's pattern. */
export interface PaintedBand extends PaintedOutline {
    /** The two ends of the band's axis, along its longest direction. */
    ends: [Pt, Pt];
}

/**
 * Whether a filled path is an edge's line drawn as a fill (Cytoscape desktop exports a zigzag, sine-wave, dotted,
 * slashed, arrowed or double edge so), and what of its line can be read: a band at least four times as long as it is
 * wide, of one outline or of many pieces along its axis.
 * @param subpaths - the path's subpaths, each sampled evenly by arc length in the side's frame
 * @returns the band, or null when the path is no such line
 */
export function bandPaintedAsFill(subpaths: readonly (readonly Pt[])[]): PaintedBand | null {
    const all = subpaths.flat();
    if (subpaths.length === 0 || subpaths.some((q) => q.length < 3)) {
        return null;
    }
    const n = all.length;
    const mx = all.reduce((s, p) => s + p[0], 0) / n;
    const my = all.reduce((s, p) => s + p[1], 0) / n;
    let [sxx, syy, sxy] = [0, 0, 0];
    for (const [x, y] of all) {
        sxx += (x - mx) ** 2;
        syy += (y - my) ** 2;
        sxy += (x - mx) * (y - my);
    }
    const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const u: Pt = [Math.cos(theta), Math.sin(theta)];
    const along = all.map(([x, y]) => (x - mx) * u[0] + (y - my) * u[1]);
    const across = all.map(([x, y]) => -(x - mx) * u[1] + (y - my) * u[0]);
    const [a0, a1] = [Math.min(...along), Math.max(...along)];
    const spread = Math.max(...across) - Math.min(...across);
    if (a1 - a0 < 4 * Math.max(spread, 1e-9)) {
        return null;
    }
    const box = boxOfPoints(all);
    const mid = (Math.max(...across) + Math.min(...across)) / 2;
    const at = (a: number): Pt => [mx + a * u[0] - mid * u[1], my + a * u[1] + mid * u[0]];
    const ends: [Pt, Pt] = [at(a0), at(a1)];
    const frame: PatternFrame = ([x, y]) => ({ tangent: u, across: -(x - mx) * u[1] + (y - my) * u[0] });
    // one outline, or a few long ones (a double line), runs the band's whole length
    const runs = subpaths.filter((q) => {
        const qa = q.map(([x, y]) => (x - mx) * u[0] + (y - my) * u[1]);
        return Math.max(...qa) - Math.min(...qa) >= 0.6 * (a1 - a0);
    });
    if (runs.length === subpaths.length && subpaths.length <= 2) {
        if (subpaths.length === 2) {
            return { ...patternResult("double", null, box), ends };
        }
        const q = subpaths[0];
        const width = (2 * Math.abs(signedArea(q))) / Math.max(lengthOf(q), 1e-9);
        return { ...patternResult(continuousPattern(q), width, box), ends };
    }
    if (subpaths.length < 3) {
        return null;
    }
    const { dashClass, width } = piecesPattern(subpaths, frame, {
        length: a1 - a0,
        along: ([x, y]) => (x - mx) * u[0] + (y - my) * u[1],
        mirror: ([x, y]) => {
            const c = -(x - mx) * u[1] + (y - my) * u[0] - mid;
            return [x + 2 * c * u[1], y - 2 * c * u[0]];
        },
    });
    return { ...patternResult(dashClass, width, box), ends };
}

/**
 * The shape class of an arrowhead, from its outline in the frame of the line it caps: its width across the line at
 * nine places from its back to its tip, and its area beside its box's.
 * @param outline - the outline, in drawing order
 * @param dir - the unit direction the line runs in towards the arrow's tip
 * @returns the class
 */
export function arrowShapeOf(outline: readonly Pt[], dir: Pt): ArrowShape {
    if (outline.length < 3) {
        return "other";
    }
    const a = outline.map(([x, y]) => x * dir[0] + y * dir[1]);
    const c = outline.map(([x, y]) => -x * dir[1] + y * dir[0]);
    const [a0, a1] = [Math.min(...a), Math.max(...a)];
    const [c0, c1] = [Math.min(...c), Math.max(...c)];
    const [L, W] = [a1 - a0, c1 - c0];
    if (!(L > 1e-9 && W > 1e-9)) {
        return "other";
    }
    // where the outline crosses the line square to the axis at t, back (0) to tip (1)
    const crossings = (t: number): number[] => {
        const at = a0 + t * L;
        const xs: number[] = [];
        for (let i = 0; i < outline.length; i++) {
            const j = (i + 1) % outline.length;
            if ((a[i] - at) * (a[j] - at) <= 0 && a[i] !== a[j]) {
                xs.push(c[i] + ((at - a[i]) / (a[j] - a[i])) * (c[j] - c[i]));
            }
        }
        return xs.sort((x, y) => x - y);
    };
    const ts = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    const w = ts.map((t) => {
        const xs = crossings(t);
        return xs.length < 2 ? 0 : ((xs.at(-1) ?? 0) - xs[0]) / W;
    });
    /** How much of its span the outline fills at t: under 1 where a notch cuts into it (a vee's, a crow's). */
    const cover = (t: number): number => {
        const xs = crossings(t);
        const span = (xs.at(-1) ?? 0) - (xs[0] ?? 0);
        let inside = 0;
        for (let k = 0; k + 1 < xs.length; k += 2) {
            inside += xs[k + 1] - xs[k];
        }
        return span > 1e-9 ? inside / span : 1;
    };
    const [back, middle, tip] = [w[0], w[4], w[8]];
    // half an arrow (a barb, a triangle with one side along the line) lies wholly to one side of its tip, which is on
    // the line
    const tipped = outline.flatMap((_, i) => (a[i] >= a1 - 0.02 * L ? [c[i]] : []));
    const ct = tipped.reduce((x, y) => x + y, 0) / tipped.length;
    if (c0 >= ct - 0.15 * W || c1 <= ct + 0.15 * W) {
        return "half";
    }
    if (Math.min(...w) >= 0.85) {
        return L < 0.5 * W ? "tee" : "box";
    }
    if (middle >= 0.85 && back <= 0.45 && tip <= 0.45) {
        return "diamond";
    }
    if (middle >= 0.85 && back <= 0.8 && tip <= 0.8) {
        return "circle";
    }
    if (back > tip + 0.3) {
        return cover(0.2) < 0.75 ? "vee" : "triangle";
    }
    // a triangle pointing back widens evenly towards the tip; a half circle is most of its width by its middle
    if (tip > back + 0.3 && middle < 0.75) {
        return cover(0.8) < 0.75 ? "crow" : "inverted";
    }
    return "other";
}
