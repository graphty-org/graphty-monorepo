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
            // a rectangle's corners sit on its box; a diamond's on the box's edge midpoints
            const b = p.box;
            const onCorner = p.points.filter(
                ([x, y]) =>
                    (Math.abs(x - b.x0) < 0.5 || Math.abs(x - b.x1) < 0.5) &&
                    (Math.abs(y - b.y0) < 0.5 || Math.abs(y - b.y1) < 0.5),
            ).length;
            return onCorner >= 3 ? "rect" : "diamond";
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
        shape: body ? shapeOf(body) : null,
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
    const nodeBox = (n: PNode): PBox => ({
        x0: n.cx - n.w / 2,
        y0: n.cy - n.h / 2,
        x1: n.cx + n.w / 2,
        y1: n.cy + n.h / 2,
    });
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
        const key = `${a.id}->${b.id}`;
        const k = geoEdges.get(key) ?? 0;
        geoEdges.set(key, k + 1);
        edges.push({
            id: `${key}#g${String(k)}`,
            source: a.id,
            target: b.id,
            points: p.points,
            stroke: p.stroke,
            arrows: [],
            label: null,
        });
    }
    // arrowheads: small closed shapes at an edge's end
    for (const p of free()) {
        if (p.kind !== "shape") {
            continue;
        }
        const size = Math.max(bw(p.box), bh(p.box));
        const c: Pt = [cx(p.box), cy(p.box)];
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
        const nodeSized = nodeList.some((n) => inside(c, nodeBox(n)) && size >= 0.5 * Math.min(n.w, n.h));
        if (best !== null && !nodeSized) {
            take(p);
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
        const mid = e.points[Math.floor(e.points.length / 2)];
        const hit = free()
            .filter((p) => p.text !== null && norm(p.text.content) === norm(want))
            .map((p) => ({ p, d: Math.hypot(cx(p.box) - mid[0], cy(p.box) - mid[1]) }))
            .sort((a, b) => a.d - b.d || a.p.index - b.p.index)[0];
        if (hit?.p.text) {
            take(hit.p);
            e.label = hit.p.text;
        }
    }

    // ---- group boxes by geometry: a closed shape that holds two or more drawn nodes
    for (const p of free()) {
        if (p.kind !== "shape") {
            continue;
        }
        const members = nodeList.filter((n) => inside([n.cx, n.cy], p.box) && area(nodeBox(n)) < 0.8 * area(p.box));
        if (members.length >= 2) {
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
