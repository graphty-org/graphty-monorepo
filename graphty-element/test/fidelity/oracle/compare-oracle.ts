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
    type PGroup,
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
    opacity: 0.1,
    strokeWidthRatio: [0.67, 1.5],
    /** An outline under this many oracle pixels and none at all are the same to a reader. */
    hairline: 0.25,
    fontSizeRatio: [0.8, 1.25],
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
    background: `deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}`,
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
                .map(([o, g]) => Math.max(o.w, o.h) / Math.max(g.w, g.h, 1e-9))
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
        const wr = (g.w * lengthScale) / Math.max(o.w, 1e-9);
        const hr = (g.h * lengthScale) / Math.max(o.h, 1e-9);
        j.add("node.width", "node", id, ratioMiss(wr, T.sizeRatio), o.w, g.w * lengthScale);
        j.add("node.height", "node", id, ratioMiss(hr, T.sizeRatio), o.h, g.h * lengthScale);
        if (o.shape !== null) {
            j.add("node.shape", "node", id, o.shape === g.shape ? 0 : 1, o.shape, g.shape);
        }
        judgeFill(j, "node.fill", "node", id, o.fill, g.fill);
        if (o.fill !== null && g.fill !== null) {
            j.add(
                "node.fillOpacity",
                "node",
                id,
                Math.max(0, Math.abs(o.fill.opacity - g.fill.opacity) - T.opacity),
                o.fill.opacity,
                g.fill.opacity,
            );
            j.add(
                "node.gradient",
                "node",
                id,
                (o.fill.gradient !== null) === (g.fill.gradient !== null) ? 0 : 1,
                o.fill.gradient !== null,
                g.fill.gradient !== null,
            );
        }
        // A stroke under the hairline is none, unless the other side draws one of a width within the
        // tolerance of it: two thin outlines either side of the line are the same outline.
        const close =
            o.stroke !== null &&
            g.stroke !== null &&
            o.stroke.width > 0 &&
            ratioMiss((g.stroke.width * lengthScale) / o.stroke.width, T.strokeWidthRatio) === 0;
        const os = o.stroke !== null && (close || o.stroke.width >= T.hairline) ? o.stroke : null;
        const gs = g.stroke !== null && (close || g.stroke.width * lengthScale >= T.hairline) ? g.stroke : null;
        if (os === null || gs === null) {
            j.add("node.stroke", "node", id, os === gs ? 0 : 1, os?.color ?? null, gs?.color ?? null);
        } else {
            const dE = deltaE(os.color, gs.color);
            j.add("node.stroke", "node", id, Math.max(0, dE - T.colorDeltaE), os.color, gs.color);
            j.add(
                "node.strokeWidth",
                "node",
                id,
                ratioMiss((gs.width * lengthScale) / os.width, T.strokeWidthRatio),
                os.width,
                gs.width * lengthScale,
            );
            j.add("node.strokeDash", "node", id, os.dashClass === gs.dashClass ? 0 : 1, os.dashClass, gs.dashClass);
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
    const unmatchedOracleEdges: string[] = [];
    for (const o of [...oracle.edges].sort((a, b) => cmp(a.id, b.id))) {
        const list = gEdges.get(pairKey(o.source, o.target));
        const g = list?.shift();
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
        // graphty's path, source end first, oriented the oracle's way
        let gp = g.points.map((p) => toOracle(p));
        const flipped = idMap.get(g.source) !== o.source;
        if (flipped) {
            gp = [...gp].reverse();
        }
        if (fit !== null && !(transform?.unrelatedLayout ?? false)) {
            const a = resample(o.points, T.pathSamples);
            const b = resample(gp, T.pathSamples);
            const d = frechet(a, b) / diag;
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
    const gGroups = [...graphty.groups];
    for (const o of [...oracle.groups].sort((a, b) => cmp(a.id, b.id))) {
        const toO = (g: PGroup): PBox => {
            const a = toOracle([g.box.x0, g.box.y0]);
            const b = toOracle([g.box.x1, g.box.y1]);
            return {
                x0: Math.min(a[0], b[0]),
                y0: Math.min(a[1], b[1]),
                x1: Math.max(a[0], b[0]),
                y1: Math.max(a[1], b[1]),
            };
        };
        let k = gGroups.findIndex((g) => g.id === o.id);
        if (k < 0) {
            let best = 0;
            gGroups.forEach((g, i) => {
                const v = iou(toBox(toO(g)), toBox(o.box));
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
        j.add("group.present", "group", o.id, g === undefined ? 1 : 0, o.id, g?.id ?? null);
        if (g === undefined) {
            continue;
        }
        const v = iou(toBox(toO(g)), toBox(o.box));
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
    const gAnn = graphty.strays.map((s) => {
        const a = toOracle([s.box.x0, s.box.y0]);
        const b = toOracle([s.box.x1, s.box.y1]);
        return {
            x0: Math.min(a[0], b[0]),
            y0: Math.min(a[1], b[1]),
            x1: Math.max(a[0], b[0]),
            y1: Math.max(a[1], b[1]),
        };
    });
    const strays = [
        ...oracle.strays.map((s) => ({ tag: s.tag, box: s.box, fill: s.fill, stroke: s.stroke, text: s.text })),
        ...oracle.texts.map((t) => ({ tag: "text", box: t.box, fill: null, stroke: null, text: t.content })),
    ].map((s, i) => {
        const matched = gAnn.some((b) => iou(toBox(b), toBox(s.box)) >= T.strayIoU);
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
            Math.max(0, deltaE(oracle.background, graphty.background) - T.colorDeltaE),
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
    o: PText | null,
    g: PText | null,
    scale: number,
    angleToOracle: (deg: number) => number,
    frame: { o: PNode; g: PNode; vec: (v: Pt) => Pt; diag: number } | null,
    geometry: boolean,
): void {
    const T = ORACLE_TOLERANCES;
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
