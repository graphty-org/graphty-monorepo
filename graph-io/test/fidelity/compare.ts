/**
 * The style fidelity comparer: scores one scene (graphty-element's drawing, or a second reference)
 * against a reference scene, property by property, after fitting one similarity transform between
 * their node centers. Pure TypeScript with no DOM or Node imports, so it runs in the graphty-element
 * browser test and in Node (`compare.test.ts`).
 *
 * `compareSample` scores graphty-element against every reference route of a sample, takes each
 * property from the highest-ranked route that carries it, and checks each multi-hop route against
 * the direct one, so a route's own losses are visible beside the scores they would have judged.
 */
import type { RouteId } from "./routes.js";
import {
    type Box,
    type Color,
    PROPERTIES,
    type Property,
    type Scene,
    type SceneEdge,
    type SceneNode,
} from "./scene.js";
import { THRESHOLDS } from "./thresholds.js";

export type Status = "pass" | "fail" | "unjudged" | "gap" | "degenerate";

/** `ref ~ scale * R(rotation) * (reflect ? mirror-y(p) : p) + (tx, ty)`, mapping the subject onto the reference. */
export interface Transform {
    scale: number;
    /** Radians. */
    rotation: number;
    reflect: boolean;
    tx: number;
    ty: number;
    /** Root mean square residual of the matched centers, over the reference diagonal. */
    rms: number;
}

/** One judged element: its metric value, the reference's value and the subject's. */
export interface Judged {
    id: string;
    value: number | string;
    ref: unknown;
    got: unknown;
}

export interface PropertyResult {
    status: Status;
    /** Elements (or pairs, for zOrder) judged. */
    n: number;
    /** Share of judged elements within threshold; 0 for a gap, null when nothing could be judged. */
    passRate: number | null;
    /** The five failing elements furthest from passing. */
    worst: Judged[];
    /** Why the status is not a plain pass or fail, or the aggregate value (zOrder's tau). */
    note?: string;
}

export interface Counts {
    refNodes: number;
    subjectNodes: number;
    matchedNodes: number;
    refEdges: number;
    subjectEdges: number;
    matchedEdges: number;
    /** Matched with source and target swapped. */
    reversedEdges: number;
    /** Up to five ids from each unmatched list. */
    unmatchedRefNodes: string[];
    unmatchedSubjectNodes: string[];
    unmatchedRefEdges: string[];
    /** Subject edges with no reference edge, for example graph-io's `graphty.pair` mates. */
    extraSubjectEdges: number;
}

export interface SceneComparison {
    transform: Transform | null;
    counts: Counts;
    properties: Record<Property, PropertyResult>;
}

interface CompareOptions {
    /** Subject node id to reference node id, for routes that name nodes by another column. */
    idMap?: ReadonlyMap<string, string>;
}

type Pt = [number, number];

// ---------------------------------------------------------------- color difference (CIEDE2000)

/**
 * CIELAB (D65) of an sRGB hex color.
 * @param hex - `#rrggbb`
 * @returns L, a, b
 */
function hexToLab(hex: Color): [number, number, number] {
    const n = Number.parseInt(hex.slice(1, 7), 16);
    const lin = (c: number): number => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    const r = lin((n >> 16) & 255);
    const g = lin((n >> 8) & 255);
    const b = lin(n & 255);
    const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
    const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
    const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
    const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

const rad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * CIEDE2000 color difference (Sharma, Wu and Dalal 2005), kL = kC = kH = 1.
 * @param lab1 - first color, CIELAB
 * @param lab2 - second color, CIELAB
 * @returns delta E 2000
 */
export function ciede2000(lab1: readonly number[], lab2: readonly number[]): number {
    const [l1, a1, b1] = lab1;
    const [l2, a2, b2] = lab2;
    const p7 = (c: number): number => Math.sqrt(c ** 7 / (c ** 7 + 25 ** 7));
    const g = 0.5 * (1 - p7((Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2));
    const a1p = (1 + g) * a1;
    const a2p = (1 + g) * a2;
    const c1 = Math.hypot(a1p, b1);
    const c2 = Math.hypot(a2p, b2);
    const hue = (b: number, a: number): number => {
        if (a === 0 && b === 0) {
            return 0;
        }
        const h = (Math.atan2(b, a) * 180) / Math.PI;
        return h < 0 ? h + 360 : h;
    };
    const h1 = hue(b1, a1p);
    const h2 = hue(b2, a2p);
    const chromatic = c1 * c2 !== 0;
    let dh = 0;
    let hMean = h1 + h2;
    if (chromatic) {
        dh = h2 - h1;
        if (dh > 180) {
            dh -= 360;
        } else if (dh < -180) {
            dh += 360;
        }
        if (Math.abs(h1 - h2) <= 180) {
            hMean = (h1 + h2) / 2;
        } else {
            hMean = h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2;
        }
    }
    const dL = l2 - l1;
    const dC = c2 - c1;
    const dH = 2 * Math.sqrt(c1 * c2) * Math.sin(rad(dh / 2));
    const lMean = (l1 + l2) / 2;
    const cMean = (c1 + c2) / 2;
    const t =
        1 -
        0.17 * Math.cos(rad(hMean - 30)) +
        0.24 * Math.cos(rad(2 * hMean)) +
        0.32 * Math.cos(rad(3 * hMean + 6)) -
        0.2 * Math.cos(rad(4 * hMean - 63));
    const dTheta = 30 * Math.exp(-(((hMean - 275) / 25) ** 2));
    const rt = -Math.sin(rad(2 * dTheta)) * 2 * p7(cMean);
    const sl = 1 + (0.015 * (lMean - 50) ** 2) / Math.sqrt(20 + (lMean - 50) ** 2);
    const sc = 1 + 0.045 * cMean;
    const sh = 1 + 0.015 * cMean * t;
    return Math.sqrt((dL / sl) ** 2 + (dC / sc) ** 2 + (dH / sh) ** 2 + rt * (dC / sc) * (dH / sh));
}

/**
 * CIEDE2000 between two hex colors.
 * @param a - `#rrggbb`
 * @param b - `#rrggbb`
 * @returns delta E 2000
 */
export function deltaE(a: Color, b: Color): number {
    return ciede2000(hexToLab(a), hexToLab(b));
}

// ---------------------------------------------------------------- geometry

/**
 * Fits the similarity transform (Umeyama, reflection allowed) taking `from` onto `to`. In 2D the
 * least-squares rotation and scale have a closed form over complex numbers; the reflected fit is
 * the same over the mirrored points, and the one with the smaller residual wins.
 * @param from - subject points
 * @param to - reference points, same length and order
 * @returns the transform (rms in reference units), or null when either side has no spread
 */
export function fitSimilarity(
    from: readonly Pt[],
    to: readonly Pt[],
): (Omit<Transform, "rms"> & { sse: number }) | null {
    const n = from.length;
    if (n < 2) {
        return null;
    }
    const mean = (ps: readonly Pt[]): Pt => [
        ps.reduce((s, p) => s + p[0], 0) / n,
        ps.reduce((s, p) => s + p[1], 0) / n,
    ];
    const [tx0, ty0] = mean(to);
    const centeredTo = to.map(([x, y]): Pt => [x - tx0, y - ty0]);
    const spreadTo = centeredTo.reduce((s, [x, y]) => s + x * x + y * y, 0);
    let best: (Omit<Transform, "rms"> & { sse: number }) | null = null;
    for (const reflect of [false, true]) {
        const pts = from.map(([x, y]): Pt => [x, reflect ? -y : y]);
        const [fx0, fy0] = mean(pts);
        const a = pts.map(([x, y]): Pt => [x - fx0, y - fy0]);
        const spread = a.reduce((s, [x, y]) => s + x * x + y * y, 0);
        if (spread <= 1e-12 * Math.max(1, spreadTo) || spreadTo <= 1e-12) {
            return null;
        }
        // z = sum(conj(a) * b) / sum(|a|^2)
        let re = 0;
        let im = 0;
        for (let i = 0; i < n; i++) {
            const [ax, ay] = a[i];
            const [bx, by] = centeredTo[i];
            re += ax * bx + ay * by;
            im += ax * by - ay * bx;
        }
        re /= spread;
        im /= spread;
        let sse = 0;
        for (let i = 0; i < n; i++) {
            const [ax, ay] = a[i];
            const [bx, by] = centeredTo[i];
            sse += (re * ax - im * ay - bx) ** 2 + (im * ax + re * ay - by) ** 2;
        }
        if (best === null || sse < best.sse - 1e-9 * spreadTo) {
            best = {
                scale: Math.hypot(re, im),
                rotation: Math.atan2(im, re),
                reflect,
                tx: tx0 - (re * fx0 - im * fy0),
                ty: ty0 - (im * fx0 + re * fy0),
                sse,
            };
        }
    }
    return best;
}

/**
 * Applies a transform to a point.
 * @param t - the transform
 * @param p - the subject point
 * @returns the point in reference units
 */
export function apply(t: Omit<Transform, "rms">, p: readonly number[]): Pt {
    const x = p[0];
    const y = t.reflect ? -p[1] : p[1];
    const c = t.scale * Math.cos(t.rotation);
    const s = t.scale * Math.sin(t.rotation);
    return [c * x - s * y + t.tx, s * x + c * y + t.ty];
}

/**
 * Resamples a polyline to `count` points evenly spaced by arc length, so the discrete Frechet
 * distance does not depend on how many vertices each side happened to write.
 * @param pts - the polyline
 * @param count - points to return
 * @returns the resampled polyline
 */
export function resample(pts: readonly Pt[], count: number): Pt[] {
    if (pts.length < 2) {
        return pts.map((p): Pt => [p[0], p[1]]);
    }
    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
        cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const total = cum.at(-1) ?? 0;
    const out: Pt[] = [];
    let seg = 1;
    for (let k = 0; k < count; k++) {
        const d = (total * k) / (count - 1);
        while (seg < pts.length - 1 && cum[seg] < d) {
            seg++;
        }
        const span = cum[seg] - cum[seg - 1];
        const f = span > 0 ? (d - cum[seg - 1]) / span : 0;
        const [x0, y0] = pts[seg - 1];
        const [x1, y1] = pts[seg];
        out.push([x0 + f * (x1 - x0), y0 + f * (y1 - y0)]);
    }
    return out;
}

/**
 * Discrete Frechet distance (Eiter and Mannila).
 * @param p - first polyline
 * @param q - second polyline
 * @returns the distance; Infinity when either is empty
 */
export function frechet(p: readonly Pt[], q: readonly Pt[]): number {
    const n = p.length;
    const m = q.length;
    if (n === 0 || m === 0) {
        return Number.POSITIVE_INFINITY;
    }
    const ca = new Float64Array(n * m);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
            const d = Math.hypot(p[i][0] - q[j][0], p[i][1] - q[j][1]);
            let prev: number;
            if (i === 0 && j === 0) {
                prev = 0;
            } else if (i === 0) {
                prev = ca[j - 1];
            } else if (j === 0) {
                prev = ca[(i - 1) * m];
            } else {
                prev = Math.min(ca[(i - 1) * m + j], ca[(i - 1) * m + j - 1], ca[i * m + j - 1]);
            }
            ca[i * m + j] = Math.max(prev, d);
        }
    }
    return ca[n * m - 1];
}

/**
 * Intersection over union of two boxes.
 * @param a - first box
 * @param b - second box
 * @returns 0..1
 */
export function iou(a: Box, b: Box): number {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    const inter = w > 0 && h > 0 ? w * h : 0;
    const union = a.w * a.h + b.w * b.h - inter;
    return union > 0 ? inter / union : 0;
}

/**
 * Jaccard index of two sets.
 * @param a - first set
 * @param b - second set
 * @returns 0..1 (1 for two empty sets)
 */
export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
    let inter = 0;
    for (const x of a) {
        if (b.has(x)) {
            inter++;
        }
    }
    const union = a.size + b.size - inter;
    return union === 0 ? 1 : inter / union;
}

const boxOf = (pts: readonly Pt[]): Box => {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
};

const transformBox = (t: Omit<Transform, "rms">, b: Box): Box =>
    boxOf(
        [
            [b.x, b.y],
            [b.x + b.w, b.y],
            [b.x, b.y + b.h],
            [b.x + b.w, b.y + b.h],
        ].map((p) => apply(t, p)),
    );

// ---------------------------------------------------------------- matching

interface Matching {
    nodes: [SceneNode, SceneNode][];
    /** Reference edge, subject edge, and whether the subject runs the other way. */
    edges: [SceneEdge, SceneEdge, boolean][];
    counts: Counts;
}

/**
 * Pairs the subject's nodes and edges with the reference's. Nodes match by id (through `idMap`);
 * an edge matches by id when its mapped ends agree too, else by (source, target, ordinal) among
 * that pair's parallel edges, else the same with source and target swapped.
 * @param ref - reference scene
 * @param subject - subject scene
 * @param idMap - subject node id to reference node id
 * @returns the pairs and the counts
 */
export function matchScenes(ref: Scene, subject: Scene, idMap?: ReadonlyMap<string, string>): Matching {
    const mapId = (id: string): string => idMap?.get(id) ?? id;
    const refNodes = new Map(ref.nodes.map((n) => [n.id, n]));
    const nodes: [SceneNode, SceneNode][] = [];
    const seen = new Set<string>();
    const unmatchedSubjectNodes: string[] = [];
    for (const s of subject.nodes) {
        const r = refNodes.get(mapId(s.id));
        if (r === undefined || seen.has(r.id)) {
            unmatchedSubjectNodes.push(s.id);
        } else {
            seen.add(r.id);
            nodes.push([r, s]);
        }
    }

    const edges: [SceneEdge, SceneEdge, boolean][] = [];
    const used = new Set<SceneEdge>();
    const taken = new Set<SceneEdge>();
    const take = (r: SceneEdge, s: SceneEdge, reversed: boolean): void => {
        edges.push([r, s, reversed]);
        used.add(s);
        taken.add(r);
    };
    const ends = (s: SceneEdge): [string, string] => [mapId(s.source), mapId(s.target)];
    const byId = new Map(subject.edges.map((e) => [e.id, e]));
    for (const r of ref.edges) {
        const s = byId.get(r.id);
        if (s !== undefined && !used.has(s)) {
            const [a, b] = ends(s);
            if (a === r.source && b === r.target) {
                take(r, s, false);
            } else if (a === r.target && b === r.source) {
                take(r, s, true);
            }
        }
    }
    const ordinalKeys = (list: readonly SceneEdge[], key: (e: SceneEdge) => string): Map<string, SceneEdge> => {
        const count = new Map<string, number>();
        const out = new Map<string, SceneEdge>();
        for (const e of list) {
            const k = key(e);
            const i = count.get(k) ?? 0;
            count.set(k, i + 1);
            out.set(`${k}\u0000${String(i)}`, e);
        }
        return out;
    };
    for (const reversed of [false, true]) {
        const refLeft = ordinalKeys(
            ref.edges.filter((e) => !taken.has(e)),
            (e) => `${e.source}\u0000${e.target}`,
        );
        const subLeft = ordinalKeys(
            subject.edges.filter((e) => !used.has(e)),
            (e) => {
                const [a, b] = ends(e);
                return reversed ? `${b}\u0000${a}` : `${a}\u0000${b}`;
            },
        );
        for (const [k, r] of refLeft) {
            const s = subLeft.get(k);
            if (s !== undefined) {
                take(r, s, reversed);
            }
        }
    }

    return {
        nodes,
        edges,
        counts: {
            refNodes: ref.nodes.length,
            subjectNodes: subject.nodes.length,
            matchedNodes: nodes.length,
            refEdges: ref.edges.length,
            subjectEdges: subject.edges.length,
            matchedEdges: edges.length,
            reversedEdges: edges.filter((e) => e[2]).length,
            unmatchedRefNodes: ref.nodes
                .filter((n) => !seen.has(n.id))
                .slice(0, 5)
                .map((n) => n.id),
            unmatchedSubjectNodes: unmatchedSubjectNodes.slice(0, 5),
            unmatchedRefEdges: ref.edges
                .filter((e) => !taken.has(e))
                .slice(0, 5)
                .map((e) => e.id),
            extraSubjectEdges: subject.edges.length - used.size,
        },
    };
}

/**
 * Kendall tau of drawing order over the node pairs whose reference boxes overlap and whose
 * reference z differs. A pair the subject draws at equal z counts as neither agreeing nor not.
 * @param pairs - matched (reference, subject) nodes
 * @returns tau and the number of pairs, or null when no pair overlaps
 */
export function zOrderTau(pairs: readonly [SceneNode, SceneNode][]): { tau: number; n: number } | null {
    let agree = 0;
    let disagree = 0;
    let n = 0;
    const box = (v: SceneNode): Box => ({ x: v.x - v.w / 2, y: v.y - v.h / 2, w: v.w, h: v.h });
    for (let i = 0; i < pairs.length; i++) {
        for (let j = i + 1; j < pairs.length; j++) {
            const [ri, si] = pairs[i];
            const [rj, sj] = pairs[j];
            if (ri.z === rj.z || iou(box(ri), box(rj)) === 0) {
                continue;
            }
            n++;
            const want = Math.sign(ri.z - rj.z);
            const got = Math.sign(si.z - sj.z);
            if (got === want) {
                agree++;
            } else if (got !== 0) {
                disagree++;
            }
        }
    }
    return n === 0 ? null : { tau: (agree - disagree) / n, n };
}

// ---------------------------------------------------------------- per-property judges

interface Verdict {
    value: number | string;
    /** How far from passing: larger is worse, 0 or less passes. */
    bad: number;
    pass: boolean;
    ref: unknown;
    got: unknown;
}

const within = (x: number, [lo, hi]: readonly [number, number]): boolean => x >= lo && x <= hi;
const logBad = (ratio: number): number => (Number.isFinite(ratio) && ratio > 0 ? Math.abs(Math.log(ratio)) : 1e9);

const equal = <T>(ref: T, got: T): Verdict => ({
    value: ref === got ? "equal" : String(got),
    bad: ref === got ? 0 : 1,
    pass: ref === got,
    ref,
    got,
});

const color = (ref: Color | null, got: Color | null): Verdict => {
    if (ref === null || got === null) {
        return { value: ref === got ? 0 : "missing", bad: ref === got ? 0 : 1e3, pass: ref === got, ref, got };
    }
    const d = deltaE(ref, got);
    return { value: d, bad: d, pass: d <= THRESHOLDS.colorDeltaE, ref, got };
};

const opacity = (ref: number, got: number): Verdict => {
    const d = Math.abs(ref - got);
    return { value: d, bad: d, pass: d <= THRESHOLDS.opacity, ref, got };
};

const ratio = (
    ref: number,
    got: number,
    scale: number,
    range: readonly [number, number],
    zeroEqual: boolean,
): Verdict => {
    if (ref === 0 || got === 0) {
        const same = zeroEqual && ref === 0 && got === 0;
        return { value: same ? 1 : "zero", bad: same ? 0 : 1e3, pass: same, ref, got };
    }
    const r = (got * scale) / ref;
    return { value: r, bad: logBad(r), pass: within(r, range), ref, got };
};

const visibleLabel = (n: SceneNode): SceneNode["label"] => (n.label?.visible === true && n.visible ? n.label : null);
const normText = (s: string | null | undefined): string | null => (s ? s.replace(/\s+/g, " ").trim() || null : null);

interface Ctx {
    t: Omit<Transform, "rms"> | null;
    diag: number;
}

type NodeJudge = (r: SceneNode, s: SceneNode, ctx: Ctx & { t: Omit<Transform, "rms"> }) => Verdict | null;
type EdgeJudge = (
    r: SceneEdge,
    s: SceneEdge,
    reversed: boolean,
    ctx: Ctx & { t: Omit<Transform, "rms"> },
) => Verdict | null;

/** Properties that need the fitted transform (its position or its scale). */
const NEEDS_TRANSFORM = new Set<Property>([
    "position",
    "size",
    "borderWidth",
    "fontSize",
    "edgeWidth",
    "edgePath",
    "groups",
    "annotations",
]);

const NODE_JUDGES: Partial<Record<Property, NodeJudge>> = {
    position: (r, s, { t, diag }) => {
        const [x, y] = apply(t, [s.x, s.y]);
        const d = Math.hypot(x - r.x, y - r.y) / diag;
        return { value: d, bad: d, pass: d <= THRESHOLDS.position, ref: [r.x, r.y], got: [x, y] };
    },
    size: (r, s, { t }) => {
        if (r.w <= 0 || r.h <= 0) {
            return null;
        }
        const rw = (s.w * t.scale) / r.w;
        const rh = (s.h * t.scale) / r.h;
        const worse = logBad(rw) >= logBad(rh) ? rw : rh;
        const pass = within(rw, THRESHOLDS.sizeRatio) && within(rh, THRESHOLDS.sizeRatio);
        return { value: worse, bad: logBad(worse), pass, ref: [r.w, r.h], got: [s.w, s.h] };
    },
    shape: (r, s) => equal(r.shape, s.shape),
    fill: (r, s) => color(r.fill, s.fill),
    // with no reference fill there is nothing for an opacity to apply to; `fill` judges the missing fill
    fillOpacity: (r, s) => (r.fill === null ? null : opacity(r.fillOpacity, s.fillOpacity)),
    borderColor: (r, s) => (r.border.width > 0 ? color(r.border.color, s.border.color) : null),
    borderWidth: (r, s, { t }) => ratio(r.border.width, s.border.width, t.scale, THRESHOLDS.borderWidthRatio, true),
    borderStyle: (r, s) => (r.border.width > 0 ? equal(r.border.style, s.border.style) : null),
    labelText: (r, s) => {
        const a = normText(visibleLabel(r)?.text);
        const b = normText(visibleLabel(s)?.text);
        return equal(a, b);
    },
    labelColor: (r, s) => {
        const a = visibleLabel(r);
        const b = visibleLabel(s);
        return a && b ? color(a.color, b.color) : null;
    },
    fontSize: (r, s, { t }) => {
        const a = visibleLabel(r);
        const b = visibleLabel(s);
        return a && b ? ratio(a.fontSize, b.fontSize, t.scale, THRESHOLDS.fontSizeRatio, true) : null;
    },
    labelPosition: (r, s) => {
        const a = visibleLabel(r);
        const b = visibleLabel(s);
        return a && b ? equal(a.position, b.position) : null;
    },
    visible: (r, s) => equal(r.visible, s.visible),
};

const EDGE_JUDGES: Partial<Record<Property, EdgeJudge>> = {
    edgeColor: (r, s) => color(r.color, s.color),
    edgeOpacity: (r, s) => opacity(r.opacity, s.opacity),
    edgeWidth: (r, s, _rev, { t }) => ratio(r.width, s.width, t.scale, THRESHOLDS.edgeWidthRatio, true),
    lineStyle: (r, s) => equal(r.style, s.style),
    arrows: (r, s, reversed) => {
        const got = reversed ? { source: s.arrow.target, target: s.arrow.source } : s.arrow;
        const pass = r.arrow.source === got.source && r.arrow.target === got.target;
        return { value: pass ? "equal" : `${got.source}/${got.target}`, bad: pass ? 0 : 1, pass, ref: r.arrow, got };
    },
    edgePath: (r, s, reversed, { t, diag }) => {
        if (r.points.length < 2 || s.points.length < 2) {
            return null;
        }
        const mapped = s.points.map((p) => apply(t, p));
        const got = reversed ? mapped.reverse() : mapped;
        const d = frechet(resample(r.points, THRESHOLDS.pathSamples), resample(got, THRESHOLDS.pathSamples)) / diag;
        return { value: d, bad: d, pass: d <= THRESHOLDS.edgePath, ref: r.points.length, got: s.points.length };
    },
    edgeLabel: (r, s) => equal(normText(r.label), normText(s.label)),
};

const summarize = (items: { id: string; v: Verdict }[]): PropertyResult => {
    if (items.length === 0) {
        return { status: "unjudged", n: 0, passRate: null, worst: [], note: "nothing comparable on either side" };
    }
    const passed = items.filter((i) => i.v.pass).length;
    const worst = items
        .filter((i) => !i.v.pass)
        .sort((a, b) => b.v.bad - a.v.bad)
        .slice(0, 5)
        .map(({ id, v }) => ({
            id,
            value: typeof v.value === "number" ? round(v.value) : v.value,
            ref: roundAll(v.ref),
            got: roundAll(v.got),
        }));
    return {
        status: passed === items.length ? "pass" : "fail",
        n: items.length,
        passRate: passed / items.length,
        worst,
    };
};

const round = (x: number): number => (Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : x);
const roundAll = (v: unknown): unknown => {
    if (typeof v === "number") {
        return round(v);
    }
    return Array.isArray(v) ? v.map(roundAll) : v;
};

/**
 * The reference drawing's diagonal: the extent of every node box.
 * @param scene - the reference scene
 * @returns the diagonal, 0 when it has no extent
 */
function diagonal(scene: Scene): number {
    if (scene.nodes.length === 0) {
        return 0;
    }
    const b = boxOf(
        scene.nodes.flatMap((n): Pt[] => [
            [n.x - n.w / 2, n.y - n.h / 2],
            [n.x + n.w / 2, n.y + n.h / 2],
        ]),
    );
    return Math.hypot(b.w, b.h);
}

/**
 * Scores the subject scene against one reference scene.
 * @param ref - the reference scene
 * @param subject - graphty-element's scene, or another route's
 * @param options - the id map
 * @returns the transform, the counts and a result per property
 */
export function compareScenes(ref: Scene, subject: Scene, options: CompareOptions = {}): SceneComparison {
    const m = matchScenes(ref, subject, options.idMap);
    const diag = diagonal(ref);
    const refGap = new Map(ref.gaps.map((g) => [g.property, g.reason]));
    const subGap = new Map(subject.gaps.map((g) => [g.property, g.reason]));
    const positionsUsable = !refGap.has("position") && !subGap.has("position");
    const fit =
        positionsUsable && diag > 0
            ? fitSimilarity(
                  m.nodes.map(([, s]) => [s.x, s.y]),
                  m.nodes.map(([r]) => [r.x, r.y]),
              )
            : null;
    const transform: Transform | null =
        fit === null
            ? null
            : {
                  scale: fit.scale,
                  rotation: fit.rotation,
                  reflect: fit.reflect,
                  tx: fit.tx,
                  ty: fit.ty,
                  rms: Math.sqrt(fit.sse / m.nodes.length) / diag,
              };
    const ctx = { t: transform, diag };

    const properties = {} as Record<Property, PropertyResult>;
    for (const p of PROPERTIES) {
        const carry = ref.canCarry[p] ?? "yes";
        if (carry !== "yes") {
            properties[p] = {
                status: "unjudged",
                n: 0,
                passRate: null,
                worst: [],
                note: `the ${ref.provenance.route} route cannot carry it (${carry})`,
            };
            continue;
        }
        const refReason = refGap.get(p);
        if (refReason !== undefined) {
            properties[p] = {
                status: "unjudged",
                n: 0,
                passRate: null,
                worst: [],
                note: `reference gap: ${refReason}`,
            };
            continue;
        }
        const subReason = subGap.get(p);
        if (subReason !== undefined && subject.provenance.side === "reference") {
            properties[p] = { status: "unjudged", n: 0, passRate: null, worst: [], note: `route gap: ${subReason}` };
            continue;
        }
        if (subReason !== undefined) {
            let n = p in EDGE_JUDGES ? m.edges.length : m.nodes.length;
            if (p === "groups") {
                n = ref.groups.length;
            }
            properties[p] = { status: "gap", n, passRate: 0, worst: [], note: `unmeasurable (API gap): ${subReason}` };
            continue;
        }
        if (NEEDS_TRANSFORM.has(p) && ctx.t === null) {
            properties[p] = positionsUsable
                ? {
                      status: "degenerate",
                      n: 0,
                      passRate: null,
                      worst: [],
                      note:
                          m.nodes.length < 2
                              ? "no alignment: fewer than 2 nodes matched"
                              : "no alignment: the matched node centers have no spread (all at one point)",
                  }
                : {
                      status: "unjudged",
                      n: 0,
                      passRate: null,
                      worst: [],
                      note: "no alignment: one side's positions are not comparable",
                  };
            continue;
        }
        properties[p] = judge(p, ref, subject, m, { t: ctx.t, diag }, options.idMap);
    }
    return { transform, counts: m.counts, properties };
}

/**
 * One property's result.
 * @param p - the property
 * @param ref - reference scene
 * @param subject - subject scene
 * @param m - the matching
 * @param ctx - transform and diagonal
 * @param idMap - subject id to reference id
 * @returns the result
 */
function judge(
    p: Property,
    ref: Scene,
    subject: Scene,
    m: Matching,
    ctx: Ctx,
    idMap?: ReadonlyMap<string, string>,
): PropertyResult {
    const t = ctx.t ?? { scale: 1, rotation: 0, reflect: false, tx: 0, ty: 0 };
    const full = { t, diag: ctx.diag };
    const nodeJudge = NODE_JUDGES[p];
    if (nodeJudge) {
        return summarize(
            m.nodes.flatMap(([r, s]) => {
                const v = nodeJudge(r, s, full);
                return v ? [{ id: r.id, v }] : [];
            }),
        );
    }
    const edgeJudge = EDGE_JUDGES[p];
    if (edgeJudge) {
        return summarize(
            m.edges.flatMap(([r, s, rev]) => {
                const v = edgeJudge(r, s, rev, full);
                return v ? [{ id: r.id, v }] : [];
            }),
        );
    }
    switch (p) {
        case "zOrder": {
            const z = zOrderTau(m.nodes);
            if (z === null) {
                return {
                    status: "unjudged",
                    n: 0,
                    passRate: null,
                    worst: [],
                    note: "no overlapping nodes at different depths",
                };
            }
            return {
                status: z.tau >= THRESHOLDS.zOrderTau ? "pass" : "fail",
                n: z.n,
                passRate: (z.tau + 1) / 2,
                worst: [],
                note: `Kendall tau ${String(round(z.tau))}`,
            };
        }
        case "groups": {
            const mapId = (id: string): string => idMap?.get(id) ?? id;
            const subGroups = new Map(subject.groups.map((g) => [mapId(g.id), g]));
            return summarize(
                ref.groups.map((r) => {
                    const s = subGroups.get(r.id);
                    if (s === undefined) {
                        return {
                            id: r.id,
                            v: { value: "missing", bad: 1e3, pass: false, ref: r.members.length, got: null },
                        };
                    }
                    const j = jaccard(new Set(r.members), new Set(s.members.map(mapId)));
                    const o = iou(r.bbox, transformBox(t, s.bbox));
                    const pass = j >= THRESHOLDS.groupJaccard && o >= THRESHOLDS.groupIoU;
                    return {
                        id: r.id,
                        v: {
                            value: `jaccard ${String(round(j))}, IoU ${String(round(o))}`,
                            bad: 2 - j - o,
                            pass,
                            ref: r.bbox,
                            got: s.bbox,
                        },
                    };
                }),
            );
        }
        case "annotations": {
            const subs = subject.annotations ?? [];
            return summarize(
                (ref.annotations ?? []).map((r, i) => {
                    const best = Math.max(
                        0,
                        ...subs.filter((s) => s.kind === r.kind).map((s) => iou(r.bbox, transformBox(t, s.bbox))),
                    );
                    return {
                        id: `${r.kind}#${String(i)}`,
                        v: {
                            value: best,
                            bad: 1 - best,
                            pass: best >= THRESHOLDS.groupIoU,
                            ref: r.text ?? r.kind,
                            got: null,
                        },
                    };
                }),
            );
        }
        case "background":
            return ref.background === undefined
                ? summarize([])
                : summarize([{ id: "background", v: color(ref.background, subject.background ?? null) }]);
        default:
            return { status: "unjudged", n: 0, passRate: null, worst: [], note: "no metric for this property" };
    }
}

// ---------------------------------------------------------------- per sample

/** How a route names nodes: by the file's id, or by a column the comparer must map through. */
const ROUTE_NODE_KEY: Partial<Record<RouteId, "name" | "label">> = {
    "cytoscape-desktop": "name",
    "cyjs-hop": "name",
    "cytoscape-gml": "label",
};

export interface SampleResult {
    sample: string;
    /** The reference routes used, best first. */
    references: RouteId[];
    /** The fit and counts against the first reference. */
    transform: Transform | null;
    counts: Counts;
    properties: Record<Property, PropertyResult & { judgedAgainst: RouteId | null }>;
    /** graphty-element against each reference separately. */
    byReference: Partial<Record<RouteId, SceneComparison>>;
    /** Each further reference route scored against the first, to check the route itself. */
    routeChecks: Partial<
        Record<RouteId, SceneComparison & { against: RouteId; ledger: Partial<Record<Property, string>> }>
    >;
    /** What the graphty side could not read. */
    gaps: Scene["gaps"];
}

/**
 * Whether a reference carries a property: its ledger says yes and it has no gap for it.
 * @param ref - the reference scene
 * @param p - the property
 * @returns true when it can judge the property
 */
const carries = (ref: Scene, p: Property): boolean =>
    (ref.canCarry[p] ?? "yes") === "yes" && !ref.gaps.some((g) => g.property === p);

/**
 * A map from a scene's own node ids into the label space, for comparing an id-named route with a
 * label-named one; labels that repeat are left out.
 * @param scene - the scene
 * @returns label to id inverted: id to label
 */
function labelIds(scene: Scene): Map<string, string> {
    const byLabel = new Map<string, string[]>();
    for (const n of scene.nodes) {
        const text = n.label?.text;
        if (text !== undefined) {
            byLabel.set(text, [...(byLabel.get(text) ?? []), n.id]);
        }
    }
    const out = new Map<string, string>();
    for (const [text, ids] of byLabel) {
        if (ids.length === 1) {
            out.set(ids[0], text);
        }
    }
    return out;
}

const invert = (m: ReadonlyMap<string, string>): Map<string, string> => new Map([...m].map(([k, v]) => [v, k]));

/**
 * Scores graphty-element's scene against a sample's reference scenes.
 * @param sample - the sample id
 * @param refs - the reference scenes, best route first
 * @param graphty - graphty-element's scene
 * @param graphtyKeys - graphty node id to its `name` and `label` columns, for routes that name nodes by them
 * @returns the sample's result
 */
export function compareSample(
    sample: string,
    refs: readonly Scene[],
    graphty: Scene,
    graphtyKeys: Partial<Record<"name" | "label", ReadonlyMap<string, string>>> = {},
): SampleResult {
    const byReference: SampleResult["byReference"] = {};
    for (const ref of refs) {
        const key = ROUTE_NODE_KEY[ref.provenance.route];
        byReference[ref.provenance.route] = compareScenes(ref, graphty, { idMap: key ? graphtyKeys[key] : undefined });
    }
    const properties = {} as SampleResult["properties"];
    for (const p of PROPERTIES) {
        const ref = refs.find((r) => carries(r, p));
        if (ref === undefined) {
            const why = refs.map(
                (r) => `${r.provenance.route}: ${r.gaps.find((g) => g.property === p)?.reason ?? r.canCarry[p] ?? "?"}`,
            );
            properties[p] = {
                judgedAgainst: null,
                status: "unjudged",
                n: 0,
                passRate: null,
                worst: [],
                note: `no reference carries it (${why.join("; ")})`,
            };
        } else {
            const comparison = byReference[ref.provenance.route] as SceneComparison;
            properties[p] = { judgedAgainst: ref.provenance.route, ...comparison.properties[p] };
        }
    }

    const routeChecks: SampleResult["routeChecks"] = {};
    const [direct, ...others] = refs;
    for (const other of others) {
        const a = ROUTE_NODE_KEY[direct.provenance.route];
        const b = ROUTE_NODE_KEY[other.provenance.route];
        let idMap: Map<string, string> | undefined;
        if (a !== b) {
            if (a === undefined && b === "label") {
                idMap = invert(labelIds(direct));
            } else {
                continue;
            }
        }
        const ledger: Partial<Record<Property, string>> = {};
        for (const p of PROPERTIES) {
            const c = other.canCarry[p] ?? "yes";
            if (c !== "yes") {
                ledger[p] = c;
            }
        }
        routeChecks[other.provenance.route] = {
            against: direct.provenance.route,
            ledger,
            ...compareScenes(direct, other, { idMap }),
        };
    }

    const first = byReference[direct.provenance.route] as SceneComparison;
    return {
        sample,
        references: refs.map((r) => r.provenance.route),
        transform: first.transform,
        counts: first.counts,
        properties,
        byReference,
        routeChecks,
        gaps: graphty.gaps,
    };
}
