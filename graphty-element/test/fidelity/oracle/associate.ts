/**
 * Associates an oracle SVG's raw primitives with graph elements -- nodes, edges, arrowheads,
 * labels and group boxes -- and records whatever is left as strays (a finding of its own: a
 * yellow annotation rectangle graphty never drew is a stray here).
 *
 * Where the program's markup names the element (Graphviz's `<g class="node"><title>`, Gephi's
 * `class="id_..."`), the name decides. Elsewhere (Cytoscape desktop's FreeHEP export, draw.io)
 * the drawing carries no ids, so graphty's own drawing of the same file is the guide: label text
 * pins a first similarity transform, each graphty node is projected into the oracle's frame, and
 * the closest closed shape of a matching size there is its body. Every choice is a sort with a
 * total order (cost, then id, then document order), so the same inputs always associate the same
 * way. Pure: no DOM.
 */
import { apply, fitSimilarity } from "../../../../graph-io/test/fidelity/compare";
import {
    boxOfPoints,
    compareIds,
    type PArrow,
    type PBox,
    type PEdge,
    type PGroup,
    type PNode,
    type Prim,
    type PScene,
    type PShape,
    type PStray,
    type Pt,
    type PText,
} from "./primitives";

type Similarity = NonNullable<ReturnType<typeof fitSimilarity>>;

const cx = (b: PBox): number => (b.x0 + b.x1) / 2;
const cy = (b: PBox): number => (b.y0 + b.y1) / 2;
const bw = (b: PBox): number => b.x1 - b.x0;
const bh = (b: PBox): number => b.y1 - b.y0;
const area = (b: PBox): number => Math.max(0, bw(b)) * Math.max(0, bh(b));
const union = (boxes: readonly PBox[]): PBox =>
    boxOfPoints(
        boxes.flatMap((b): Pt[] => [
            [b.x0, b.y0],
            [b.x1, b.y1],
        ]),
    );
const inside = (p: Pt, b: PBox, slack = 0): boolean =>
    p[0] >= b.x0 - slack && p[0] <= b.x1 + slack && p[1] >= b.y0 - slack && p[1] <= b.y1 + slack;
/**
 * Whether a point is inside a closed outline (even-odd).
 * @param q - the point
 * @param poly - the outline's points
 * @returns true inside
 */
function inPolygon(q: Pt, poly: readonly Pt[]): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if (yi > q[1] !== yj > q[1] && q[0] < ((xj - xi) * (q[1] - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}
/** How far from its edge, in the oracle's pixels, a line of the edge's label drawn apart from the rest is looked for. */
const END_LABEL_REACH = 60;
/** Distance from a point to a box (0 inside). */
const toBox = (p: Pt, b: PBox): number =>
    Math.hypot(Math.max(b.x0 - p[0], 0, p[0] - b.x1), Math.max(b.y0 - p[1], 0, p[1] - b.y1));
const norm = (s: string): string => s.replace(/\s+/g, " ").trim();
const median = (xs: readonly number[]): number => {
    const v = [...xs].sort((a, b) => a - b);
    return v.length === 0 ? 1 : v[Math.floor(v.length / 2)];
};
const byText = (a: PText, b: PText): number => a.y - b.y || a.x - b.x;

/**
 * The shape class a primitive draws.
 * @param p - a closed primitive
 * @returns the class, or null when it cannot be told
 */
export function shapeOf(p: Prim): PShape | null {
    if (p.tag === "ellipse" || p.tag === "circle") {
        return "ellipse";
    }
    if (p.tag === "rect") {
        return p.corners === 4 ? "rect" : "roundrect";
    }
    switch (p.corners) {
        case 3:
            return "triangle";
        case 4: {
            // a rectangle's corners sit on its box's corners, a diamond's on its sides; a four-sided shape with one or
            // two on the box's corners (a parallelogram, a chevron) is neither
            const b = p.box;
            // within 2% of the box: an absolute tolerance passes every corner of a node drawn a few units across
            const slack = 0.02 * Math.max(b.x1 - b.x0, b.y1 - b.y0);
            const near = (v: number, at: number): boolean => Math.abs(v - at) < slack;
            // each vertex once: a closed outline repeats its first point at its end
            const first = p.points[0];
            const last = p.points.at(-1);
            const vertices =
                p.points.length > 1 &&
                first !== undefined &&
                last !== undefined &&
                near(first[0], last[0]) &&
                near(first[1], last[1])
                    ? p.points.slice(0, -1)
                    : p.points;
            const onCorner = vertices.filter(
                ([x, y]) => (near(x, b.x0) || near(x, b.x1)) && (near(y, b.y0) || near(y, b.y1)),
            ).length;
            if (onCorner >= 3) {
                return "rect";
            }
            // every vertex of a four-sided outline touches its box; a diamond's touch it on its sides, none at a corner
            return onCorner === 0 ? "diamond" : "other";
        }
        case 6:
            return "hexagon";
        case 8:
            return "octagon";
        case 0:
            return null;
        default:
            return "other";
    }
}

/** A node built from the primitives that draw it. */
function nodeFrom(id: string, shapes: readonly Prim[], texts: readonly PText[]): PNode {
    const sorted = [...shapes].sort((a, b) => area(b.box) - area(a.box) || a.index - b.index);
    const body = sorted[0];
    // an image drawn over a node (a custom graphic) has no outline of its own: the shape is the largest drawn one
    const outline = sorted.find((s) => s.kind !== "image");
    const box = body
        ? union(sorted.filter((s) => area(s.box) >= 0.5 * area(body.box)).map((s) => s.box))
        : union(texts.map((t) => t.box));
    const filled = sorted.find((s) => s.fill !== null);
    const stroked = sorted.find((s) => s.stroke !== null);
    return {
        id,
        cx: cx(box),
        cy: cy(box),
        w: bw(box),
        h: bh(box),
        shape: outline ? shapeOf(outline) : null,
        fill: filled?.fill ?? null,
        stroke: stroked?.stroke ?? null,
        label: mergeTexts(texts),
    };
}

/**
 * Lines of one label, drawn as separate text elements, as one text.
 * @param texts - the lines
 * @returns the label, or null when there are none
 */
export function mergeTexts(texts: readonly PText[]): PText | null {
    if (texts.length === 0) {
        return null;
    }
    const lines = [...texts].sort(byText);
    const first = lines[0];
    const box = union(lines.map((t) => t.box));
    return { ...first, content: lines.map((t) => t.content).join("\n"), box, x: cx(box), y: cy(box) };
}

/**
 * How far an arrowhead reaches along its edge's end direction and across it.
 * @param outline - the arrowhead's drawn points
 * @param path - the edge's path, source end first
 * @param end - which end it caps
 * @param filled - whether it is filled
 * @returns the arrow
 */
export function measureArrow(
    outline: readonly Pt[],
    path: readonly Pt[],
    end: "source" | "target",
    filled: boolean,
): PArrow {
    const pts = end === "target" ? path : [...path].reverse();
    const tip = pts.at(-1) ?? [0, 0];
    const back = pts[Math.max(0, Math.floor(pts.length * 0.8) - 1)] ?? tip;
    let dx = tip[0] - back[0];
    let dy = tip[1] - back[1];
    const len = Math.hypot(dx, dy);
    const box = boxOfPoints(outline);
    if (len < 1e-9 || outline.length === 0) {
        // no direction: the arrow's own box
        return { end, length: Math.max(bw(box), bh(box), 0), width: Math.max(0, Math.min(bw(box), bh(box))), filled };
    }
    dx /= len;
    dy /= len;
    const along = outline.map(([x, y]) => x * dx + y * dy);
    const across = outline.map(([x, y]) => -x * dy + y * dx);
    return {
        end,
        length: Math.max(...along) - Math.min(...along),
        width: Math.max(...across) - Math.min(...across),
        filled,
    };
}

const arrowFrom = (p: Prim, path: readonly Pt[], end: "source" | "target"): PArrow =>
    measureArrow(p.points, path, end, p.fill !== null);

/**
 * A path carried on to the tip of the arrowhead at one end, when the program stopped the line at
 * the arrow's base (Graphviz does), so its route is judged to the same place graphty's is: graphty
 * reports an edge as ending at its arrow's tip.
 * @param path - the edge's path, source end first
 * @param outline - the arrowhead's points
 * @param end - which end it caps
 * @returns the path, extended when the tip lies beyond its end
 */
export function extendToTip(path: readonly Pt[], outline: readonly Pt[], end: "source" | "target"): Pt[] {
    const pts = end === "target" ? [...path] : [...path].reverse();
    const last = pts.at(-1);
    const back = pts[Math.max(0, Math.floor(pts.length * 0.8) - 1)];
    if (last === undefined || back === undefined || outline.length === 0) {
        return [...path];
    }
    const len = Math.hypot(last[0] - back[0], last[1] - back[1]);
    if (len < 1e-9) {
        return [...path];
    }
    const dx = (last[0] - back[0]) / len;
    const dy = (last[1] - back[1]) / len;
    const along = (q: Pt): number => (q[0] - last[0]) * dx + (q[1] - last[1]) * dy;
    const tip = [...outline].sort((a, b) => along(b) - along(a))[0];
    if (along(tip) > 0.5) {
        pts.push(tip);
    }
    return end === "target" ? pts : pts.reverse();
}

/**
 * Splits a Graphviz edge title (`a->b`, `a--b`, `a:port->b`) into its ends: the split, and the
 * port stripping, that name known nodes; an id may itself hold `->`, `--` or `:`.
 * @param title - the title
 * @param known - the node ids the drawing names
 * @returns the ends, or null
 */
function endsOfTitle(title: string, known: ReadonlySet<string>): [string, string] | null {
    const resolve = (s: string): string | null => {
        const t = s.trim();
        if (known.has(t)) {
            return t;
        }
        // a port is `node:port` or `node:port:compass`
        for (let i = t.lastIndexOf(":"); i > 0; i = t.lastIndexOf(":", i - 1)) {
            if (known.has(t.slice(0, i))) {
                return t.slice(0, i);
            }
        }
        return null;
    };
    let first: [string, string] | null = null;
    for (const m of title.matchAll(/->|--/g)) {
        const a = title.slice(0, m.index);
        const b = title.slice(m.index + 2);
        first ??= [a.trim(), b.trim()];
        const ra = resolve(a);
        const rb = resolve(b);
        if (ra !== null && rb !== null) {
            return [ra, rb];
        }
    }
    return first;
}

const longestPath = (prims: readonly Prim[]): Prim | undefined =>
    [...prims]
        .filter((p) => p.kind === "path" || (p.closed && p.fill === null))
        .sort((a, b) => pathLength(b.points) - pathLength(a.points) || a.index - b.index)[0];

function pathLength(pts: readonly Pt[]): number {
    let s = 0;
    for (let i = 1; i < pts.length; i++) {
        s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    }
    return s;
}

const sameBox = (a: PBox, b: PBox): boolean =>
    Math.abs(a.x0 - b.x0) <= 1 &&
    Math.abs(a.y0 - b.y0) <= 1 &&
    Math.abs(a.x1 - b.x1) <= 1 &&
    Math.abs(a.y1 - b.y1) <= 1;
/** The area a closed outline encloses (shoelace). */
function polygonArea(pts: readonly Pt[]): number {
    let s2 = 0;
    for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        s2 += x0 * y1 - x1 * y0;
    }
    return Math.abs(s2) / 2;
}
const boxOfNode = (n: PNode): PBox => ({
    x0: n.cx - n.w / 2,
    y0: n.cy - n.h / 2,
    x1: n.cx + n.w / 2,
    y1: n.cy + n.h / 2,
});

/**
 * The largest end cap that draws nothing beyond its line: a dot or square as wide as the line.
 * @param e - the edge
 * @returns the size in the side's pixels
 */
export function lineCapSize(e: PEdge): number {
    return 1.1 * (e.stroke?.width ?? 0) + 0.25;
}

/**
 * The geometric edge end a closed shape caps as an arrowhead, or null when it caps none. An
 * arrowhead sits at the end (its box within reach of the end point), is small beside its edge
 * (no longer than the line it ends, where the line is over a few pixels long) and holds no node: a group box or an annotation drawn near an
 * edge's end is none of those.
 * @param p - the shape
 * @param edges - the edges so far; only geometric ones (`#g` ids) are capped here
 * @param nodes - the drawn nodes
 * @returns the edge and the end, or null
 */
export function arrowheadEdge(
    p: Prim,
    edges: readonly PEdge[],
    nodes: readonly PNode[],
): { e: PEdge; end: "source" | "target" } | null {
    const size = Math.max(bw(p.box), bh(p.box));
    const c: Pt = [cx(p.box), cy(p.box)];
    if (
        nodes.some((n) => inside([n.cx, n.cy], p.box) || (inside(c, boxOfNode(n)) && size >= 0.5 * Math.min(n.w, n.h)))
    ) {
        return null;
    }
    let best: { e: PEdge; end: "source" | "target"; d: number } | null = null;
    for (const e of edges) {
        if (!e.id.includes("#g")) {
            continue;
        }
        for (const end of ["source", "target"] as const) {
            const q = end === "source" ? e.points[0] : (e.points.at(-1) ?? e.points[0]);
            const d = Math.hypot(c[0] - q[0], c[1] - q[1]);
            if (d <= size * 1.5 + 3 && (best === null || d < best.d)) {
                best = { e, end, d };
            }
        }
    }
    // the nearest end decides; a shape longer than that edge's own line (beyond a few pixels) is
    // something else drawn near it
    return best === null || size > Math.max(pathLength(best.e.points), 12) ? null : { e: best.e, end: best.end };
}

const strayOf = (p: Prim): PStray => ({
    index: p.index,
    tag: p.tag,
    kind: p.kind,
    box: p.box,
    fill: p.fill?.color ?? null,
    stroke: p.stroke?.color ?? null,
    text: p.text?.content ?? null,
});

/** How the oracle's primitives were associated: by the file's names, by geometry, or both. */
export interface Association {
    scene: PScene;
    /** "markup" when every node came from the program's own names, "geometry" when none did. */
    method: "markup" | "geometry" | "mixed";
    /** The graphty-to-oracle similarity that guided the geometric step, when one ran. */
    guide: { pairs: number; source: "nodes" | "labels" | "extent" | "label-anchors" } | null;
}

/**
 * Associates an oracle's primitives with graph elements.
 * @param prims - the oracle's primitives (`readSvgPrimitives`)
 * @param width - the oracle's rendered width
 * @param height - the oracle's rendered height
 * @param guide - graphty's drawing of the same file, in graphty pixels
 * @returns the oracle scene
 */
export function associate(prims: readonly Prim[], width: number, height: number, guide: PScene): Association {
    const used = new Set<number>();
    const take = (p: Prim): Prim => {
        used.add(p.index);
        return p;
    };

    // ---- background: a filled shape over (nearly) the whole canvas, before anything else is drawn
    let background: string | null = null;
    for (const p of prims) {
        if (p.kind === "shape" && p.fill !== null && area(p.box) >= 0.9 * width * height) {
            background ??= p.fill.color;
            take(p);
        }
    }

    // ---- what the markup names
    const hinted = new Map<string, Prim[]>();
    for (const p of prims) {
        if (p.hint !== null && p.hint.role !== "graph" && !used.has(p.index)) {
            const key = `${p.hint.role}\u0000${p.hint.key}`;
            hinted.set(key, [...(hinted.get(key) ?? []), p]);
        }
    }
    // The markup's ids as graphty's: Gephi writes a space in an id as "_" in its id class.
    const guideIds = new Set(guide.nodes.map((n) => n.id));
    const folded = new Map<string, string[]>();
    for (const g of guideIds) {
        const f = g.replace(/\s/g, "_");
        folded.set(f, [...(folded.get(f) ?? []), g]);
    }
    const resolveId = (raw: string): string => {
        if (guideIds.has(raw)) {
            return raw;
        }
        const hit = folded.get(raw.replace(/\s/g, "_"));
        return hit?.length === 1 ? hit[0] : raw;
    };
    const knownIds = new Set([...guideIds, ...prims.flatMap((p) => (p.hint?.role === "node" ? [p.hint.id] : []))]);
    const nodes = new Map<string, PNode>();
    const edges: PEdge[] = [];
    const groups: PGroup[] = [];
    const keys = [...hinted.keys()].sort();
    for (const key of keys) {
        const [role, id] = key.split("\u0000");
        const ps = hinted.get(key) ?? [];
        if (role === "node") {
            const shapes = ps.filter((p) => p.kind === "shape" || p.kind === "image");
            const nid = resolveId(ps[0]?.hint?.id ?? id);
            nodes.set(
                nid,
                nodeFrom(
                    nid,
                    shapes,
                    ps.flatMap((p) => (p.text ? [p.text] : [])),
                ),
            );
            ps.forEach(take);
        }
    }
    const edgeCount = new Map<string, number>();
    for (const key of keys) {
        const [role, id] = key.split("\u0000");
        const ps = hinted.get(key) ?? [];
        if (role === "edge") {
            const hint = ps[0]?.hint;
            const raw = hint?.ends ?? endsOfTitle(hint?.id ?? id, knownIds);
            const ends: [string, string] | null = raw === null ? null : [resolveId(raw[0]), resolveId(raw[1])];
            const line = longestPath(ps);
            if (ends === null || line === undefined) {
                continue;
            }
            ps.forEach(take);
            const pairId = `${ends[0]}->${ends[1]}`;
            const k = edgeCount.get(pairId) ?? 0;
            edgeCount.set(pairId, k + 1);
            const heads = ps.filter((p) => p !== line && p.kind === "shape");
            let { points } = line;
            const arrows = heads.map((h) => {
                const c: Pt = [cx(h.box), cy(h.box)];
                const a = line.points[0];
                const b = line.points.at(-1) ?? a;
                const end =
                    Math.hypot(c[0] - a[0], c[1] - a[1]) < Math.hypot(c[0] - b[0], c[1] - b[1]) ? "source" : "target";
                points = extendToTip(points, h.points, end);
                return arrowFrom(h, line.points, end);
            });
            edges.push({
                id: `${pairId}#${String(k)}`,
                source: ends[0],
                target: ends[1],
                points,
                stroke: line.stroke,
                arrows,
                label: mergeTexts(ps.flatMap((p) => (p.text ? [p.text] : []))),
            });
        } else if (role === "group") {
            const box = [...ps].filter((p) => p.kind === "shape").sort((a, b) => area(b.box) - area(a.box))[0];
            if (box === undefined) {
                continue;
            }
            ps.forEach(take);
            groups.push({
                id: ps[0]?.hint?.id ?? id,
                box: box.box,
                fill: box.fill,
                stroke: box.stroke,
                label: mergeTexts(ps.flatMap((p) => (p.text ? [p.text] : []))),
                members: [],
            });
        }
    }
    const fromMarkup = nodes.size;

    // ---- geometry, guided by graphty's drawing, for what the markup did not name
    const free = (): Prim[] => prims.filter((p) => !used.has(p.index));
    const guideNodes = guide.nodes.filter((n) => !nodes.has(n.id));
    let guideInfo: Association["guide"] = null;
    if (guideNodes.length > 0) {
        const seed = seedTransform(guide, nodes, free(), width, height);
        const pool = free();
        // Through one frame: graphty's drawing carried into the oracle's, refitted once on the
        // bodies it finds.
        let framed = new Map<string, Prim[]>();
        if (seed !== null) {
            framed = matchBodies(guideNodes, pool, through(seed.t));
            const pairs = [...framed].map(([id, shapes]) => {
                const g = guideNodes.find((n) => n.id === id);
                const box = union(shapes.map((q) => q.box));
                return { from: [g?.cx ?? 0, g?.cy ?? 0] as Pt, to: [cx(box), cy(box)] as Pt };
            });
            const refit =
                pairs.length >= 3
                    ? fitSimilarity(
                          pairs.map((q) => q.from),
                          pairs.map((q) => q.to),
                      )
                    : null;
            if (refit !== null) {
                framed = matchBodies(guideNodes, pool, through(refit));
            }
        }
        // At each node's own label, wherever the program put it: what holds when the program laid
        // the graph out otherwise, or drew its labels elsewhere relative to its nodes.
        let anchored = new Map<string, Prim[]>();
        if (seed !== null && seed.anchors.size > 0) {
            const { anchors } = seed;
            const textScale = median(
                guideNodes.flatMap((n) => {
                    const at = anchors.get(n.id)?.text;
                    return at && n.label && n.label.sizePx > 0 ? [at.sizePx / n.label.sizePx] : [];
                }),
            );
            anchored = matchBodies(guideNodes, pool, (n) => {
                const at = anchors.get(n.id);
                return at === undefined
                    ? null
                    : { x: cx(at.box), y: cy(at.box), s: textScale * Math.max(n.w, n.h), reach: 1.5 };
            });
        }
        const useAnchors = anchored.size > framed.size;
        guideInfo = seed === null ? null : { pairs: seed.pairs, source: useAnchors ? "label-anchors" : seed.source };
        for (const [id, shapes] of [...(useAnchors ? anchored : framed)].sort(([x], [y]) => compareIds(x, y))) {
            shapes.forEach(take);
            nodes.set(id, nodeFrom(id, shapes, []));
        }
    }

    // ---- edges by geometry: open paths whose two ends land on drawn nodes
    const nodeList = [...nodes.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
    const nodeBox = boxOfNode;
    const nearestNode = (p: Pt): PNode | null => {
        let best: PNode | null = null;
        let bestD = Infinity;
        for (const n of nodeList) {
            const d = toBox(p, nodeBox(n));
            const reach = Math.max(15, 0.5 * Math.max(n.w, n.h));
            if (d <= reach && d < bestD) {
                best = n;
                bestD = d;
            }
        }
        return best;
    };
    // every edge found by geometry, the pieces that are no edge of the file among them, in the order found
    const withPieces: PEdge[] = [];
    const guideLoops = new Set(guide.edges.filter((e) => e.source === e.target).map((e) => e.source));
    const geoEdges = new Map<string, number>();
    for (const p of free()) {
        if (p.kind !== "path" || p.stroke === null || p.points.length < 2) {
            continue;
        }
        const a = nearestNode(p.points[0]);
        const b = nearestNode(p.points.at(-1) ?? p.points[0]);
        if (a === null || b === null) {
            continue;
        }
        take(p);
        // A path whose two ends land on one node is a self-loop only where the file has one, and graphty draws every
        // edge of the file, loops included: elsewhere it is a piece of the node's or a nearby edge's drawing (a
        // zigzag border, a bend, an arrowhead's stroke), which no edge of the file stands for.
        const key = `${a.id}->${b.id}`;
        const k = geoEdges.get(key) ?? 0;
        geoEdges.set(key, k + 1);
        // kept aside, not dropped: the shapes at its ends are its own, not arrowheads of the edges beside it
        const edge: PEdge = {
            id: `${key}#g${String(k)}`,
            source: a.id,
            target: b.id,
            points: p.points,
            stroke: p.stroke,
            arrows: [],
            label: null,
        };
        withPieces.push(edge);
        if (!(a === b && !guideLoops.has(a.id))) {
            edges.push(edge);
        }
    }
    // arrowheads: small closed shapes at an edge's end
    for (const p of free()) {
        if (p.kind !== "shape") {
            continue;
        }
        const best = arrowheadEdge(p, withPieces, nodeList);
        if (best === null) {
            continue;
        }
        take(p);
        // A cap no wider than the line itself (Cytoscape draws a line-wide dot for arrow shape
        // NONE) shows nothing beyond the line: it is part of the line, not an arrowhead.
        if (Math.max(bw(p.box), bh(p.box)) > lineCapSize(best.e)) {
            best.e.arrows.push(arrowFrom(p, best.e.points, best.end));
            best.e.points = extendToTip(best.e.points, p.points, best.end);
        }
    }

    // ---- labels by geometry: graphty's label text near the node it belongs to. Every line goes to
    // the nearest node that wants those words, closest pairs first, so a node met early cannot take
    // a neighbour's line that sits nearer the neighbour (two labels ending in the same word).
    const guideById = new Map(guide.nodes.map((n) => [n.id, n]));
    const wanting = nodeList
        .filter((n) => n.label === null)
        .map((n) => {
            const want = guideById.get(n.id)?.label?.content;
            const lines = (want ?? "")
                .split("\n")
                .map(norm)
                .filter((t) => t !== "");
            return { n, lines, picked: new Array<Prim | undefined>(lines.length) };
        });
    const textPrims = free().filter((p) => p.text !== null);
    const candidates = wanting.flatMap((w) => {
        const reach = 3 * Math.max(w.n.w, w.n.h, 20);
        return w.lines.flatMap((line, li) =>
            textPrims
                .filter((p) => norm(p.text?.content ?? "") === line)
                .map((p) => ({ w, li, p, d: Math.hypot(cx(p.box) - w.n.cx, cy(p.box) - w.n.cy) }))
                .filter((c) => c.d <= reach),
        );
    });
    candidates.sort((a, b) => a.d - b.d || a.p.index - b.p.index || compareIds(a.w.n.id, b.w.n.id) || a.li - b.li);
    for (const c of candidates) {
        if (!used.has(c.p.index) && c.w.picked[c.li] === undefined) {
            c.w.picked[c.li] = take(c.p);
        }
    }
    for (const w of wanting) {
        const picked = w.picked.filter((p): p is Prim => p !== undefined);
        if (picked.length === 0) {
            // a label whose words differ is still this node's when it sits in the node's box
            const box = nodeBox(w.n);
            const hit = free()
                .filter((p) => p.text !== null && inside([cx(p.box), cy(p.box)], box))
                .sort((a, b) => a.index - b.index)[0];
            if (hit !== undefined) {
                picked.push(take(hit));
            }
        }
        w.n.label = mergeTexts(picked.flatMap((p) => (p.text ? [p.text] : [])));
    }
    const guideEdges = new Map(guide.edges.map((e) => [`${e.source}\u0000${e.target}`, e]));
    for (const e of edges) {
        if (e.label !== null) {
            continue;
        }
        const want = (guideEdges.get(`${e.source}\u0000${e.target}`) ?? guideEdges.get(`${e.target}\u0000${e.source}`))
            ?.label?.content;
        if (want === undefined) {
            continue;
        }
        // the whole label near the edge's middle, else each line near any point of the edge: a label at each end
        // (a source and a target label) is drawn as texts of their own
        const mid = e.points[Math.floor(e.points.length / 2)];
        const hit = free()
            .filter((p) => p.text !== null && norm(p.text.content) === norm(want))
            .map((p) => ({ p, d: Math.hypot(cx(p.box) - mid[0], cy(p.box) - mid[1]) }))
            .sort((a, b) => a.d - b.d || a.p.index - b.p.index)[0];
        if (hit?.p.text) {
            take(hit.p);
            e.label = hit.p.text;
            continue;
        }
        const near = (p: Prim): number =>
            Math.min(...e.points.map((q) => Math.hypot(cx(p.box) - q[0], cy(p.box) - q[1])));
        const picked = want
            .split("\n")
            .map(norm)
            .filter((line) => line !== "")
            .flatMap((line) => {
                const best = free()
                    .filter((p) => p.text !== null && norm(p.text.content) === line && near(p) <= END_LABEL_REACH)
                    .sort((a, b) => near(a) - near(b) || a.index - b.index)[0];
                if (best?.text === undefined || best.text === null) {
                    return [];
                }
                take(best);
                return [best.text];
            });
        e.label = mergeTexts(picked);
    }

    // ---- group boxes by geometry: a box-like closed shape around the centers of two or more drawn
    // nodes, each no wider and no taller than it (an edge drawn as a filled ribbon passes through
    // node centers but is thinner than the nodes, or encloses little of its box); a fill and an
    // outline drawn as two primitives over one box are one group
    for (const p of free()) {
        if (p.kind !== "shape") {
            continue;
        }
        const twin = groups.find((g) => sameBox(g.box, p.box));
        if (twin !== undefined) {
            take(p);
            twin.fill ??= p.fill;
            twin.stroke ??= p.stroke;
            continue;
        }
        // inside the outline itself, not only its box: a wide edge drawn as a filled band has a box over the nodes it
        // passes, but holds none of them
        const holds = (q: Pt): boolean => inside(q, p.box) && (p.points.length < 3 || inPolygon(q, p.points));
        const members = nodeList.filter(
            (n) => holds([n.cx, n.cy]) && n.w <= bw(p.box) && n.h <= bh(p.box) && area(nodeBox(n)) < 0.8 * area(p.box),
        );
        if (members.length >= 2 && polygonArea(p.points) >= 0.5 * area(p.box)) {
            take(p);
            groups.push({
                id: `box-${String(p.index)}`,
                box: p.box,
                fill: p.fill,
                stroke: p.stroke,
                label: null,
                members: members.map((n) => n.id),
            });
        }
    }
    for (const g of groups) {
        if (g.members.length === 0) {
            g.members = nodeList.filter((n) => inside([n.cx, n.cy], g.box)).map((n) => n.id);
        }
        if (g.label === null) {
            const want = guide.groups.find((x) => x.id === g.id)?.label?.content;
            const hit = free()
                .filter(
                    (p) =>
                        p.text !== null &&
                        inside([cx(p.box), cy(p.box)], g.box) &&
                        (want === undefined || norm(p.text.content) === norm(want)),
                )
                .filter((p) => !nodeList.some((n) => inside([cx(p.box), cy(p.box)], nodeBox(n))))
                .sort((a, b) => a.box.y0 - b.box.y0 || a.index - b.index)[0];
            if (hit?.text) {
                take(hit);
                g.label = hit.text;
            }
        }
    }

    const rest = free();
    let method: Association["method"] = "mixed";
    if (fromMarkup === 0) {
        method = "geometry";
    } else if (fromMarkup === nodes.size) {
        method = "markup";
    }
    return {
        method,
        guide: guideInfo,
        scene: {
            side: "oracle",
            width,
            height,
            // A drawing that paints no background of its own (Cytoscape.js, sigma, vis-network and
            // draw.io leave the canvas transparent) is seen over a white page, and its PNG is
            // rasterized over white.
            background: background ?? "#ffffff",
            nodes: nodeList,
            edges: [...edges].sort((a, b) => compareIds(a.id, b.id)),
            groups: [...groups].sort((a, b) => (a.id < b.id ? -1 : 1)),
            texts: rest.flatMap((p) => (p.text ? [p.text] : [])).sort(byText),
            strays: rest.filter((p) => p.text === null).map(strayOf),
        },
    };
}

/**
 * A first graphty-to-oracle similarity: from nodes the markup already named, else from label
 * text both sides draw once, else from the drawings' extents.
 */
/** A first graphty-to-oracle frame, and the label anchors it came from. */
interface Seed {
    t: Similarity;
    pairs: number;
    source: "nodes" | "labels" | "extent";
    /** Root mean square residual of the pairs it was fitted on, in oracle pixels. */
    rms: number;
    /** Guide node id to the oracle text drawing its (unique) label. */
    anchors: Map<string, Prim>;
}

function seedTransform(
    guide: PScene,
    named: ReadonlyMap<string, PNode>,
    free: readonly Prim[],
    width: number,
    height: number,
): Seed | null {
    const byId = guide.nodes.filter((n) => named.has(n.id));
    if (byId.length >= 3) {
        const t = fitSimilarity(
            byId.map((n): Pt => [n.cx, n.cy]),
            byId.map((n): Pt => {
                const o = named.get(n.id);
                return [o?.cx ?? 0, o?.cy ?? 0];
            }),
        );
        if (t !== null) {
            return { t, pairs: byId.length, source: "nodes", rms: Math.sqrt(t.sse / byId.length), anchors: new Map() };
        }
    }
    const count = <T>(xs: readonly T[], key: (x: T) => string): Map<string, T[]> => {
        const m = new Map<string, T[]>();
        for (const x of xs) {
            m.set(key(x), [...(m.get(key(x)) ?? []), x]);
        }
        return m;
    };
    const oracleTexts = count(
        free.filter((p) => p.text !== null),
        (p) => norm(p.text?.content ?? ""),
    );
    const guideTexts = count(
        guide.nodes.filter((n) => n.label !== null && n.label.content !== ""),
        (n) => norm((n.label?.content ?? "").split("\n")[0]),
    );
    const pairs: { from: Pt; to: Pt }[] = [];
    const anchors = new Map<string, Prim>();
    for (const [text, gs] of [...guideTexts].sort(([a], [b]) => compareIds(a, b))) {
        const os = oracleTexts.get(text);
        if (gs.length === 1 && os?.length === 1) {
            pairs.push({ from: [gs[0].cx, gs[0].cy], to: [cx(os[0].box), cy(os[0].box)] });
            anchors.set(gs[0].id, os[0]);
        }
    }
    if (pairs.length >= 3) {
        const t = fitSimilarity(
            pairs.map((p) => p.from),
            pairs.map((p) => p.to),
        );
        if (t !== null) {
            return { t, pairs: pairs.length, source: "labels", rms: Math.sqrt(t.sse / pairs.length), anchors };
        }
    }
    // the extents: graphty's node box onto the oracle's ink box, same scale both ways
    const ink = free.filter((p) => area(p.box) < 0.9 * width * height);
    if (ink.length === 0 || guide.nodes.length === 0) {
        return null;
    }
    const o = union(ink.map((p) => p.box));
    const g = union(
        guide.nodes.map((n) => ({ x0: n.cx - n.w / 2, y0: n.cy - n.h / 2, x1: n.cx + n.w / 2, y1: n.cy + n.h / 2 })),
    );
    const scale = Math.min(bw(o) / Math.max(1e-9, bw(g)), bh(o) / Math.max(1e-9, bh(g)));
    return {
        t: { scale, rotation: 0, reflect: false, tx: cx(o) - scale * cx(g), ty: cy(o) - scale * cy(g), sse: 0 },
        pairs: 0,
        source: "extent",
        rms: Number.POSITIVE_INFINITY,
        anchors,
    };
}

/** Where a guide node should be in the oracle's frame, how big, and how far its body may sit from there (in sizes). */
type Predict = (n: PNode) => { x: number; y: number; s: number; reach: number } | null;

/** Predictions through a similarity: graphty's center and size carried into the oracle's frame. */
const through =
    (t: Similarity): Predict =>
    (n) => {
        const [x, y] = apply(t, [n.cx, n.cy]);
        return { x, y, s: t.scale * Math.max(n.w, n.h), reach: 0.75 };
    };

/**
 * Each guide node's body among the free closed shapes: the closest of a matching size to where
 * the node lands in the oracle's frame, plus the shapes drawn on the same spot at the same size
 * (a fill and its outline drawn as two primitives).
 */
function matchBodies(guideNodes: readonly PNode[], free: readonly Prim[], predict: Predict): Map<string, Prim[]> {
    const shapes = free.filter((p) => (p.kind === "shape" || p.kind === "image") && area(p.box) > 0);
    const cand: { cost: number; id: string; p: Prim }[] = [];
    for (const n of guideNodes) {
        const at = predict(n);
        if (at === null) {
            continue;
        }
        const { x: px, y: py, s, reach } = at;
        for (const p of shapes) {
            const d = Math.hypot(cx(p.box) - px, cy(p.box) - py);
            const size = Math.max(bw(p.box), bh(p.box));
            if (d > Math.max(s, 8) * reach) {
                continue;
            }
            cand.push({ cost: d / Math.max(s, 4) + 0.5 * Math.abs(Math.log((size + 1) / (s + 1))), id: n.id, p });
        }
    }
    cand.sort((a, b) => a.cost - b.cost || compareIds(a.id, b.id) || a.p.index - b.p.index);
    const out = new Map<string, Prim[]>();
    const taken = new Set<number>();
    for (const c of cand) {
        if (out.has(c.id) || taken.has(c.p.index)) {
            continue;
        }
        taken.add(c.p.index);
        const body = c.p;
        const size = Math.max(bw(body.box), bh(body.box));
        const twins = shapes.filter(
            (q) =>
                !taken.has(q.index) &&
                Math.hypot(cx(q.box) - cx(body.box), cy(q.box) - cy(body.box)) <= 0.2 * size + 0.5 &&
                Math.max(bw(q.box), bh(q.box)) / Math.max(size, 1e-9) > 0.8 &&
                Math.max(bw(q.box), bh(q.box)) / Math.max(size, 1e-9) < 1.25,
        );
        twins.forEach((q) => taken.add(q.index));
        out.set(c.id, [body, ...twins]);
    }
    return out;
}

/** A raster oracle's own account of its drawing (`drawn` in its metadata): each node it drew. */
export interface RasterDrawing {
    nodes: { id: string; x: number; y: number; r: number; label: string | null }[];
}

/**
 * The most common color among the pixels of a disk: a node's fill read off a raster, robust to an
 * edge or a label crossing part of it.
 * @param pixels - RGBA bytes, row by row
 * @param width - the raster's width
 * @param height - the raster's height
 * @param x - the disk's center
 * @param y - the disk's center
 * @param r - its radius
 * @returns `#rrggbb`, or null when the disk holds no pixel
 */
export function diskColor(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number,
    r: number,
): string | null {
    const counts = new Map<string, number>();
    const step = Math.max(1, Math.floor(r / 6));
    for (let py = Math.ceil(y - r); py <= Math.floor(y + r); py += step) {
        for (let px = Math.ceil(x - r); px <= Math.floor(x + r); px += step) {
            if (px < 0 || py < 0 || px >= width || py >= height || (px - x) ** 2 + (py - y) ** 2 > r * r) {
                continue;
            }
            const i = (py * width + px) * 4;
            const hex = `#${[pixels[i], pixels[i + 1], pixels[i + 2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
            counts.set(hex, (counts.get(hex) ?? 0) + 1);
        }
    }
    return [...counts].sort((a, b) => b[1] - a[1] || compareIds(a[0], b[0]))[0]?.[0] ?? null;
}

/**
 * The scene of a raster oracle (the program has no vector output: sigma's WebGL drawing), from
 * the program's own account of where it drew each node and which labels it drew, with each fill
 * and the background read off its pixels. Labels carry their words only; no edge is read.
 * @param drawing - the program's account
 * @param width - the raster's width
 * @param height - the raster's height
 * @param fillAt - the color the raster shows over a disk (`diskColor` over the PNG)
 * @returns the oracle scene
 */
export function rasterScene(
    drawing: RasterDrawing,
    width: number,
    height: number,
    fillAt: (x: number, y: number, r: number) => string | null,
): PScene {
    const nodes = drawing.nodes.map((n): PNode => {
        const color = fillAt(n.x, n.y, 0.5 * n.r);
        return {
            id: n.id,
            cx: n.x,
            cy: n.y,
            w: 2 * n.r,
            h: 2 * n.r,
            shape: "ellipse",
            fill: color === null ? null : { color, opacity: 1, gradient: null },
            stroke: null,
            label:
                n.label === null
                    ? null
                    : {
                          content: n.label,
                          x: n.x,
                          y: n.y,
                          box: { x0: n.x, y0: n.y, x1: n.x, y1: n.y },
                          sizePx: 0,
                          family: "",
                          weight: 400,
                          style: "normal",
                          anchor: "start",
                          rotation: 0,
                          color: "#000000",
                          opacity: 1,
                      },
        };
    });
    return {
        side: "oracle",
        width,
        height,
        background: fillAt(0, 0, 0.5),
        nodes: nodes.sort((a, b) => compareIds(a.id, b.id)),
        edges: [],
        groups: [],
        texts: [],
        strays: [],
        labelGeometry: false,
    };
}
