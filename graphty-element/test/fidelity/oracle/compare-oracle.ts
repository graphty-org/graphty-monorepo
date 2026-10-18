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
    compareIds,
    type PArrow,
    type PBox,
    type PEdge,
    type PNode,
    type PScene,
    type Pt,
    type PText,
} from "./primitives";

/** Every property the oracle comparison judges, in report order. */
export const ORACLE_PROPERTIES = [
    "node.present",
    "node.position",
    "node.width",
    "node.height",
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
    "edge.route",
    "edge.curve",
    "edge.color",
    "edge.width",
    "edge.opacity",
    "edge.dash",
    "edge.arrow",
    "edge.arrowLength",
    "edge.arrowWidth",
    "edge.label",
    "group.present",
    "group.box",
    "group.fill",
    "group.strokeWidth",
    "group.label",
    "stray.present",
    "background",
] as const;

export type OracleProperty = (typeof ORACLE_PROPERTIES)[number];

/**
 * The tolerances. Ratios are graphty's value (in oracle pixels) over the oracle's; distances are
 * fractions of the oracle drawing's diagonal; colors are CIEDE2000.
 */
export const ORACLE_TOLERANCES = {
    position: 0.01,
    /** A fit residual over this share of the diagonal relates unrelated layouts; sizes then use a size-fitted scale. */
    unrelatedLayout: 0.1,
    sizeRatio: [0.85, 1.18],
    colorDeltaE: 3,
    /**
     * A whole canvas is told apart at a smaller difference than one small mark: white against
     * whitesmoke (#f5f5f5) is 2.0.
     */
    backgroundDeltaE: 1,
    opacity: 0.1,
    strokeWidthRatio: [0.67, 1.5],
    /** An outline under this many oracle pixels and none at all are the same to a reader. */
    hairline: 0.25,
    fontSizeRatio: [0.8, 1.25],
    /** A label whose font is under this many render pixels is not shown (extract-scene.ts drops graphty's alike). */
    legibleFontPx: 1,
    /** CSS weight difference; 400 against 700 fails. */
    fontWeight: 150,
    rotationDeg: 5,
    labelOffset: 0.015,
    edgePath: 0.02,
    pathSamples: 32,
    /** A path whose farthest point from its chord is over this share of the chord is curved. */
    curvature: 0.04,
    edgeWidthRatio: [0.67, 1.5],
    arrowRatio: [0.67, 1.5],
    groupIoU: 0.8,
    strayIoU: 0.3,
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
    const stroke = n.stroke === null ? 0 : n.stroke.width * (side === "oracle" ? 1 : 2);
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
    "node.position": `center within ${String(ORACLE_TOLERANCES.position)} of the diagonal after the fit`,
    "node.width": `ratio in [${ORACLE_TOLERANCES.sizeRatio.join(", ")}]`,
    "node.height": `ratio in [${ORACLE_TOLERANCES.sizeRatio.join(", ")}]`,
    "node.shape": "same shape class, where the oracle's can be told",
    "node.fill": `both unfilled, or both filled within deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}`,
    "node.fillOpacity": `within ${String(ORACLE_TOLERANCES.opacity)}`,
    "node.gradient": "a gradient on both sides or on neither",
    "node.stroke": `both outlined within deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}, or neither (under ${String(ORACLE_TOLERANCES.hairline)} px is none)`,
    "node.strokeWidth": `ratio in [${ORACLE_TOLERANCES.strokeWidthRatio.join(", ")}]`,
    "node.strokeDash": "same dash class",
    "label.present": "a label on both sides or on neither",
    "label.text": "same words (whitespace folded)",
    "label.size": `font size ratio in [${ORACLE_TOLERANCES.fontSizeRatio.join(", ")}]`,
    "label.weight": `CSS weight within ${String(ORACLE_TOLERANCES.fontWeight)}`,
    "label.style": "same style (normal / italic)",
    "label.color": `deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}`,
    "label.rotation": `within ${String(ORACLE_TOLERANCES.rotationDeg)} degrees`,
    "label.offset": `label center relative to its node within ${String(ORACLE_TOLERANCES.labelOffset)} of the diagonal`,
    "edge.present": "every oracle edge is drawn by graphty",
    "edge.route": `Frechet distance within ${String(ORACLE_TOLERANCES.edgePath)} of the diagonal`,
    "edge.curve": `curved on both or straight on both (curvature ${String(ORACLE_TOLERANCES.curvature)})`,
    "edge.color": `deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}`,
    "edge.width": `ratio in [${ORACLE_TOLERANCES.edgeWidthRatio.join(", ")}]`,
    "edge.opacity": `within ${String(ORACLE_TOLERANCES.opacity)}`,
    "edge.dash": "same dash class",
    "edge.arrow": "an arrowhead at the same ends",
    "edge.arrowLength": `ratio in [${ORACLE_TOLERANCES.arrowRatio.join(", ")}]`,
    "edge.arrowWidth": `ratio in [${ORACLE_TOLERANCES.arrowRatio.join(", ")}]`,
    "edge.label": "same words",
    "group.present": "every oracle group box is drawn by graphty",
    "group.box": `intersection over union at least ${String(ORACLE_TOLERANCES.groupIoU)}`,
    "group.fill": `both unfilled, or deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}`,
    "group.strokeWidth": `ratio in [${ORACLE_TOLERANCES.strokeWidthRatio.join(", ")}]`,
    "group.label": "same words",
    "stray.present": `every unassociated oracle shape or text has a graphty annotation over it (IoU ${String(ORACLE_TOLERANCES.strayIoU)})`,
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
 * @returns the report, rounded
 */
export function compareOracle(
    sample: string,
    oracle: PScene,
    graphty: PScene,
    association: unknown = null,
    options: { mirror?: boolean } = {},
): OracleReport {
    const T = ORACLE_TOLERANCES;
    const diag = Math.hypot(oracle.width, oracle.height);
    const j = new Judge();

    // ---- nodes: by id, then by unique label text for the rest
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
    const stillOracle: PNode[] = [];
    for (const o of unmatchedOracle) {
        const k = labelKey(o);
        const gs = k === null ? undefined : freeG.get(k);
        if (gs?.length === 1 && unmatchedOracle.filter((x) => labelKey(x) === k).length === 1) {
            pairs.push([o, gs[0]]);
            gById.delete(gs[0].id);
            freeG.delete(k ?? "");
        } else {
            stillOracle.push(o);
        }
    }
    pairs.sort(([a], [b]) => cmp(a.id, b.id));
    const idMap = new Map(pairs.map(([o, g]) => [g.id, o.id]));

    // ---- the frame
    const fit =
        pairs.length >= 2
            ? fitSimilarity(
                  pairs.map(([, g]): Pt => [g.cx, g.cy]),
                  pairs.map(([o]): Pt => [o.cx, o.cy]),
                  { reflect: options.mirror === true },
              )
            : null;
    let transform: OracleReport["transform"] = null;
    let lengthScale = 1;
    if (fit !== null) {
        const rms = Math.sqrt(fit.sse / pairs.length) / diag;
        const unrelated = rms > T.unrelatedLayout;
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
        };
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

    for (const o of [...oracle.nodes].sort((a, b) => cmp(a.id, b.id))) {
        const g = pairs.find(([x]) => x === o)?.[1];
        j.add("node.present", "node", o.id, g === undefined ? 1 : 0, o.id, g?.id ?? null);
    }
    for (const [o, g] of pairs) {
        const { id } = o;
        const c = toOracle([g.cx, g.cy]);
        j.add(
            "node.position",
            "node",
            id,
            Math.max(0, Math.hypot(c[0] - o.cx, c[1] - o.cy) / diag - T.position),
            [o.cx, o.cy],
            c,
        );
        const [ow, oh] = outerOf(o, "oracle");
        const [gw, gh] = outerOf(g, "graphty").map((v) => v * lengthScale);
        j.add("node.width", "node", id, ratioMiss(gw / Math.max(ow, 1e-9), T.sizeRatio), ow, gw);
        j.add("node.height", "node", id, ratioMiss(gh / Math.max(oh, 1e-9), T.sizeRatio), oh, gh);
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
            j.add(
                "node.gradient",
                "node",
                id,
                (oFill.gradient !== null) === (gFill.gradient !== null) ? 0 : 1,
                oFill.gradient !== null,
                gFill.gradient !== null,
            );
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
            // ponytail: a zigzag, sine wave or double line read off a filled outline names no dash class, and graphty
            // draws the first two solid; judging them needs a pattern class both sides can be read into.
            if (os.patterned !== true) {
                j.add("node.strokeDash", "node", id, os.dashClass === gs.dashClass ? 0 : 1, os.dashClass, gs.dashClass);
            }
        }
        judgeLabel(
            j,
            "node",
            id,
            o.label,
            g.label,
            lengthScale,
            angleToOracle,
            fit === null ? null : { o, g, vec: vecToOracle, diag },
            oracle.labelGeometry !== false,
        );
    }

    // ---- edges: by endpoint pair (unordered), in id order within a pair
    const pairKey = (a: string, b: string): string => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);
    const gEdges = new Map<string, PEdge[]>();
    for (const e of graphty.edges) {
        const k = pairKey(idMap.get(e.source) ?? `g:${e.source}`, idMap.get(e.target) ?? `g:${e.target}`);
        gEdges.set(k, [...(gEdges.get(k) ?? []), e]);
    }
    const edgePairs: [PEdge, PEdge][] = [];
    const oById = new Map(oracle.nodes.map((n) => [n.id, n]));
    const unmatchedOracleEdges: string[] = [];
    // graphty's path in the oracle's frame, source end first the oracle's way
    const routeOf = (o: PEdge, g: PEdge): Pt[] => {
        const gp = g.points.map((p) => toOracle(p));
        return idMap.get(g.source) === o.source ? gp : [...gp].reverse();
    };
    // Parallel edges are paired in id order, except that an edge whose route would fail goes to one whose route
    // passes (the fanned one to the fanned one) where the layouts agree; routes drawn alike (two straight edges
    // over one another) say nothing about which is which, and then the edge with the same label words is its pair.
    // How far graphty's route is from the oracle's, over the diagonal: the whole lines, or only the parts between
    // the nodes, whichever agree better, since one program starts its line at the node's center under the node
    // and another at its border.
    const routeGap = (o: PEdge, gp: readonly Pt[]): number => {
        const ends = [oById.get(o.source), oById.get(o.target)] as const;
        const whole = frechet(resample(o.points, T.pathSamples), resample(gp, T.pathSamples));
        const visible = frechet(
            resample(clipToNodes(o.points, ...ends), T.pathSamples),
            resample(clipToNodes(gp, ...ends), T.pathSamples),
        );
        return Math.min(whole, visible) / diag;
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
        const gaps = list.map((g) => (framed ? routeGap(o, routeOf(o, g)) : 0));
        const passes = (k: number): boolean => gaps[k] <= T.edgePath;
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
        return alike[sameWords(o, alike.map((k) => list[k]))];
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
    for (const [o, g] of edgePairs) {
        const { id } = o;
        const gp = routeOf(o, g);
        const flipped = idMap.get(g.source) !== o.source;
        if (fit !== null && !(transform?.unrelatedLayout ?? false)) {
            const d = routeGap(o, gp);
            j.add("edge.route", "edge", id, Math.max(0, d - T.edgePath), R(d, 4), null);
        }
        const oc = curvatureOf(o.points) > T.curvature;
        const gc = curvatureOf(gp) > T.curvature;
        j.add("edge.curve", "edge", id, oc === gc ? 0 : 1, oc ? "curved" : "straight", gc ? "curved" : "straight");
        if (o.stroke !== null && g.stroke !== null) {
            j.add(
                "edge.color",
                "edge",
                id,
                Math.max(0, deltaE(o.stroke.color, g.stroke.color) - T.colorDeltaE),
                o.stroke.color,
                g.stroke.color,
            );
            j.add(
                "edge.width",
                "edge",
                id,
                ratioMiss((g.stroke.width * lengthScale) / Math.max(o.stroke.width, 1e-9), T.edgeWidthRatio),
                o.stroke.width,
                g.stroke.width * lengthScale,
            );
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
                o.stroke.dashClass === g.stroke.dashClass ? 0 : 1,
                o.stroke.dashClass,
                g.stroke.dashClass,
            );
        }
        const flip = (a: PArrow): PArrow => (flipped ? { ...a, end: a.end === "source" ? "target" : "source" } : a);
        const ga = g.arrows.map(flip);
        for (const end of ["source", "target"] as const) {
            const oa = o.arrows.find((a) => a.end === end);
            const gg = ga.find((a) => a.end === end);
            j.add(
                "edge.arrow",
                "edge",
                `${id}@${end}`,
                (oa === undefined) === (gg === undefined) ? 0 : 1,
                oa !== undefined,
                gg !== undefined,
            );
            if (oa !== undefined && gg !== undefined) {
                j.add(
                    "edge.arrowLength",
                    "edge",
                    `${id}@${end}`,
                    ratioMiss((gg.length * lengthScale) / Math.max(oa.length, 1e-9), T.arrowRatio),
                    oa.length,
                    gg.length * lengthScale,
                );
                j.add(
                    "edge.arrowWidth",
                    "edge",
                    `${id}@${end}`,
                    ratioMiss((gg.width * lengthScale) / Math.max(oa.width, 1e-9), T.arrowRatio),
                    oa.width,
                    gg.width * lengthScale,
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

    return rounded({
        sample,
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
            graphtyNodes: [...gById.keys()].sort(cmp),
            oracleEdges: unmatchedOracleEdges,
            graphtyEdges: unmatchedGraphtyEdges,
        },
        strays,
    });
}

function labelOverlap(oracle: PScene, graphty: PScene): number | null {
    const words = new Set(
        [
            ...oracle.nodes.flatMap((n) => (n.label ? n.label.content.split("\n") : [])),
            ...oracle.texts.map((t) => t.content),
        ].map(norm),
    );
    const labels = graphty.nodes.flatMap((n) =>
        n.label && n.label.content !== "" ? [norm(n.label.content.split("\n")[0])] : [],
    );
    return labels.length === 0 ? null : labels.filter((l) => words.has(l)).length / labels.length;
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
    frame: { o: PNode; g: PNode; vec: (v: Pt) => Pt; diag: number } | null,
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
        const d = Math.hypot(oc[0] - gc[0], oc[1] - gc[1]) / frame.diag;
        j.add("label.offset", kind, id, Math.max(0, d - T.labelOffset), oc, gc);
    }
}
