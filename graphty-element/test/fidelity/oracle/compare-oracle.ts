/**
 * Compares graphty's drawing of a sample directly with the program's own SVG drawing of it, both
 * read into the primitive model (`primitives.ts`). Elements are matched by id (the oracle's ids
 * come from the program's markup or from the association guided by graphty's drawing), one
 * similarity transform taking graphty's pixels onto the oracle's is fitted on the matched node
 * centers (Umeyama; a reflection only where the program's drawing is known to be mirrored) and its residual reported, and every property of every
 * matched element is judged against an explicit tolerance. Lengths are judged in oracle pixels
 * (graphty's times the fitted scale); when the residual says the two layouts are unrelated, the
 * scale comes from the node sizes instead so sizes can still be judged.
 *
 * Deterministic: everything is sorted by id and every number in the report is rounded, so the
 * same inputs give a byte-identical report. Pure: no DOM.
 */
import { apply, deltaE, fitSimilarity, frechet, iou, resample } from "../../../../graph-io/test/fidelity/compare";
import {
    boxOfPoints,
    compareIds,
    type DashClass,
    type PArrow,
    type PBox,
    type PEdge,
    type PGradient,
    type PNode,
    type PScene,
    type Pt,
    type PText,
} from "./primitives";

/** Every property the oracle comparison judges, in report order. */
export const ORACLE_PROPERTIES = [
    "node.present",
    "node.extra",
    "node.position",
    "node.width",
    "node.height",
    "node.sizeToSpacing",
    "node.sizeToExtent",
    "node.shape",
    "node.fill",
    "node.fillOpacity",
    "node.gradient",
    "node.stroke",
    "node.strokeWidth",
    "node.strokeDash",
    "label.present",
    "label.text",
    "label.size",
    "label.weight",
    "label.style",
    "label.color",
    "label.rotation",
    "label.offset",
    "edge.present",
    "edge.extra",
    "edge.route",
    "edge.curve",
    "edge.color",
    "edge.width",
    "edge.opacity",
    "edge.dash",
    "edge.gradient",
    "edge.arrow",
    "edge.arrowShape",
    "edge.arrowFill",
    "edge.arrowColor",
    "edge.arrowLength",
    "edge.arrowWidth",
    "edge.arrowToSpacing",
    "edge.label",
    "group.present",
    "group.extra",
    "group.box",
    "group.fill",
    "group.strokeWidth",
    "group.label",
    "stray.present",
    "stray.extra",
    "frame.mirror",
    "frame.rotation",
    "frame.zoom",
    "background",
] as const;

export type OracleProperty = (typeof ORACLE_PROPERTIES)[number];

/**
 * The tolerances. Ratios are graphty's value (in oracle pixels) over the oracle's; colors are CIEDE2000. Distances are
 * judged against the element they belong to (a node's size, a label's font size, an edge's length), never against the
 * drawing's diagonal, so a large canvas or a spread-out drawing does not loosen them, with one graphty render pixel
 * or so as the least any of them allows.
 */
export const ORACLE_TOLERANCES = {
    /** A node's center within this share of its own smaller outer side. */
    positionOfSize: 0.25,
    /** The least a distance tolerance allows, in graphty render pixels (anti-aliasing and rounding). */
    pixel: 1.5,
    /** A fit residual over this share of the diagonal relates unrelated layouts; sizes then use a size-fitted scale. */
    unrelatedLayout: 0.1,
    sizeRatio: [0.85, 1.18],
    /**
     * A size against the drawing's own node spacing or extent, graphty's over the program's: where the two layouts are
     * unrelated the spacing a force layout settles at differs between programs, but not by half or double.
     */
    layoutSizeRatio: [0.5, 2],
    colorDeltaE: 3,
    /**
     * A whole canvas is told apart at a smaller difference than one small mark: white against
     * whitesmoke (#f5f5f5) is 2.0.
     */
    backgroundDeltaE: 1,
    opacity: 0.1,
    strokeWidthRatio: [0.9, 1.1],
    /** An outline under this many oracle pixels and none at all are the same to a reader. */
    hairline: 0.25,
    fontSizeRatio: [0.8, 1.25],
    /** A label whose font is under this many render pixels is not shown (extract-scene.ts drops graphty's alike). */
    legibleFontPx: 1,
    /** CSS weight difference; 400 against 700 fails. */
    fontWeight: 150,
    rotationDeg: 5,
    /** A label's center relative to its node within this share of the label's font size. */
    labelOffsetOfSize: 0.5,
    /**
     * An edge's route, each side's drawn between the outlines of its own nodes and seen in its own chord's frame (its
     * start at 0, its end at 1): the Frechet distance between the two within this share of the chord (of the route's
     * length, for a loop, whose chord is next to nothing).
     */
    edgePathOfLength: 0.05,
    pathSamples: 128,
    /**
     * How far a route bends: its farthest point from its chord, over the chord. The two sides' within this much of
     * each other, or within `curveShare` of the oracle's, whichever is larger.
     */
    curvature: 0.04,
    curveShare: 0.25,
    edgeWidthRatio: [0.9, 1.1],
    /** A linear gradient's direction (an edge's against its own chord) within this many degrees. */
    gradientAngleDeg: 15,
    arrowRatio: [0.67, 1.5],
    groupIoU: 0.8,
    strayIoU: 0.5,
    /** A mirrored fit is the drawing's when it leaves under this share of the unmirrored fit's squared residual. */
    mirrorResidual: 0.5,
} as const;

/**
 * A node's width and height out to the outer edge of its outline, as a reader sees its size: an SVG
 * stroke runs along the outline, half of it outside, where graphty's border ring lies wholly outside
 * its fill. Judging the outlines themselves would fault a program that draws its border inside the
 * node's size (Cytoscape desktop) for exactly the drawing it makes.
 * @param n - the node
 * @param side - whose drawing it is
 * @returns the outer width and height, in the side's pixels
 */
export function outerOf(n: PNode, side: "oracle" | "graphty"): [number, number] {
    // an outline painted as a fill of its own (a dotted, zigzag, sine-wave or double border) is already part of the
    // node's box, out to its outer edge, and the width of a sine wave or a double line is not read at all
    const { stroke: s } = n;
    const stroke =
        s === null || s.painted === true || !Number.isFinite(s.width) ? 0 : s.width * (side === "oracle" ? 1 : 2);
    return [n.w + stroke, n.h + stroke];
}

/**
 * A node's fill as a reader sees it: none where the program's outline is no wider than its stroke, whose inner half
 * then covers all of it but under half a pixel (Cytoscape desktop draws a node no larger than twice its border so, its fill path under it).
 * @param n - the oracle's node
 * @returns the fill, or null when none shows
 */
function shownFill(n: PNode): PNode["fill"] {
    const stroke = n.stroke === null || n.stroke.opacity < 1 ? 0 : n.stroke.width;
    // what is left between the stroke's inner edges, under half a pixel, shows nothing
    return stroke > 0 && Math.min(n.w, n.h) - stroke < 0.5 ? null : n.fill;
}

/**
 * A node's stroke as wide as a reader sees it, measured in from the outline's outer edge: the whole stroke, except
 * where the outline is narrower than the stroke and its two halves meet in the middle (a node no larger than twice
 * its border), where the band is half the outline and half the stroke.
 * @param n - the oracle's node
 * @returns the stroke, or null when it has none
 */
function shownStroke(n: PNode): PNode["stroke"] {
    if (n.stroke === null) {
        return null;
    }
    const band = Math.min(n.stroke.width, (Math.min(n.w, n.h) + n.stroke.width) / 2);
    return band === n.stroke.width ? n.stroke : { ...n.stroke, width: band };
}

/** One judged element. */
export interface OracleJudged {
    id: string;
    pass: boolean;
    /** How far from passing (0 when it passes); the worst list is sorted by it. */
    miss: number;
    oracle: unknown;
    graphty: unknown;
}

export interface OraclePropertyResult {
    n: number;
    pass: number;
    /** Share judged within tolerance; null when nothing could be judged. */
    passRate: number | null;
    tolerance: string;
    worst: OracleJudged[];
}

export interface OracleReport {
    sample: string;
    /**
     * Whether the oracle stands in for the program that wrote the file (draw.io for yEd, sigma.js's raster for a
     * graphology file): its numbers say how close graphty is to that program, and are kept apart from the rest.
     */
    standIn: boolean;
    /**
     * The sample's verdict, element by element: it fails when any element fails any property beyond its tolerance, and
     * `failures` names every such element (not a sample of them), by property.
     */
    verdict: { pass: boolean; failing: number };
    failures: Partial<Record<OracleProperty, string[]>>;
    association: unknown;
    transform: {
        scale: number;
        rotationDeg: number;
        reflect: boolean;
        tx: number;
        ty: number;
        /** Root mean square residual of matched node centers, over the oracle diagonal. */
        rms: number;
        matched: number;
        unrelatedLayout: boolean;
        /** The scale lengths are judged by. */
        lengthScale: number;
        /** Each side's median distance from a node to its nearest neighbor, in its own pixels; null under 3 nodes. */
        spacing: { oracle: number; graphty: number } | null;
        /** The share of its canvas each side's nodes fill along the tighter axis. */
        fill: { oracle: number; graphty: number };
    } | null;
    counts: {
        oracleNodes: number;
        graphtyNodes: number;
        matchedNodes: number;
        oracleEdges: number;
        graphtyEdges: number;
        matchedEdges: number;
        oracleGroups: number;
        graphtyGroups: number;
        oracleStrays: number;
        oracleTexts: number;
        /**
         * Share of graphty's node labels whose words the oracle draws anywhere: low when the two
         * drew different graphs (a session's other network), whatever the layout.
         */
        labelOverlap: number | null;
    };
    properties: Record<OracleProperty, OraclePropertyResult>;
    /** Per element, per property: the judged value pairs, for the report's table. */
    elements: { kind: "node" | "edge" | "group" | "stray"; id: string; failed: OracleProperty[] }[];
    unmatched: { oracleNodes: string[]; graphtyNodes: string[]; oracleEdges: string[]; graphtyEdges: string[] };
    /** Oracle primitives associated with no element, and free oracle text. */
    strays: {
        tag: string;
        box: PBox;
        fill: string | null;
        stroke: string | null;
        text: string | null;
        matched: boolean;
    }[];
}

/**
 * The graphty shape annotation drawn over an oracle box, the best overlap of at least 0.3.
 * @param box - the oracle's box
 * @param shapes - graphty's shape annotations, in the oracle's frame
 * @returns the annotation, or undefined when none overlaps enough
 */
function annotationOver<T extends { box: PBox }>(box: PBox, shapes: readonly T[]): T | undefined {
    let best: T | undefined;
    let bestV = 0.3;
    for (const s of shapes) {
        const v = iou(toBox(s.box), toBox(box));
        if (v >= bestV) {
            best = s;
            bestV = v + 1e-12;
        }
    }
    return best;
}

/**
 * Whether graphty draws these words there: in a text of its own holding them, whose box holds
 * the oracle text's center, give or take the text's height (a line of a label the program wrapped
 * is part of the label graphty draws on fewer lines).
 * @param words - the oracle text's words
 * @param box - the oracle text's box
 * @param texts - graphty's texts, in the oracle's frame
 * @returns true when graphty draws them
 */
function textDrawn(words: string, box: PBox, texts: readonly { words: string; box: PBox }[]): boolean {
    const want = norm(words);
    if (want === "") {
        return false;
    }
    const x = (box.x0 + box.x1) / 2;
    const y = (box.y0 + box.y1) / 2;
    const slack = box.y1 - box.y0;
    return texts.some(
        (t) =>
            t.words.includes(want) &&
            x >= t.box.x0 - slack &&
            x <= t.box.x1 + slack &&
            y >= t.box.y0 - slack &&
            y <= t.box.y1 + slack,
    );
}

const R = (v: number, d = 3): number => {
    const k = 10 ** d;
    const r = Math.round(v * k) / k;
    return Object.is(r, -0) ? 0 : r;
};
/** Rounds every number in a value, recursively. */
function rounded<T>(v: T): T {
    if (typeof v === "number") {
        return (Number.isFinite(v) ? R(v) : v) as T;
    }
    if (Array.isArray(v)) {
        return v.map(rounded) as T;
    }
    if (v !== null && typeof v === "object") {
        return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rounded(x)])) as T;
    }
    return v;
}

const cmp = compareIds;
const norm = (s: string): string => s.replace(/\s+/g, " ").trim();

function ratioMiss(ratio: number, [lo, hi]: readonly [number, number] | readonly number[]): number {
    if (!Number.isFinite(ratio)) {
        return 1e6;
    }
    if (ratio >= lo && ratio <= hi) {
        return 0;
    }
    return Math.abs(Math.log(ratio / (ratio < lo ? lo : hi)));
}

/** The length of an open path. */
const pathLength = (pts: readonly Pt[]): number =>
    pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

/** Farthest point from the chord over the chord's length. */
export function curvatureOf(pts: readonly Pt[]): number {
    const a = pts[0];
    const b = pts.at(-1);
    if (a === undefined || b === undefined) {
        return 0;
    }
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 1e-9) {
        // a loop: every point is off its zero-length chord
        return pts.length > 2 ? 1 : 0;
    }
    let m = 0;
    for (const [x, y] of pts) {
        m = Math.max(m, Math.abs((b[0] - a[0]) * (a[1] - y) - (a[0] - x) * (b[1] - a[1])) / L);
    }
    return m / L;
}

/** Whether a point is inside a node: its box for a rectangle, else the ellipse its box holds. */
const insideNode = (n: PNode, [x, y]: Pt): boolean => {
    const [u, v] = [Math.abs(x - n.cx) / (n.w / 2), Math.abs(y - n.cy) / (n.h / 2)];
    if (!(n.w > 0 && n.h > 0)) {
        return false;
    }
    return n.shape === "rect" || n.shape === "roundrect" ? u < 1 && v < 1 : u * u + v * v < 1;
};

/**
 * A path without its ends inside a node: from where it first leaves the start node to where it last enters the
 * end node, each crossing found on its segment. One program draws an edge from border to border and another from
 * center to center under opaque nodes; a reader sees the same line, so a route is judged on the part between the
 * nodes. A path that never leaves its nodes is kept as it is.
 * @param pts - the path
 * @param start - the node it starts in
 * @param end - the node it ends in
 * @returns the visible path
 */
export function clipToNodes(pts: readonly Pt[], start: PNode | undefined, end: PNode | undefined): Pt[] {
    const crossing = (a: Pt, b: Pt, n: PNode): Pt => {
        // a is inside, b outside: bisect for the border
        let lo = 0;
        let hi = 1;
        for (let k = 0; k < 24; k++) {
            const t = (lo + hi) / 2;
            if (insideNode(n, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])) {
                lo = t;
            } else {
                hi = t;
            }
        }
        return [a[0] + (b[0] - a[0]) * hi, a[1] + (b[1] - a[1]) * hi];
    };
    const trimStart = (path: Pt[], n: PNode | undefined): Pt[] => {
        if (n === undefined || path.length < 2 || !insideNode(n, path[0])) {
            return path;
        }
        const i = path.findIndex((q) => !insideNode(n, q));
        return i < 1 ? path : [crossing(path[i - 1], path[i], n), ...path.slice(i)];
    };
    const head = trimStart([...pts], start);
    const out = trimStart([...head].reverse(), end).reverse();
    return out.length >= 2 ? out : [...pts];
}

/**
 * How far one route is from another: where its two ends are, and its shape, each route seen in its own chord's frame
 * (its start at the origin, its end at (1, 0), across in chord lengths), so the shape is judged relative to its own
 * ends: an arc against a sine wave between the same two nodes is as far apart as the arc's height and the wave's
 * together. A loop's chord is next to nothing; it is judged as drawn, against its length instead.
 * @param o - the oracle's route
 * @param g - graphty's, in the oracle's frame and direction
 * @returns the larger of the ends' distance and the shapes' Frechet distance over `pathSamples` samples, as a share
 *     of `unit` oracle pixels
 */
export function routeShape(o: readonly Pt[], g: readonly Pt[]): { gap: number; unit: number } {
    const N = ORACLE_TOLERANCES.pathSamples;
    const length = pathLength(o);
    const chordOf = (pts: readonly Pt[]): number => {
        const b = pts.at(-1) ?? pts[0];
        return Math.hypot(b[0] - pts[0][0], b[1] - pts[0][1]);
    };
    const chord = chordOf(o);
    if (o.length < 2 || g.length < 2 || chord < 0.25 * length || chordOf(g) < 1e-9) {
        const unit = Math.max(length, 1e-9);
        return { gap: frechet(resample(o, N), resample(g, N)) / unit, unit };
    }
    const own = (pts: readonly Pt[]): Pt[] => {
        const [a, b] = [pts[0], pts.at(-1) ?? pts[0]];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const [ux, uy] = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
        return pts.map(([x, y]): Pt => [
            ((x - a[0]) * ux + (y - a[1]) * uy) / L,
            (-(x - a[0]) * uy + (y - a[1]) * ux) / L,
        ]);
    };
    const ends = Math.max(
        Math.hypot(g[0][0] - o[0][0], g[0][1] - o[0][1]),
        Math.hypot((g.at(-1) ?? g[0])[0] - (o.at(-1) ?? o[0])[0], (g.at(-1) ?? g[0])[1] - (o.at(-1) ?? o[0])[1]),
    );
    return { gap: Math.max(ends / chord, frechet(resample(own(o), N), resample(own(g), N))), unit: chord };
}

/**
 * Whether two line classes are the same: a pattern no class names ("other") matches nothing, not even itself.
 * @param a - one class
 * @param b - the other
 * @returns true when they match
 */
const sameLine = (a: DashClass, b: DashClass): boolean => a === b && a !== "other";

/** The places along a gradient its colors are compared at. */
const RAMP_AT = [0, 0.25, 0.5, 0.75, 1] as const;

/**
 * A gradient's color at a place along it, mixed between its stops in RGB.
 * @param g - the gradient
 * @param t - 0 at its start, 1 at its end
 * @returns `#rrggbb`
 */
export function rampColor(g: PGradient, t: number): string {
    const stops = [...g.stops].sort((a, b) => a.offset - b.offset);
    const first = stops[0];
    const last = stops.at(-1);
    if (first === undefined || last === undefined) {
        return "#000000";
    }
    if (t <= first.offset) {
        return first.color;
    }
    const k = stops.findIndex((s) => s.offset >= t);
    if (k < 0) {
        return last.color;
    }
    const [a, b] = [stops[k - 1], stops[k]];
    const f = b.offset > a.offset ? (t - a.offset) / (b.offset - a.offset) : 0;
    const rgb = (h: string, i: number): number => Number.parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
    return `#${[0, 1, 2]
        .map((i) =>
            Math.round(rgb(a.color, i) + f * (rgb(b.color, i) - rgb(a.color, i)))
                .toString(16)
                .padStart(2, "0"),
        )
        .join("")}`;
}

/** The difference between two directions, in degrees, -180 to 180. */
const turnOf = (deg: number): number => (((deg % 360) + 540) % 360) - 180;

/**
 * How far two gradients are from alike: one on each side or on neither; the same kind; their colors at five places
 * along them within the color tolerance; a linear one's direction within its tolerance.
 * @param o - the oracle's gradient, or null
 * @param g - graphty's, or null
 * @param angles - each linear gradient's direction as judged (in the oracle's frame, or against its edge's chord)
 * @param angles.o - the oracle's
 * @param angles.g - graphty's
 * @returns the miss (0 when alike) and what each side shows
 */
function gradientMiss(
    o: PGradient | null,
    g: PGradient | null,
    angles: { o: number | null; g: number | null },
): { miss: number; oracle: unknown; graphty: unknown } {
    const show = (x: PGradient | null, angle: number | null): unknown =>
        x === null
            ? null
            : { kind: x.kind, angle: angle === null ? null : R(angle, 1), colors: RAMP_AT.map((t) => rampColor(x, t)) };
    const out = { oracle: show(o, angles.o), graphty: show(g, angles.g) };
    if (o === null || g === null) {
        return { miss: (o === null) === (g === null) ? 0 : 1, ...out };
    }
    if (o.kind !== g.kind) {
        return { miss: 1, ...out };
    }
    const colors = Math.max(...RAMP_AT.map((t) => deltaE(rampColor(o, t), rampColor(g, t))));
    let miss = Math.max(0, colors - ORACLE_TOLERANCES.colorDeltaE);
    if (o.kind === "linear" && angles.o !== null && angles.g !== null) {
        miss += Math.max(0, Math.abs(turnOf(angles.g - angles.o)) - ORACLE_TOLERANCES.gradientAngleDeg) / 90;
    }
    return { miss, ...out };
}

/** The direction of a route's chord, in degrees on screen. */
const chordAngle = (pts: readonly Pt[]): number => {
    const b = pts.at(-1) ?? pts[0];
    return (Math.atan2(b[1] - pts[0][1], b[0] - pts[0][0]) * 180) / Math.PI;
};

class Judge {
    readonly results = new Map<OracleProperty, OracleJudged[]>();
    readonly failed = new Map<string, Set<OracleProperty>>();

    add(p: OracleProperty, kind: string, id: string, miss: number, oracle: unknown, graphty: unknown): void {
        const pass = miss <= 0;
        const list = this.results.get(p) ?? [];
        list.push({ id, pass, miss: pass ? 0 : miss, oracle, graphty });
        this.results.set(p, list);
        if (!pass) {
            const key = `${kind}\u0000${id}`;
            const set = this.failed.get(key) ?? new Set();
            set.add(p);
            this.failed.set(key, set);
        }
    }
}

const TOLERANCE_TEXT: Record<OracleProperty, string> = {
    "node.present": "every oracle node is drawn by graphty",
    "node.extra": "every node graphty draws is one the oracle draws (no extra, hidden or duplicate node)",
    "node.position": `center within ${String(ORACLE_TOLERANCES.positionOfSize)} of the node's smaller side (at least ${String(ORACLE_TOLERANCES.pixel)} render px) after the fit`,
    "node.width": `ratio in [${ORACLE_TOLERANCES.sizeRatio.join(", ")}]`,
    "node.height": `ratio in [${ORACLE_TOLERANCES.sizeRatio.join(", ")}]`,
    "node.sizeToSpacing": `size over the drawing's median nearest-node spacing, ratio in [${ORACLE_TOLERANCES.layoutSizeRatio.join(", ")}]`,
    "node.sizeToExtent": `size over the diagonal of the drawing's extent, ratio in [${ORACLE_TOLERANCES.layoutSizeRatio.join(", ")}]`,
    "node.shape": "same shape class, where the oracle's can be told",
    "node.fill": `both unfilled, or both filled within deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}`,
    "node.fillOpacity": `within ${String(ORACLE_TOLERANCES.opacity)}`,
    "node.gradient": `a gradient on both sides or on neither; alike, the same kind, colors within deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)} at five places along it, a linear one's direction within ${String(ORACLE_TOLERANCES.gradientAngleDeg)} degrees`,
    "node.stroke": `both outlined within deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}, or neither (under ${String(ORACLE_TOLERANCES.hairline)} px is none)`,
    "node.strokeWidth": `ratio in [${ORACLE_TOLERANCES.strokeWidthRatio.join(", ")}]`,
    "node.strokeDash":
        "same line class (solid, dashed, dotted, dash-dot from the dashes and gaps against the width; double, zigzag, sine wave, slashes, arrows from a pattern's geometry); a pattern no class names matches nothing",
    "label.present": "a label on both sides or on neither",
    "label.text": "same words (whitespace folded)",
    "label.size": `font size ratio in [${ORACLE_TOLERANCES.fontSizeRatio.join(", ")}]`,
    "label.weight": `CSS weight within ${String(ORACLE_TOLERANCES.fontWeight)}`,
    "label.style": "same style (normal / italic)",
    "label.color": `deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}`,
    "label.rotation": `within ${String(ORACLE_TOLERANCES.rotationDeg)} degrees`,
    "label.offset": `label center relative to its node within ${String(ORACLE_TOLERANCES.labelOffsetOfSize)} of its font size (at least ${String(ORACLE_TOLERANCES.pixel)} render px)`,
    "edge.present": "every oracle edge is drawn by graphty",
    "edge.extra": "every edge graphty draws is one the oracle draws (no extra, hidden or duplicate edge)",
    "edge.route": `each route between its own nodes' outlines, in its own chord's frame (${String(ORACLE_TOLERANCES.pathSamples)} samples): Frechet distance within ${String(ORACLE_TOLERANCES.edgePathOfLength)} of the chord (of the length, for a loop; at least ${String(ORACLE_TOLERANCES.pixel)} render px)`,
    "edge.curve": `farthest point from the chord over the chord, within ${String(ORACLE_TOLERANCES.curvature)} or ${String(ORACLE_TOLERANCES.curveShare)} of the oracle's`,
    "edge.color": `deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}`,
    "edge.width": `ratio in [${ORACLE_TOLERANCES.edgeWidthRatio.join(", ")}]`,
    "edge.opacity": `within ${String(ORACLE_TOLERANCES.opacity)}`,
    "edge.dash":
        "same line class (solid, dashed, dotted, dash-dot from the dashes and gaps against the width; double, zigzag, sine wave, slashes, arrows from a pattern's geometry); a pattern no class names matches nothing",
    "edge.gradient": `a gradient on both sides or on neither; alike, the same kind, colors within deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)} at five places along it, a linear one's direction against the edge's chord within ${String(ORACLE_TOLERANCES.gradientAngleDeg)} degrees`,
    "edge.arrow": "an arrowhead at the same ends",
    "edge.arrowShape":
        "the same shape class at each end (triangle, inverted, vee, crow, diamond, circle, box, tee, half); one no class names matches nothing",
    "edge.arrowFill": "filled on both or hollow on both, at each end",
    "edge.arrowColor": `deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)} at each end`,
    "edge.arrowLength": `ratio in [${ORACLE_TOLERANCES.arrowRatio.join(", ")}]`,
    "edge.arrowWidth": `ratio in [${ORACLE_TOLERANCES.arrowRatio.join(", ")}]`,
    "edge.arrowToSpacing": `arrowhead length over the drawing's median nearest-node spacing, ratio in [${ORACLE_TOLERANCES.layoutSizeRatio.join(", ")}]`,
    "edge.label": "same words",
    "group.present": "every oracle group box is drawn by graphty",
    "group.extra": "every group box graphty draws is one the oracle draws",
    "group.box": `intersection over union at least ${String(ORACLE_TOLERANCES.groupIoU)}`,
    "group.fill": `both unfilled, or deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}`,
    "group.strokeWidth": `ratio in [${ORACLE_TOLERANCES.strokeWidthRatio.join(", ")}]`,
    "group.label": "same words",
    "stray.present": `every unassociated oracle shape or text has a graphty annotation over it (IoU ${String(ORACLE_TOLERANCES.strayIoU)})`,
    "stray.extra": `every annotation graphty draws has an oracle shape or text under it (IoU ${String(ORACLE_TOLERANCES.strayIoU)})`,
    "frame.mirror": "graphty's drawing is not the program's mirrored (unless the program is known to mirror)",
    "frame.rotation": `the fitted frame turns graphty's drawing by at most ${String(ORACLE_TOLERANCES.rotationDeg)} degrees`,
    "frame.zoom": `the share of its canvas the drawing fills (along its tighter axis), ratio in [${ORACLE_TOLERANCES.sizeRatio.join(", ")}]`,
    background: `deltaE ${String(ORACLE_TOLERANCES.backgroundDeltaE)}`,
};

const boxW = (b: PBox): number => b.x1 - b.x0;
const boxH = (b: PBox): number => b.y1 - b.y0;
const toBox = (b: PBox): { x: number; y: number; w: number; h: number } => ({
    x: b.x0,
    y: b.y0,
    w: boxW(b),
    h: boxH(b),
});

/** A specimen sheet's corner anchor node (`anchor-nw` and so on), which fixes the frame. */
const isAnchor = (id: string): boolean => id.startsWith("anchor-");

/**
 * A scene without a specimen sheet's caption nodes (`cap-*`, text "<property>=<value>" under each specimen): they
 * describe the sheet and are not judged. A caption's words left as free text are dropped too.
 * @param scene - either side
 * @returns the scene without them
 */
function withoutCaptions(scene: PScene): PScene {
    const caps = scene.nodes.filter((n) => n.id.startsWith("cap-"));
    if (caps.length === 0) {
        return scene;
    }
    const ids = new Set(caps.map((n) => n.id));
    const words = new Set(caps.flatMap((n) => (n.label ? [norm(n.label.content)] : [])));
    return {
        ...scene,
        nodes: scene.nodes.filter((n) => !ids.has(n.id)),
        edges: scene.edges.filter((e) => !ids.has(e.source) && !ids.has(e.target)),
        texts: scene.texts.filter((t) => !words.has(norm(t.content))),
    };
}

/**
 * Pairs the oracle's nodes with graphty's: by id, then by unique label text for the rest. A specimen sheet's caption
 * nodes are left out on both sides first.
 * @param oracleScene - the oracle scene
 * @param graphtyScene - graphty's scene
 * @returns the pairs in oracle id order, and the nodes of each side left unpaired
 */
export function pairNodes(
    oracleScene: PScene,
    graphtyScene: PScene,
): { pairs: [PNode, PNode][]; oracleLeft: PNode[]; graphtyLeft: PNode[] } {
    const oracle = withoutCaptions(oracleScene);
    const graphty = withoutCaptions(graphtyScene);
    const gById = new Map(graphty.nodes.map((n) => [n.id, n]));
    const pairs: [PNode, PNode][] = [];
    const unmatchedOracle: PNode[] = [];
    for (const o of oracle.nodes) {
        const g = gById.get(o.id);
        if (g === undefined) {
            unmatchedOracle.push(o);
        } else {
            pairs.push([o, g]);
            gById.delete(o.id);
        }
    }
    const labelKey = (n: PNode): string | null => (n.label ? norm(n.label.content) : null);
    const freeG = new Map<string, PNode[]>();
    for (const g of gById.values()) {
        const k = labelKey(g);
        if (k !== null && k !== "") {
            freeG.set(k, [...(freeG.get(k) ?? []), g]);
        }
    }
    const oracleLeft: PNode[] = [];
    for (const o of unmatchedOracle) {
        const k = labelKey(o);
        const gs = k === null ? undefined : freeG.get(k);
        if (gs?.length === 1 && unmatchedOracle.filter((x) => labelKey(x) === k).length === 1) {
            pairs.push([o, gs[0]]);
            gById.delete(gs[0].id);
            freeG.delete(k ?? "");
        } else {
            oracleLeft.push(o);
        }
    }
    pairs.sort(([a], [b]) => cmp(a.id, b.id));
    return { pairs, oracleLeft, graphtyLeft: [...gById.values()].sort((a, b) => cmp(a.id, b.id)) };
}

/**
 * The median distance from a point to its nearest neighbor: a drawing's own spacing, which a size is measured against
 * where the two layouts are unrelated.
 * @param pts - the points
 * @returns the median, or null under three points or when every point sits on another
 */
export function medianSpacing(pts: readonly Pt[]): number | null {
    if (pts.length < 3) {
        return null;
    }
    const sorted = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const nearest = sorted.map(([x, y], i) => {
        let best = Infinity;
        for (const step of [-1, 1]) {
            for (let k = i + step; k >= 0 && k < sorted.length && Math.abs(sorted[k][0] - x) < best; k += step) {
                const d = Math.hypot(sorted[k][0] - x, sorted[k][1] - y);
                if (d > 0 && d < best) {
                    best = d;
                }
            }
        }
        return best;
    });
    const finite = nearest.filter(Number.isFinite).sort((a, b) => a - b);
    return finite.length === 0 ? null : finite[Math.floor(finite.length / 2)];
}

/** The box round nodes, out to their outlines' outer edges. */
function extentOf(nodes: readonly PNode[], side: "oracle" | "graphty"): PBox {
    const box: PBox = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const n of nodes) {
        const [w, h] = outerOf(n, side);
        box.x0 = Math.min(box.x0, n.cx - w / 2);
        box.y0 = Math.min(box.y0, n.cy - h / 2);
        box.x1 = Math.max(box.x1, n.cx + w / 2);
        box.y1 = Math.max(box.y1, n.cy + h / 2);
    }
    return box;
}

/** The share of a canvas a box fills along its tighter axis: 1 when it fits the canvas exactly one way. */
const fillOf = (b: PBox, width: number, height: number): number =>
    Math.max(boxW(b) / Math.max(width, 1e-9), boxH(b) / Math.max(height, 1e-9));

/**
 * Compares graphty's drawing with the oracle's.
 * @param sample - the sample id
 * @param oracle - the oracle scene (`associate().scene`)
 * @param graphty - graphty's scene (`drawnPrimitives`)
 * @param association - how the oracle was associated, carried into the report
 * @param options - how the frames may differ
 * @param options.mirror - the program's drawing is known to be the file mirrored (a converter
 *     that copies y-down coordinates into a y-up space), so the fit may reflect; otherwise both
 *     sides are y-down screen drawings and a mirror is a difference to report, never to fit away
 * @param options.standIn - the oracle is another program's drawing standing in for the file's own
 * @returns the report, rounded
 */
export function compareOracle(
    sample: string,
    oracleScene: PScene,
    graphtyScene: PScene,
    association: unknown = null,
    options: { mirror?: boolean; standIn?: boolean } = {},
): OracleReport {
    const oracle = withoutCaptions(oracleScene);
    const graphty = withoutCaptions(graphtyScene);
    const T = ORACLE_TOLERANCES;
    const diag = Math.hypot(oracle.width, oracle.height);
    const j = new Judge();

    // ---- nodes: by id, then by unique label text for the rest
    const { pairs, oracleLeft: stillOracle, graphtyLeft } = pairNodes(oracle, graphty);
    const idMap = new Map(pairs.map(([o, g]) => [g.id, o.id]));

    // ---- the frame
    // A specimen sheet's corner anchors fix the frame: the fit is taken on them alone, so a misplaced specimen
    // cannot pull the frame towards itself, and the layouts are related by construction.
    const anchors = pairs.filter(([o]) => isAnchor(o.id));
    const framePairs = anchors.length >= 2 ? anchors : pairs;
    const frameG = framePairs.map(([, g]): Pt => [g.cx, g.cy]);
    const frameO = framePairs.map(([o]): Pt => [o.cx, o.cy]);
    const fit = framePairs.length >= 2 ? fitSimilarity(frameG, frameO, { reflect: options.mirror === true }) : null;
    // the best fit either way, mirrored or not: a mirror it finds that the program is not known to draw is reported,
    // never fitted away
    const free = framePairs.length >= 3 && options.mirror !== true ? fitSimilarity(frameG, frameO) : null;
    let transform: OracleReport["transform"] = null;
    let lengthScale = 1;
    // each side's spacing and extent, over the nodes both draw
    const spacingO = medianSpacing(pairs.map(([o]): Pt => [o.cx, o.cy]));
    const spacingG = medianSpacing(pairs.map(([, g]): Pt => [g.cx, g.cy]));
    const spacing = spacingO !== null && spacingG !== null ? { oracle: spacingO, graphty: spacingG } : null;
    const extentO = extentOf(
        pairs.map(([o]) => o),
        "oracle",
    );
    const extentG = extentOf(
        pairs.map(([, g]) => g),
        "graphty",
    );
    const filled = {
        oracle: fillOf(extentO, oracle.width, oracle.height),
        graphty: fillOf(extentG, graphty.width, graphty.height),
    };
    if (fit !== null) {
        const sse = pairs.reduce((sum, [o, g]) => {
            const [x, y] = apply(fit, [g.cx, g.cy]);
            return sum + (x - o.cx) ** 2 + (y - o.cy) ** 2;
        }, 0);
        const rms = Math.sqrt(sse / pairs.length) / diag;
        const unrelated = framePairs === pairs && rms > T.unrelatedLayout;
        lengthScale = fit.scale;
        if (unrelated) {
            const ratios = pairs
                .map(([o, g]) => Math.max(...outerOf(o, "oracle")) / Math.max(...outerOf(g, "graphty"), 1e-9))
                .filter((r) => Number.isFinite(r) && r > 0)
                .sort((a, b) => a - b);
            lengthScale = ratios.length > 0 ? ratios[Math.floor(ratios.length / 2)] : fit.scale;
        }
        transform = {
            scale: fit.scale,
            rotationDeg: (fit.rotation * 180) / Math.PI,
            reflect: fit.reflect,
            tx: fit.tx,
            ty: fit.ty,
            rms,
            matched: pairs.length,
            unrelatedLayout: unrelated,
            lengthScale,
            spacing,
            fill: filled,
        };
        // What the fit must not absorb: a mirror, a turn, a zoom. Between unrelated layouts a fitted turn or mirror is
        // noise, and only the zoom (how much of its canvas each drawing fills) is told.
        // a mirror that relates layouts the unmirrored fit cannot is reported too
        const mirrored =
            free !== null &&
            free.reflect &&
            free.sse < T.mirrorResidual * fit.sse &&
            Math.sqrt(free.sse / framePairs.length) / diag <= T.unrelatedLayout;
        if (!unrelated || mirrored) {
            j.add("frame.mirror", "graph", "frame", mirrored ? 1 : 0, false, mirrored);
        }
        if (!unrelated) {
            const turn = (((transform.rotationDeg % 360) + 540) % 360) - 180;
            j.add("frame.rotation", "graph", "frame", Math.max(0, Math.abs(turn) - T.rotationDeg), 0, R(turn));
        }
        j.add(
            "frame.zoom",
            "graph",
            "frame",
            ratioMiss(filled.graphty / Math.max(filled.oracle, 1e-9), T.sizeRatio),
            R(filled.oracle),
            R(filled.graphty),
        );
    }
    const toOracle = (p: Pt): Pt => (fit === null ? p : apply(fit, p));
    /** A graphty screen angle in the oracle's frame: a reflection turns it round before the rotation. */
    // Between unrelated layouts the fitted turn is noise: local measures (a label's turn and its
    // place beside its node) are then taken unturned, at the size-fitted scale.
    const local = fit !== null && !(transform?.unrelatedLayout ?? false) ? fit : null;
    const angleToOracle = (deg: number): number =>
        local === null ? deg : (local.reflect ? -deg : deg) + (local.rotation * 180) / Math.PI;
    /** A graphty vector (an offset) into the oracle frame, without the translation. */
    const vecToOracle = (v: Pt): Pt => {
        if (local === null) {
            return [v[0] * lengthScale, v[1] * lengthScale];
        }
        const a = apply(local, [0, 0]);
        const b = apply(local, v);
        return [b[0] - a[0], b[1] - a[1]];
    };
    /** One graphty render pixel or so in oracle pixels: the least any distance tolerance allows. */
    const pixel = T.pixel * lengthScale;
    // the layout's own extent, over the node centers: a node's size against it says how large the node is beside
    // the whole drawing, which node sizes themselves must not inflate
    const centersO = boxOfPoints(pairs.map(([o]): Pt => [o.cx, o.cy]));
    const centersG = boxOfPoints(pairs.map(([, g]): Pt => [g.cx, g.cy]));
    const extentDiagO = Math.hypot(boxW(centersO), boxH(centersO));
    const extentDiagG = Math.hypot(boxW(centersG), boxH(centersG));
    /** A size judged against each side's own spacing and extent, which the fitted scale cannot hide. */
    const layoutRelative = (p: "node.sizeToSpacing" | "node.sizeToExtent" | "edge.arrowToSpacing"): number | null => {
        if (p === "node.sizeToExtent") {
            return pairs.length >= 3 && extentDiagO > 0 && extentDiagG > 0 ? extentDiagO / extentDiagG : null;
        }
        return spacing === null ? null : spacing.oracle / spacing.graphty;
    };
    const spacingScale = layoutRelative("node.sizeToSpacing");
    const extentScale = layoutRelative("node.sizeToExtent");

    for (const o of [...oracle.nodes].sort((a, b) => cmp(a.id, b.id))) {
        const g = pairs.find(([x]) => x === o)?.[1];
        j.add("node.present", "node", o.id, g === undefined ? 1 : 0, o.id, g?.id ?? null);
    }
    // what graphty draws that the oracle does not: an extra, hidden or duplicate node is an import defect
    for (const [o, g] of pairs) {
        j.add("node.extra", "node", `graphty:${g.id}`, 0, o.id, g.id);
    }
    for (const g of graphtyLeft) {
        j.add("node.extra", "node", `graphty:${g.id}`, 1, null, g.id);
    }
    for (const [o, g] of pairs) {
        const { id } = o;
        const c = toOracle([g.cx, g.cy]);
        const [ow, oh] = outerOf(o, "oracle");
        const off = Math.hypot(c[0] - o.cx, c[1] - o.cy);
        const near = Math.max(T.positionOfSize * Math.min(ow, oh), pixel);
        j.add("node.position", "node", id, Math.max(0, off / near - 1), [o.cx, o.cy], c);
        const [gw0, gh0] = outerOf(g, "graphty");
        const [gw, gh] = [gw0 * lengthScale, gh0 * lengthScale];
        j.add("node.width", "node", id, ratioMiss(gw / Math.max(ow, 1e-9), T.sizeRatio), ow, gw);
        j.add("node.height", "node", id, ratioMiss(gh / Math.max(oh, 1e-9), T.sizeRatio), oh, gh);
        const oSize = Math.max(ow, oh);
        if (oSize > 0) {
            for (const [p, scale] of [
                ["node.sizeToSpacing", spacingScale],
                ["node.sizeToExtent", extentScale],
            ] as const) {
                if (scale !== null) {
                    const gSize = Math.max(gw0, gh0) * scale;
                    j.add(p, "node", id, ratioMiss(gSize / oSize, T.layoutSizeRatio), R(oSize), R(gSize));
                }
            }
        }
        if (o.shape !== null) {
            j.add("node.shape", "node", id, o.shape === g.shape ? 0 : 1, o.shape, g.shape);
        }
        const oFill = shownFill(o);
        // graphty's fill as a reader of the oracle's drawing would see it: none under half an oracle pixel across
        const gFill = Math.min(g.w, g.h) * lengthScale < 0.5 ? null : g.fill;
        judgeFill(j, "node.fill", "node", id, oFill, gFill);
        if (oFill !== null && gFill !== null) {
            j.add(
                "node.fillOpacity",
                "node",
                id,
                Math.max(0, Math.abs(oFill.opacity - gFill.opacity) - T.opacity),
                oFill.opacity,
                gFill.opacity,
            );
            const gAngle = gFill.gradient?.angle ?? null;
            const grad = gradientMiss(oFill.gradient, gFill.gradient, {
                o: oFill.gradient?.angle ?? null,
                g: gAngle === null ? null : angleToOracle(gAngle),
            });
            j.add("node.gradient", "node", id, grad.miss, grad.oracle, grad.graphty);
        }
        // A stroke under the hairline is none, unless the other side draws one of a width within the
        // tolerance of it: two thin outlines either side of the line are the same outline.
        const oStroke = shownStroke(o);
        // A width in screen pixels (vis-network's borders) is the same on screen whatever the frame's length scale.
        const strokeScale = g.stroke?.screen === true ? 1 : lengthScale;
        const close =
            oStroke !== null &&
            g.stroke !== null &&
            oStroke.width > 0 &&
            ratioMiss((g.stroke.width * strokeScale) / oStroke.width, T.strokeWidthRatio) === 0;
        // a patterned line read off a filled outline is an outline whatever its width
        const os =
            oStroke !== null && (close || oStroke.width >= T.hairline || oStroke.patterned === true) ? oStroke : null;
        const gs = g.stroke !== null && (close || g.stroke.width * strokeScale >= T.hairline) ? g.stroke : null;
        if (os === null || gs === null) {
            j.add("node.stroke", "node", id, os === gs ? 0 : 1, os?.color ?? null, gs?.color ?? null);
        } else {
            const dE = deltaE(os.color, gs.color);
            j.add("node.stroke", "node", id, Math.max(0, dE - T.colorDeltaE), os.color, gs.color);
            if (Number.isFinite(os.width)) {
                j.add(
                    "node.strokeWidth",
                    "node",
                    id,
                    ratioMiss((gs.width * strokeScale) / os.width, T.strokeWidthRatio),
                    os.width,
                    gs.width * strokeScale,
                );
            }
            j.add(
                "node.strokeDash",
                "node",
                id,
                sameLine(os.dashClass, gs.dashClass) ? 0 : 1,
                os.dashClass,
                gs.dashClass,
            );
        }
        judgeLabel(
            j,
            "node",
            id,
            o.label,
            g.label,
            lengthScale,
            angleToOracle,
            fit === null ? null : { o, g, vec: vecToOracle, pixel },
            oracle.labelGeometry !== false,
        );
    }

    // ---- edges: by endpoint pair (unordered), in id order within a pair
    const pairKey = (a: string, b: string): string => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);
    // an end at no node of graphty's (a group's box) keeps its id, which the oracle's association takes from graphty
    const graphtyNodeIds = new Set(graphty.nodes.map((n) => n.id));
    const oid = (id: string): string => idMap.get(id) ?? (graphtyNodeIds.has(id) ? `g:${id}` : id);
    const gEdges = new Map<string, PEdge[]>();
    for (const e of graphty.edges) {
        const k = pairKey(oid(e.source), oid(e.target));
        gEdges.set(k, [...(gEdges.get(k) ?? []), e]);
    }
    const edgePairs: [PEdge, PEdge][] = [];
    const oById = new Map(oracle.nodes.map((n) => [n.id, n]));
    const unmatchedOracleEdges: string[] = [];
    // graphty's path in the oracle's frame, source end first the oracle's way
    const routeOf = (o: PEdge, g: PEdge): Pt[] => {
        const gp = g.points.map((p) => toOracle(p));
        return oid(g.source) === o.source ? gp : [...gp].reverse();
    };
    // Parallel edges are paired in id order, except that an edge whose route would fail goes to one whose route
    // passes (the fanned one to the fanned one) where the layouts agree; routes drawn alike (two straight edges
    // over one another) say nothing about which is which, and then the edge with the same label words is its pair.
    // Each route is judged between its own nodes' outlines, cut there by one rule on both sides: one program starts
    // its line at the node's center under the node and another at its border, and a reader sees the same line. Each
    // side's own nodes cut its own route, so a route is cut where its own drawing's node ends.
    const gById = new Map(graphty.nodes.map((n) => [n.id, n]));
    const oOuter = (n: PNode | undefined): PNode | undefined => {
        if (n === undefined) {
            return undefined;
        }
        const [w, h] = outerOf(n, "oracle");
        return { ...n, w, h };
    };
    const gOuter = (id: string): PNode | undefined => {
        const n = gById.get(id);
        if (n === undefined) {
            return undefined;
        }
        const [w, h] = outerOf(n, "graphty");
        const [cx, cy] = toOracle([n.cx, n.cy]);
        return { ...n, cx, cy, w: w * lengthScale, h: h * lengthScale };
    };
    /** Both routes between their own nodes, graphty's in the oracle's frame and direction. */
    const visible = (o: PEdge, g: PEdge): [Pt[], Pt[]] => {
        const [gs, gt] = oid(g.source) === o.source ? [g.source, g.target] : [g.target, g.source];
        return [
            clipToNodes(o.points, oOuter(oById.get(o.source)), oOuter(oById.get(o.target))),
            clipToNodes(routeOf(o, g), gOuter(gs), gOuter(gt)),
        ];
    };
    /** How far graphty's route's shape is from the oracle's (`routeShape`), and the least gap that fails. */
    const routeGap = (o: PEdge, g: PEdge): { gap: number; near: number } => {
        const { gap, unit } = routeShape(...visible(o, g));
        return { gap, near: Math.max(T.edgePathOfLength, pixel / unit) };
    };
    const curved = (pts: readonly Pt[]): boolean => curvatureOf(pts) > T.curvature;
    const sameWords = (o: PEdge, list: readonly PEdge[]): number => {
        const words = (e: PEdge): string => norm(e.label?.content ?? "");
        const k = list.findIndex((g) => words(g) === words(o));
        return Math.max(k, 0);
    };
    const closest = (o: PEdge, list: PEdge[]): number => {
        if (list.length < 2) {
            return 0;
        }
        // without a frame the routes say nothing, and every route counts as passing
        const framed = fit !== null && !(transform?.unrelatedLayout ?? false);
        const routes = list.map((g) => (framed ? routeGap(o, g) : { gap: 0, near: 1 }));
        const gaps = routes.map((r) => r.gap / r.near);
        const passes = (k: number): boolean => gaps[k] <= 1;
        const best = gaps.indexOf(Math.min(...gaps));
        // An edge found by its geometry alone (a `#g` id) has no id to keep: it is the edge drawn most like it -- its
        // route passing, then in its color and with its label, then curved alike, then running the same way.
        if (o.id.includes("#g")) {
            const rank = (k: number): number => {
                const g = list[k];
                const dressed =
                    (o.stroke === null ||
                        g.stroke === null ||
                        deltaE(o.stroke.color, g.stroke.color) <= T.colorDeltaE) &&
                    norm(o.label?.content ?? "") === norm(g.label?.content ?? "");
                return (
                    (passes(k) ? 0 : 8) +
                    (dressed ? 0 : 4) +
                    (curved(routeOf(o, g)) === curved(o.points) ? 0 : 2) +
                    (idMap.get(g.source) === o.source ? 0 : 1)
                );
            };
            // the nearest of the edges drawn most like it
            return gaps
                .map((_, k) => k)
                .reduce((x, y) => (rank(y) < rank(x) || (rank(y) === rank(x) && gaps[y] < gaps[x]) ? y : x));
        }
        // the order holds unless its edge's route fails where another's passes
        if (framed && !passes(0) && passes(best)) {
            return best;
        }
        // among the edges whose routes pass as well as the first's, the one with the same words
        const alike = list.map((_, k) => k).filter((k) => passes(k) === passes(0));
        return alike[
            sameWords(
                o,
                alike.map((k) => list[k]),
            )
        ];
    };
    for (const o of [...oracle.edges].sort((a, b) => cmp(a.id, b.id))) {
        const list = gEdges.get(pairKey(o.source, o.target));
        const g = list === undefined || list.length === 0 ? undefined : list.splice(closest(o, list), 1)[0];
        if (g === undefined) {
            unmatchedOracleEdges.push(o.id);
        } else {
            edgePairs.push([o, g]);
        }
        j.add("edge.present", "edge", o.id, g === undefined ? 1 : 0, `${o.source} - ${o.target}`, g?.id ?? null);
    }
    const unmatchedGraphtyEdges = [...gEdges.values()]
        .flat()
        .map((e) => e.id)
        .sort(cmp);
    // what graphty draws that the oracle does not: an extra, hidden or duplicate edge is an import defect
    const extraEdges = new Set(unmatchedGraphtyEdges);
    for (const e of oracle.nodesOnly === true ? [] : [...graphty.edges].sort((a, b) => cmp(a.id, b.id))) {
        j.add("edge.extra", "edge", `graphty:${e.id}`, extraEdges.has(e.id) ? 1 : 0, null, e.id);
    }
    for (const [o, g] of edgePairs) {
        const { id } = o;
        const flipped = oid(g.source) !== o.source;
        const framed = fit !== null && !(transform?.unrelatedLayout ?? false);
        const [vo, vg] = visible(o, g);
        if (framed) {
            const { gap, near } = routeGap(o, g);
            j.add("edge.route", "edge", id, Math.max(0, gap / near - 1), R(near), R(gap));
        }
        // how far each route bends between its own nodes, a ratio no frame changes
        const oc = curvatureOf(vo);
        const gc = curvatureOf(vg);
        const bend = Math.max(T.curvature, T.curveShare * oc);
        j.add("edge.curve", "edge", id, Math.max(0, Math.abs(gc - oc) - bend) / bend, R(oc), R(gc));
        if (o.stroke !== null && g.stroke !== null) {
            j.add(
                "edge.color",
                "edge",
                id,
                Math.max(0, deltaE(o.stroke.color, g.stroke.color) - T.colorDeltaE),
                o.stroke.color,
                g.stroke.color,
            );
            // a pattern drawn as a fill of its own (slashes, arrows, a double line) has no width to read
            if (Number.isFinite(o.stroke.width)) {
                j.add(
                    "edge.width",
                    "edge",
                    id,
                    ratioMiss((g.stroke.width * lengthScale) / Math.max(o.stroke.width, 1e-9), T.edgeWidthRatio),
                    o.stroke.width,
                    g.stroke.width * lengthScale,
                );
            }
            j.add(
                "edge.opacity",
                "edge",
                id,
                Math.max(0, Math.abs(o.stroke.opacity - g.stroke.opacity) - T.opacity),
                o.stroke.opacity,
                g.stroke.opacity,
            );
            j.add(
                "edge.dash",
                "edge",
                id,
                sameLine(o.stroke.dashClass, g.stroke.dashClass) ? 0 : 1,
                o.stroke.dashClass,
                g.stroke.dashClass,
            );
            // a gradient along an edge runs against its own line: its direction is judged against its chord
            const og = o.stroke.gradient ?? null;
            const gg = g.stroke.gradient ?? null;
            const [oAngle, gAngle] = [og?.angle ?? null, gg?.angle ?? null];
            const grad = gradientMiss(og, gg, {
                o: oAngle === null ? null : turnOf(oAngle - chordAngle(vo)),
                g: gAngle === null ? null : turnOf(angleToOracle(gAngle) - chordAngle(vg)),
            });
            j.add("edge.gradient", "edge", id, grad.miss, grad.oracle, grad.graphty);
        }
        const flip = (a: PArrow): PArrow => (flipped ? { ...a, end: a.end === "source" ? "target" : "source" } : a);
        const ga = g.arrows.map(flip);
        for (const end of ["source", "target"] as const) {
            const oa = o.arrows.find((a) => a.end === end);
            const gg = ga.find((a) => a.end === end);
            const at = `${id}@${end}`;
            j.add(
                "edge.arrow",
                "edge",
                at,
                (oa === undefined) === (gg === undefined) ? 0 : 1,
                oa !== undefined,
                gg !== undefined,
            );
            if (oa === undefined || gg === undefined) {
                continue;
            }
            j.add(
                "edge.arrowShape",
                "edge",
                at,
                oa.shape === gg.shape && oa.shape !== "other" ? 0 : 1,
                oa.shape,
                gg.shape,
            );
            j.add("edge.arrowFill", "edge", at, oa.filled === gg.filled ? 0 : 1, oa.filled, gg.filled);
            if (oa.color !== null && gg.color !== null) {
                j.add(
                    "edge.arrowColor",
                    "edge",
                    at,
                    Math.max(0, deltaE(oa.color, gg.color) - T.colorDeltaE),
                    oa.color,
                    gg.color,
                );
            }
            j.add(
                "edge.arrowLength",
                "edge",
                at,
                ratioMiss((gg.length * lengthScale) / Math.max(oa.length, 1e-9), T.arrowRatio),
                oa.length,
                gg.length * lengthScale,
            );
            j.add(
                "edge.arrowWidth",
                "edge",
                at,
                ratioMiss((gg.width * lengthScale) / Math.max(oa.width, 1e-9), T.arrowRatio),
                oa.width,
                gg.width * lengthScale,
            );
            const arrowScale = layoutRelative("edge.arrowToSpacing");
            if (arrowScale !== null) {
                j.add(
                    "edge.arrowToSpacing",
                    "edge",
                    at,
                    ratioMiss((gg.length * arrowScale) / Math.max(oa.length, 1e-9), T.layoutSizeRatio),
                    oa.length,
                    R(gg.length * arrowScale),
                );
            }
        }
        if (o.label !== null || g.label !== null) {
            j.add(
                "edge.label",
                "edge",
                id,
                norm(o.label?.content ?? "") === norm(g.label?.content ?? "") ? 0 : 1,
                o.label?.content ?? null,
                g.label?.content ?? null,
            );
        }
    }

    // ---- groups: by id, else by box overlap after the fit
    const toO = (box: PBox): PBox => {
        const a = toOracle([box.x0, box.y0]);
        const b = toOracle([box.x1, box.y1]);
        return {
            x0: Math.min(a[0], b[0]),
            y0: Math.min(a[1], b[1]),
            x1: Math.max(a[0], b[0]),
            y1: Math.max(a[1], b[1]),
        };
    };
    const gGroups = [...graphty.groups];
    /** graphty's annotations the oracle draws as a group box. */
    const shapesDrawn = new Set<number>();
    // graphty's shape annotations, in the oracle's frame: a box the program draws around nodes is drawn by graphty
    // when graphty draws the file's annotation there (a Cytoscape shape annotation behind a few nodes)
    const gShapes = graphty.strays.filter((s) => s.kind === "shape").map((s) => ({ s, box: toO(s.box) }));
    // the words of a group that is graphty's annotation are judged with the other free words
    const annotatedTexts: PText[] = [];
    for (const o of [...oracle.groups].sort((a, b) => cmp(a.id, b.id))) {
        let k = gGroups.findIndex((g) => g.id === o.id);
        if (k < 0) {
            let best = 0;
            gGroups.forEach((g, i) => {
                const v = iou(toBox(toO(g.box)), toBox(o.box));
                if (v > best + 1e-12) {
                    best = v;
                    k = i;
                }
            });
            if (best < 0.3) {
                k = -1;
            }
        }
        const g = k >= 0 ? gGroups.splice(k, 1)[0] : undefined;
        const shape = g === undefined ? annotationOver(o.box, gShapes) : undefined;
        if (shape !== undefined) {
            shapesDrawn.add(shape.s.index);
            j.add("group.present", "group", o.id, 0, o.id, shape.s.tag);
            const vs = iou(toBox(shape.box), toBox(o.box));
            j.add("group.box", "group", o.id, Math.max(0, T.groupIoU - vs), 1, R(vs));
            if (o.label !== null) {
                annotatedTexts.push(o.label);
            }
            continue;
        }
        j.add("group.present", "group", o.id, g === undefined ? 1 : 0, o.id, g?.id ?? null);
        if (g === undefined) {
            continue;
        }
        const v = iou(toBox(toO(g.box)), toBox(o.box));
        j.add("group.box", "group", o.id, Math.max(0, T.groupIoU - v), 1, R(v));
        judgeFill(j, "group.fill", "group", o.id, o.fill, g.fill);
        if (o.stroke !== null && g.stroke !== null) {
            j.add(
                "group.strokeWidth",
                "group",
                o.id,
                ratioMiss((g.stroke.width * lengthScale) / o.stroke.width, T.strokeWidthRatio),
                o.stroke.width,
                g.stroke.width * lengthScale,
            );
        } else if ((o.stroke === null) !== (g.stroke === null)) {
            j.add("group.strokeWidth", "group", o.id, 1, o.stroke?.width ?? 0, (g.stroke?.width ?? 0) * lengthScale);
        }
        if (o.label !== null || g.label !== null) {
            j.add(
                "group.label",
                "group",
                o.id,
                norm(o.label?.content ?? "") === norm(g.label?.content ?? "") ? 0 : 1,
                o.label?.content ?? null,
                g.label?.content ?? null,
            );
        }
    }

    // a group box graphty draws that the oracle does not
    const extraGroups = new Set(gGroups);
    for (const g of oracle.nodesOnly === true ? [] : [...graphty.groups].sort((a, b) => cmp(a.id, b.id))) {
        j.add("group.extra", "group", `graphty:${g.id}`, extraGroups.has(g) ? 1 : 0, null, g.id);
    }

    // ---- strays and free text: a finding unless graphty drew an annotation over it
    const gAnn = graphty.strays.map((s) => toO(s.box));
    // every text graphty draws, in the oracle's frame: a node's or an edge's label the association did not pair
    // with its element (an edge it did not find, a node drawn with no body) is still drawn
    const gTexts = [
        ...graphty.nodes.map((n) => n.label),
        ...graphty.edges.map((e) => e.label),
        ...graphty.groups.map((g) => g.label),
        ...graphty.texts,
    ].flatMap((t) => (t === null || t.content === "" ? [] : [{ words: norm(t.content), box: toO(t.box) }]));
    const strays = [
        ...oracle.strays.map((s) => ({ tag: s.tag, box: s.box, fill: s.fill, stroke: s.stroke, text: s.text })),
        ...[...oracle.texts, ...annotatedTexts].map((t) => ({
            tag: "text",
            box: t.box,
            fill: null,
            stroke: null,
            text: t.content,
        })),
    ].map((s, i) => {
        const matched =
            gAnn.some((b) => iou(toBox(b), toBox(s.box)) >= T.strayIoU) ||
            (s.text !== null && textDrawn(s.text, s.box, gTexts));
        j.add(
            "stray.present",
            "stray",
            `${s.tag}#${String(i)}`,
            matched ? 0 : 1,
            s.text ?? s.fill ?? s.stroke,
            matched,
        );
        return { ...s, matched };
    });
    // an annotation graphty draws where the oracle draws nothing like it: a box, or words the oracle draws nowhere near
    const oBoxes = [
        ...oracle.strays.map((s) => s.box),
        ...oracle.texts.map((t) => t.box),
        ...oracle.groups.map((g) => g.box),
    ];
    const oTexts = [
        ...oracle.nodes.map((n) => n.label),
        ...oracle.edges.map((e) => e.label),
        ...oracle.groups.map((g) => g.label),
        ...oracle.texts,
    ].flatMap((t) => (t === null || t.content === "" ? [] : [{ words: norm(t.content), box: t.box }]));
    for (const s of oracle.nodesOnly === true ? [] : [...graphty.strays].sort((a, b) => a.index - b.index)) {
        const box = toO(s.box);
        const drawn =
            shapesDrawn.has(s.index) ||
            oBoxes.some((b) => iou(toBox(b), toBox(box)) >= T.strayIoU) ||
            (s.text !== null && textDrawn(s.text, box, oTexts));
        j.add("stray.extra", "stray", `graphty:${s.tag}#${String(s.index)}`, drawn ? 0 : 1, null, s.text ?? s.tag);
    }

    if (oracle.background !== null && graphty.background !== null) {
        j.add(
            "background",
            "graph",
            "background",
            Math.max(0, deltaE(oracle.background, graphty.background) - T.backgroundDeltaE),
            oracle.background,
            graphty.background,
        );
    }

    const properties = Object.fromEntries(
        ORACLE_PROPERTIES.map((p) => {
            const list = j.results.get(p) ?? [];
            const pass = list.filter((x) => x.pass).length;
            const worst = list
                .filter((x) => !x.pass)
                .sort((a, b) => b.miss - a.miss || cmp(a.id, b.id))
                .slice(0, 8);
            return [
                p,
                {
                    n: list.length,
                    pass,
                    passRate: list.length === 0 ? null : pass / list.length,
                    tolerance: TOLERANCE_TEXT[p],
                    worst,
                },
            ];
        }),
    ) as Record<OracleProperty, OraclePropertyResult>;

    const elements = [...j.failed]
        .map(([key, set]) => {
            const [kind, id] = key.split("\u0000");
            return {
                kind: kind as OracleReport["elements"][number]["kind"],
                id,
                failed: ORACLE_PROPERTIES.filter((p) => set.has(p)),
            };
        })
        .sort((a, b) => b.failed.length - a.failed.length || cmp(a.kind, b.kind) || cmp(a.id, b.id));

    // every failing element by property: one wrong element fails its sample, however many others pass
    const failures: OracleReport["failures"] = {};
    for (const p of ORACLE_PROPERTIES) {
        const ids = (j.results.get(p) ?? []).filter((x) => !x.pass).map((x) => x.id);
        if (ids.length > 0) {
            failures[p] = [...new Set(ids)].sort(cmp);
        }
    }

    return rounded({
        sample,
        standIn: options.standIn === true,
        verdict: { pass: elements.length === 0, failing: elements.length },
        failures,
        association,
        transform,
        counts: {
            oracleNodes: oracle.nodes.length,
            graphtyNodes: graphty.nodes.length,
            matchedNodes: pairs.length,
            oracleEdges: oracle.edges.length,
            graphtyEdges: graphty.edges.length,
            matchedEdges: edgePairs.length,
            oracleGroups: oracle.groups.length,
            graphtyGroups: graphty.groups.length,
            oracleStrays: oracle.strays.length,
            oracleTexts: oracle.texts.length,
            labelOverlap: labelOverlap(oracle, graphty),
        },
        properties,
        elements,
        unmatched: {
            oracleNodes: stillOracle.map((n) => n.id).sort(cmp),
            graphtyNodes: graphtyLeft.map((n) => n.id),
            oracleEdges: unmatchedOracleEdges,
            graphtyEdges: unmatchedGraphtyEdges,
        },
        strays,
    });
}

function labelOverlap(oracle: PScene, graphty: PScene): number | null {
    // each line, and a label as one text (a label wrapped at other words is read whole)
    const words = new Set(
        [
            ...oracle.nodes.flatMap((n) => (n.label ? [...n.label.content.split("\n"), n.label.content] : [])),
            ...oracle.texts.map((t) => t.content),
        ].map(norm),
    );
    const labels = graphty.nodes.flatMap((n) => (n.label && n.label.content !== "" ? [n.label.content] : []));
    return labels.length === 0
        ? null
        : labels.filter((l) => words.has(norm(l.split("\n")[0])) || words.has(norm(l))).length / labels.length;
}

function judgeFill(j: Judge, p: OracleProperty, kind: string, id: string, o: PNode["fill"], g: PNode["fill"]): void {
    if (o === null || g === null) {
        j.add(p, kind, id, (o === null) === (g === null) ? 0 : 1, o?.color ?? null, g?.color ?? null);
        return;
    }
    j.add(p, kind, id, Math.max(0, deltaE(o.color, g.color) - ORACLE_TOLERANCES.colorDeltaE), o.color, g.color);
}

function judgeLabel(
    j: Judge,
    kind: string,
    id: string,
    oracle: PText | null,
    g: PText | null,
    scale: number,
    angleToOracle: (deg: number) => number,
    frame: { o: PNode; g: PNode; vec: (v: Pt) => Pt; pixel: number } | null,
    geometry: boolean,
): void {
    const T = ORACLE_TOLERANCES;
    // A label under one render pixel is no label to a reader, on graphty's side (extract-scene.ts) and the oracle's.
    // A raster oracle (sigma) names the labels it drew but not their size (sizePx 0): those are shown.
    const legible = oracle !== null && (oracle.sizePx === 0 || oracle.sizePx / scale >= T.legibleFontPx);
    const o = legible ? oracle : null;
    j.add("label.present", kind, id, (o === null) === (g === null) ? 0 : 1, o?.content ?? null, g?.content ?? null);
    if (o === null || g === null) {
        return;
    }
    j.add("label.text", kind, id, norm(o.content) === norm(g.content) ? 0 : 1, o.content, g.content);
    if (!geometry) {
        return;
    }
    j.add(
        "label.size",
        kind,
        id,
        ratioMiss((g.sizePx * scale) / Math.max(o.sizePx, 1e-9), T.fontSizeRatio),
        o.sizePx,
        g.sizePx * scale,
    );
    j.add("label.weight", kind, id, Math.max(0, Math.abs(o.weight - g.weight) - T.fontWeight), o.weight, g.weight);
    j.add("label.style", kind, id, o.style === g.style ? 0 : 1, o.style, g.style);
    j.add("label.color", kind, id, Math.max(0, deltaE(o.color, g.color) - T.colorDeltaE), o.color, g.color);
    const turned = angleToOracle(g.rotation);
    const turn = ((((turned - o.rotation) % 360) + 540) % 360) - 180;
    j.add("label.rotation", kind, id, Math.max(0, Math.abs(turn) - T.rotationDeg), o.rotation, turned);
    if (frame !== null) {
        const oc: Pt = [(o.box.x0 + o.box.x1) / 2 - frame.o.cx, (o.box.y0 + o.box.y1) / 2 - frame.o.cy];
        const gc = frame.vec([(g.box.x0 + g.box.x1) / 2 - frame.g.cx, (g.box.y0 + g.box.y1) / 2 - frame.g.cy]);
        const d = Math.hypot(oc[0] - gc[0], oc[1] - gc[1]);
        const near = Math.max(T.labelOffsetOfSize * o.sizePx, frame.pixel);
        j.add("label.offset", kind, id, Math.max(0, d / near - 1), oc, gc);
    }
}
