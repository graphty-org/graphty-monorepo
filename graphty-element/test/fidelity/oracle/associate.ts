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
import { apply, deltaE, fitSimilarity, frechet, resample } from "../../../../graph-io/test/fidelity/compare";
import {
    type ArrowEnd,
    type ArrowShape,
    arrowShapeOf,
    bandPaintedAsFill,
    boxOfPoints,
    compareIds,
    PAINTED_OUTLINE,
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

/**
 * Whether two lines run along one route, either way round: their Frechet distance over 64 samples within `tol`.
 * @param a - one line
 * @param b - the other
 * @param tol - how far apart, in the side's pixels
 * @returns true when they run together
 */
function sameRoute(a: readonly Pt[], b: readonly Pt[], tol: number): boolean {
    if (a.length < 2 || b.length < 2) {
        return false;
    }
    const [ra, rb] = [resample(a, 64), resample(b, 64)];
    return Math.min(frechet(ra, rb), frechet(ra, [...rb].reverse())) <= tol;
}
const bh = (b: PBox): number => b.y1 - b.y0;
const area = (b: PBox): number => Math.max(0, bw(b)) * Math.max(0, bh(b));
const union = (boxes: readonly PBox[]): PBox =>
    boxOfPoints(
        boxes.flatMap((b): Pt[] => [
            [b.x0, b.y0],
            [b.x1, b.y1],
        ]),
    );
/** Whether a box lies wholly inside another. */
const within = (a: PBox, b: PBox): boolean => a.x0 >= b.x0 && a.y0 >= b.y0 && a.x1 <= b.x1 && a.y1 <= b.y1;
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
            return curvedShapeOf(p);
        default:
            return "other";
    }
}

/**
 * The shape class of an outline with curves (an SVG path with arcs or Beziers, a rounded rect): an ellipse when every
 * sampled point lies on the ellipse its box holds, a rounded rectangle when it fills most of its box and runs along
 * its sides, otherwise a curved shape of no class graphty names. Nothing when too few points were sampled to tell.
 * @param p - a closed primitive with curves
 * @returns the class, or null when it cannot be told
 */
function curvedShapeOf(p: Prim): PShape | null {
    const b = p.box;
    const a = (b.x1 - b.x0) / 2;
    const c = (b.y1 - b.y0) / 2;
    if (p.points.length < 8 || !(a > 0 && c > 0)) {
        return null;
    }
    const mx = b.x0 + a;
    const my = b.y0 + c;
    // how far each point is off the ellipse, as a share of the radius there
    const off = p.points.map(([x, y]) => Math.abs(Math.hypot((x - mx) / a, (y - my) / c) - 1));
    if (Math.max(...off) < 0.06) {
        return "ellipse";
    }
    let area = 0;
    p.points.forEach(([x0, y0], i) => {
        const [x1, y1] = p.points[(i + 1) % p.points.length];
        area += x0 * y1 - x1 * y0;
    });
    // an ellipse fills pi/4 of its box; a rectangle rounded at its corners (a pill too) far more, along its sides
    const fills = Math.abs(area / 2) / (4 * a * c);
    const onSide = p.points.filter(
        ([x, y]) => Math.min(x - b.x0, b.x1 - x) < 0.03 * 2 * a || Math.min(y - b.y0, b.y1 - y) < 0.03 * 2 * c,
    ).length;
    return fills > 0.86 && onSide >= 0.3 * p.points.length ? "roundrect" : "other";
}

/**
 * How large graphty draws a node's outline, to find the program's: its fill, or for a border drawn in from the node's
 * size, out to the middle of the ring round the fill, as an SVG outline runs along the middle of its stroke.
 * @param n - graphty's node
 * @returns its larger side
 */
const guideSize = (n: PNode): number => Math.max(n.w, n.h) + (n.inset === true ? (n.stroke?.width ?? 0) : 0);

/**
 * The shapes a node's drawing holds that are an underlay or a halo, not its body: a see-through, unstroked fill drawn
 * before a smaller, opaque shape of the node and reaching past it by the same padding on every side (Cytoscape.js's
 * `underlay-*`). Neither its size, nor its color, nor an outline is the node's.
 * @param shapes - the node's shapes
 * @returns the underlays
 */
export function underlaysOf(shapes: readonly Prim[]): Set<Prim> {
    const body = (p: Prim): boolean => p.kind !== "image" && p.tag !== PAINTED_OUTLINE;
    const out = new Set<Prim>();
    for (const u of shapes) {
        if (!body(u) || u.stroke !== null || u.fill === null || u.fill.opacity >= 1) {
            continue;
        }
        const over = shapes.some((v) => {
            // over an opaque body: a see-through node drawn under a see-through box of its own (a label background
            // at the node's size) is the node, not an underlay
            const opaque = (v.fill?.opacity ?? 0) >= 0.99 || (v.stroke?.opacity ?? 0) >= 0.99;
            if (v === u || !body(v) || v.index < u.index || !opaque) {
                return false;
            }
            const pad = [v.box.x0 - u.box.x0, v.box.y0 - u.box.y0, u.box.x1 - v.box.x1, u.box.y1 - v.box.y1];
            return Math.min(...pad) >= 1 && Math.max(...pad) - Math.min(...pad) <= Math.max(1, 0.1 * Math.min(...pad));
        });
        if (over) {
            out.add(u);
        }
    }
    return out;
}

/**
 * The ring a node's drawing holds clear outside its border (Cytoscape.js's `outline-*`, Graphviz's `peripheries`): an
 * unfilled, stroked shape centered on the node whose stroke starts at or past the outer edge of the node's own outline
 * -- its fill, else its innermost outline. A ring is told apart only beside a border of the node's own: a single
 * outline drawn outside the fill (a border positioned outside) is the node's border.
 * @param shapes - the node's shapes, its underlays left out
 * @returns the outermost such ring, or null
 */
export function outerRingOf(shapes: readonly Prim[]): Prim | null {
    const solid = shapes.filter((p) => p.kind !== "image" && p.tag !== PAINTED_OUTLINE && area(p.box) > 0);
    const byArea = (a: Prim, b: Prim): number => area(a.box) - area(b.box) || a.index - b.index;
    const stroked = (p: Prim): boolean => p.stroke !== null && Number.isFinite(p.stroke.width) && p.stroke.width > 0;
    // the node's own outline: the box its fills cover together (a striped or wedged node's pieces), else its innermost
    // outline
    const fills = solid.filter((p) => p.fill !== null);
    const inner = solid.filter(stroked).sort(byArea)[0];
    const ref: PBox | undefined = fills.length > 0 ? union(fills.map((p) => p.box)) : inner?.box;
    if (ref === undefined) {
        return null;
    }
    const half = (b: PBox): number => Math.min(bw(b), bh(b)) / 2;
    // how far out the outline reaches: its half size, and half of any stroke drawn on it
    const sameBox = (p: Prim): boolean =>
        Math.max(
            Math.abs(p.box.x0 - ref.x0),
            Math.abs(p.box.y0 - ref.y0),
            Math.abs(p.box.x1 - ref.x1),
            Math.abs(p.box.y1 - ref.y1),
        ) <= 0.5;
    const edge =
        half(ref) +
        Math.max(0, ...solid.filter((p) => stroked(p) && sameBox(p)).map((p) => (p.stroke?.width ?? 0) / 2));
    const near = Math.max(1, 0.1 * half(ref));
    const rings = solid.filter(
        (p) =>
            !sameBox(p) &&
            p.fill === null &&
            stroked(p) &&
            Math.hypot(cx(p.box) - cx(ref), cy(p.box) - cy(ref)) <= near &&
            half(p.box) - (p.stroke?.width ?? 0) / 2 >= edge - 0.25,
    );
    const ring = rings.sort(byArea).at(-1);
    return ring !== undefined && solid.some((p) => stroked(p) && !rings.includes(p)) ? ring : null;
}

/**
 * The first piece of a node whose fill is drawn in pieces (Graphviz's striped and wedged styles): two or more fills of
 * which one at least does not cover the box they make together (a wedge of 0.7 of a circle spans the whole box, its
 * 0.3 sibling does not). Its fill is the node's first color, as a program's own fill list names it, where the largest
 * piece would be decided by the size of each piece's box (a wedge's box is not its area) or, for equal stripes, by
 * rounding. A whole fill drawn first beneath smaller ones is that first piece too.
 * @param shapes - the node's shapes
 * @returns the first-drawn piece, or null when the node's fill is not in pieces
 */
function piecesFirst(shapes: readonly Prim[]): Prim | null {
    const fills = shapes.filter((s) => s.fill !== null && s.kind !== "image" && area(s.box) > 0);
    if (fills.length < 2) {
        return null;
    }
    const whole = area(union(fills.map((s) => s.box)));
    return fills.some((s) => area(s.box) < 0.95 * whole) ? [...fills].sort((a, b) => a.index - b.index)[0] : null;
}

/** A node built from the primitives that draw it. */
function nodeFrom(id: string, drawn: readonly Prim[], texts: readonly PText[]): PNode {
    const under = underlaysOf(drawn);
    const ringPrim = outerRingOf(drawn.filter((p) => !under.has(p)));
    // a ring outside the border is neither the node's size nor its outline: judged on its own
    const shapes = drawn.filter((p) => !under.has(p) && p !== ringPrim);
    const all = [...shapes].sort((a, b) => area(b.box) - area(a.box) || a.index - b.index);
    // an outline drawn as a fill of its own (`outlinePaintedAsFill`) reaching far past the rest of the node (Cytoscape's
    // zigzag spikes past a small node) is its line, not its extent
    const rest = all.filter((s) => s.tag !== PAINTED_OUTLINE);
    const reach = rest.length === 0 ? Infinity : 1.25 * Math.max(bw(rest[0].box), bh(rest[0].box));
    const sorted = all.filter((s) => s.tag !== PAINTED_OUTLINE || Math.max(bw(s.box), bh(s.box)) <= reach);
    const body = sorted[0];
    // an image drawn over a node (a custom graphic) has no outline of its own: the shape is the largest drawn one
    // and an outline drawn as a fill of its own (`outlinePaintedAsFill`) says nothing of the shape: its body does
    const outline =
        sorted.find((s) => s.kind !== "image" && s.tag !== PAINTED_OUTLINE) ?? sorted.find((s) => s.kind !== "image");
    const box = body
        ? union(sorted.filter((s) => area(s.box) >= 0.5 * area(body.box)).map((s) => s.box))
        : union(texts.map((t) => t.box));
    // a fill over no area paints nothing: Cytoscape draws a 1 x 1 anchor node with a 1 px border as a
    // shape of size 0, its round-capped outline a dot and its fill nowhere
    const filled = piecesFirst(sorted) ?? sorted.find((s) => s.fill !== null && area(s.box) > 0);
    // of several outlines, the one centered on the body (a line of dots passing the node is not its outline)
    const at = body ?? all[0];
    const off = (s: Prim): number => (at ? Math.hypot(cx(s.box) - cx(at.box), cy(s.box) - cy(at.box)) : 0);
    const stroked = all
        .filter((s) => s.stroke !== null)
        .sort((a, b) => off(a) - off(b) || area(b.box) - area(a.box) || a.index - b.index)[0];
    const pictures = shapes.filter((s) => s.kind === "image").map((s) => s.box);
    return {
        id,
        ...(pictures.length > 0 ? { pictures } : {}),
        cx: cx(box),
        cy: cy(box),
        w: bw(box),
        h: bh(box),
        // a dot (an outline of no size, drawn by its round-capped stroke) has no shape to read
        shape: outline && area(outline.box) > 0 ? shapeOf(outline) : null,
        fill: filled?.fill ?? null,
        stroke: stroked?.stroke ?? null,
        ring:
            ringPrim === null || ringPrim.stroke === null
                ? null
                : {
                      ...ringPrim.stroke,
                      // its outer edge out from the node's box, along the axis it reaches farther on
                      reach: Math.max(
                          (bw(ringPrim.box) + ringPrim.stroke.width - bw(box)) / 2,
                          (bh(ringPrim.box) + ringPrim.stroke.width - bh(box)) / 2,
                      ),
                  },
        label: mergeTexts(texts),
        ...(drawn.length > 0 ? { order: Math.max(...drawn.map((p) => p.index)) } : {}),
    };
}

/**
 * Runs of one line drawn as separate text elements side by side, joined into the line they make: Graphviz writes each
 * font change of an HTML-like label as its own `<text>` on the same baseline (`<FONT>`, `<U>`, a `<SUP>` raised a
 * little), so "mono u s x2" is five texts and one line. A run is a text starting where the one before it on the line
 * ends (within half its font size) whose middle lies within that one's height; a space is put between two runs
 * apart by more than a sixth of the font size, or where either keeps a blank at that side.
 * @param texts - the texts
 * @returns the texts with each line's runs joined, left to right
 */
function joinRuns(texts: readonly PText[]): PText[] {
    const out: PText[] = [];
    for (const t of [...texts].sort((a, b) => a.box.x0 - b.box.x0)) {
        const size = (p: PText): number => Math.max(p.sizePx, 1);
        const before = out.find(
            (a) =>
                (a.lines?.length ?? 1) < 2 &&
                (t.lines?.length ?? 1) < 2 &&
                t.box.x0 - a.box.x1 >= -0.2 * size(a) &&
                t.box.x0 - a.box.x1 <= 0.5 * size(a) &&
                cy(t.box) >= a.box.y0 &&
                cy(t.box) <= a.box.y1 &&
                cy(a.box) >= t.box.y0 &&
                cy(a.box) <= t.box.y1,
        );
        if (before === undefined) {
            out.push(t);
            continue;
        }
        const apart =
            t.box.x0 - before.box.x1 > size(before) / 6 || before.blank?.after === true || t.blank?.before === true;
        const box = union([before.box, t.box]);
        out[out.indexOf(before)] = {
            ...before,
            content: norm(`${before.content}${apart ? " " : ""}${t.content}`),
            box,
            lines: [box],
            blank: { before: before.blank?.before ?? false, after: t.blank?.after ?? false },
        };
    }
    return out;
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
    const lines = joinRuns(texts).sort(byText);
    const first = lines[0];
    const box = union(lines.map((t) => t.box));
    return {
        ...first,
        content: lines.map((t) => t.content).join("\n"),
        box,
        x: cx(box),
        y: cy(box),
        lines: lines.flatMap((t) => t.lines ?? [t.box]),
        outline: lines.find((t) => t.outline)?.outline ?? null,
        background: lines.find((t) => t.background)?.background ?? null,
    };
}

/**
 * How far an arrowhead reaches along its edge's end direction and across it, and its shape class.
 * @param outline - the arrowhead's drawn points
 * @param path - the edge's path, source end first
 * @param end - which end it caps
 * @param look - how it is painted: whether it is filled, its color, and its shape class where the caller knows it
 *     (graphty's caps carry their mesh's shape name; an outline that is no polygon in drawing order cannot be read)
 * @param look.filled - whether it is filled
 * @param look.color - its color, or null
 * @param look.shape - its shape class, or undefined to read it off the outline
 * @returns the arrow
 */
export function measureArrow(
    outline: readonly Pt[],
    path: readonly Pt[],
    end: ArrowEnd,
    look: { filled: boolean; color: string | null; shape?: ArrowShape },
): PArrow {
    const { filled, color } = look;
    // one part-way along is measured along the line's direction where it is, source to target
    const RUNS: Record<ArrowEnd, () => readonly Pt[]> = {
        middle: () => middleRun(path),
        target: () => path,
        source: () => [...path].reverse(),
    };
    const pts = RUNS[end]();
    const tip = pts.at(-1) ?? [0, 0];
    const back = pts[Math.max(0, Math.floor(pts.length * 0.8) - 1)] ?? tip;
    let dx = tip[0] - back[0];
    let dy = tip[1] - back[1];
    const len = Math.hypot(dx, dy);
    const box = boxOfPoints(outline);
    if (len < 1e-9 || outline.length === 0) {
        // no direction: the arrow's own box
        return {
            end,
            length: Math.max(bw(box), bh(box), 0),
            width: Math.max(0, Math.min(bw(box), bh(box))),
            filled,
            shape: look.shape ?? "other",
            color,
        };
    }
    dx /= len;
    dy /= len;
    [dx, dy] = capAxis(outline, tip, [dx, dy]);
    const along = outline.map(([x, y]) => x * dx + y * dy);
    const across = outline.map(([x, y]) => -x * dy + y * dx);
    return {
        end,
        length: Math.max(...along) - Math.min(...along),
        width: Math.max(...across) - Math.min(...across),
        filled,
        shape: look.shape ?? arrowShapeOf(outline, [dx, dy]),
        color,
    };
}

/**
 * How far a cap's own axis may turn from the line's end direction and still be read as its axis: the most Gephi's
 * aim turns from its arc. Its arc (radius distance / 1.2) passes through both node centers, so the aim from a point on
 * it at the target's center turns from the arc's tangent there by half the arc between them (the tangent-chord angle),
 * at most half the whole arc, asin(0.6) = 36.87 degrees; the line's end direction, read from a point behind its end,
 * turns away by half the arc between, which still sums to at most half the whole arc. A short edge between large
 * nodes comes close (`gexf-graphology-rio` `ncs337->ncs291`: 34 degrees).
 */
const CAP_AXIS_TURN = Math.asin(0.6) + (0.5 * Math.PI) / 180;
/** How closely a cap's tip and its middle must agree on its axis for it to count as symmetric about it. */
const CAP_AXIS_AGREE = (5 * Math.PI) / 180;

/**
 * The direction a cap points in. A cap drawn on from where its line stops (its back on the line's end) points along
 * its own axis, which on a curved line need not be the line's end direction: Gephi ends an arc short of its node and
 * aims the arrowhead from there at the node's center, about 14 degrees off the arc's end on `gexf-specimen-arrows-p4`.
 * The axis is from the line's end through the cap's tip (its point furthest along the line) when the cap is pointed
 * (every point away from the tip lies well behind it), its middle (the mean of its points) lies on that same axis -- a
 * cap symmetric about it -- and it turns less than CAP_AXIS_TURN from the line; otherwise, and for a cap the line runs
 * into, the line's end direction.
 * @param outline - the cap's drawn points
 * @param end - where the line ends
 * @param dir - the line's unit end direction
 * @returns the unit direction to read the cap along
 */
function capAxis(outline: readonly Pt[], end: Pt, dir: Pt): Pt {
    const along = outline.map(([x, y]) => (x - end[0]) * dir[0] + (y - end[1]) * dir[1]);
    const length = Math.max(...along) - Math.min(...along);
    // the line runs into the cap (it ends at the tip, or at its middle): its end direction is the cap's. A cap drawn on
    // from the line's end may still poke a back corner behind it, by up to sin(CAP_AXIS_TURN) of its half width.
    if (!(length > 1e-9) || Math.min(...along) < -0.3 * length) {
        return dir;
    }
    const front = Math.max(...along);
    const tip = outline[along.indexOf(front)];
    // a pointed cap: every point away from its tip lies well behind it (a box's or a tee's two front corners do not)
    const pointed = outline.every(
        (p, i) => Math.hypot(p[0] - tip[0], p[1] - tip[1]) <= 0.25 * length || along[i] <= front - 0.25 * length,
    );
    if (!pointed) {
        return dir;
    }
    const mid: Pt = [
        outline.reduce((sum, p) => sum + p[0], 0) / outline.length,
        outline.reduce((sum, p) => sum + p[1], 0) / outline.length,
    ];
    const angle = ([x, y]: Pt): number => Math.atan2(y - end[1], x - end[0]);
    const turn = (a: number, b: number): number => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
    const axis = angle(tip);
    if (turn(axis, angle(mid)) > CAP_AXIS_AGREE || turn(axis, Math.atan2(dir[1], dir[0])) > CAP_AXIS_TURN) {
        return dir;
    }
    return [Math.cos(axis), Math.sin(axis)];
}

/**
 * A line's middle by its length, as the two points either side of it, source side first.
 * @param path - the line, source end first
 * @returns the points
 */
function middleRun(path: readonly Pt[]): Pt[] {
    const at = pointAlong(path, 0.5);
    let left = pathLength(path) / 2;
    for (let i = 1; i < path.length; i++) {
        const step = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
        if (left <= step) {
            return [path[i - 1], at, path[i]];
        }
        left -= step;
    }
    return [...path];
}

/**
 * The point a share of the way along a line, by its length.
 * @param path - the line
 * @param share - 0 at its first point, 1 at its last
 * @returns the point
 */
function pointAlong(path: readonly Pt[], share: number): Pt {
    let left = pathLength(path) * share;
    for (let i = 1; i < path.length; i++) {
        const [a, b] = [path[i - 1], path[i]];
        const step = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (left <= step && step > 0) {
            const t = left / step;
            return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        }
        left -= step;
    }
    return path.at(-1) ?? [0, 0];
}

/**
 * An arrowhead primitive as an arrow: filled where it is painted in something other than the canvas behind it (a
 * hollow arrowhead is often filled white, or painted as a ring: `outlinePaintedAsFill`), its color its fill's where
 * filled and its outline's otherwise (none, for a hollow one drawn with no outline of its own).
 * @param p - the primitive
 * @param path - the edge's path, source end first
 * @param end - which end it caps
 * @param background - the canvas color
 * @returns the arrow
 */
function arrowFrom(p: Prim, path: readonly Pt[], end: ArrowEnd, background: string): PArrow {
    // as opaque as its outline, at least half: a translucent edge's arrow (Graphviz's #00000033) is faint all over,
    // fill and outline alike, where a hollow one's faint fill sits under an outline painted at full strength
    const solid = 0.5 * (p.stroke?.opacity ?? p.fill?.opacity ?? 1);
    const filled = p.fill !== null && p.fill.opacity >= solid && deltaE(p.fill.color, background) > 3;
    return measureArrow(p.points, path, end, {
        filled,
        color: filled ? (p.fill?.color ?? null) : (p.stroke?.color ?? null),
    });
}

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
    // the head's reach along the line, on the line: a flat head (a tee's bar, a half circle) has its farthest points at
    // its corners, beside the line, and a line bent to one of them reads as curved
    const reach = Math.max(...outline.map(along));
    if (reach > 0.5) {
        pts.push([last[0] + dx * reach, last[1] + dy * reach]);
    }
    return end === "target" ? pts : pts.reverse();
}

/**
 * Whether a primitive is an open stroke bent like part of a circle (bulging from its chord by a fifth of it up to
 * all of it): an arrowhead drawn as a stroke, where it caps a line's end.
 * @param p - the primitive
 * @returns true for such a stroke
 */
function strokedArc(p: Prim): boolean {
    if (p.kind !== "path" || p.closed || p.fill !== null || p.stroke === null || p.points.length < 5) {
        return false;
    }
    const [a, b] = [p.points[0], p.points.at(-1) ?? p.points[0]];
    const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (chord <= 0) {
        return false;
    }
    const bulge = Math.max(
        ...p.points.map((q) => Math.abs((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])) / chord),
    );
    if (bulge < 0.2 * chord || bulge > chord) {
        return false;
    }
    // round, not bent at a corner (an open arrow's two strokes): every point as far from the circle through its two
    // ends and its middle point as the ends are, within a tenth
    const m = p.points[Math.floor(p.points.length / 2)];
    const d = 2 * (a[0] * (m[1] - b[1]) + m[0] * (b[1] - a[1]) + b[0] * (a[1] - m[1]));
    if (Math.abs(d) < 1e-9) {
        return false;
    }
    const sq = (q: Pt): number => q[0] * q[0] + q[1] * q[1];
    const ux = (sq(a) * (m[1] - b[1]) + sq(m) * (b[1] - a[1]) + sq(b) * (a[1] - m[1])) / d;
    const uy = (sq(a) * (b[0] - m[0]) + sq(m) * (a[0] - b[0]) + sq(b) * (m[0] - a[0])) / d;
    const r = Math.hypot(a[0] - ux, a[1] - uy);
    return p.points.every((q) => Math.abs(Math.hypot(q[0] - ux, q[1] - uy) - r) <= 0.1 * r);
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

/**
 * One markup-named edge's primitives split into the edges they draw. Gephi names an edge by its two end nodes only
 * (`class="id_<source> id_<target>"`), so two parallel edges it keeps apart (edges of different kinds) share one name:
 * each draws its own line, and its own arrowhead after it. Gephi draws an edge as one path, so several paths under
 * one Gephi name are several edges, each with the arrowhead of its place; anything else stays one edge.
 * @param ps - the primitives the markup names one edge
 * @returns the primitives of each edge
 */
function parallelEdges(ps: readonly Prim[]): Prim[][] {
    // Gephi's name: its two ends and nothing else (Pajek's names carry the line's place after an "@")
    const hint = ps[0]?.hint;
    const gephi = hint?.ends !== undefined && hint.key === hint.id;
    const lines = gephi ? ps.filter((p) => p.kind === "path") : [];
    if (lines.length < 2) {
        return [[...ps]];
    }
    const heads = ps.filter((p) => p.kind === "shape");
    const rest = ps.filter((p) => p.kind !== "path" && p.kind !== "shape");
    return lines.map((line, i) => {
        let own: Prim[] = [];
        if (heads.length === lines.length) {
            own = [heads[i]];
        } else if (i === 0) {
            own = heads;
        }
        return [line, ...own, ...(i === 0 ? rest : [])];
    });
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
 * The largest end cap that draws nothing beyond its line: a dot or square as wide as the line. A line of no one
 * width (a pattern Cytoscape desktop paints as a filled band: slashes, arrows, a double line) has no such cap: every
 * cap at its end is an arrowhead.
 * @param e - the edge
 * @returns the size in the side's pixels
 */
export function lineCapSize(e: PEdge): number {
    const width = e.stroke?.width ?? 0;
    return 1.1 * (Number.isFinite(width) ? width : 0) + 0.25;
}

/**
 * Where an edge's line meets the node at one end: its end point, or, for a line drawn on to the node's center
 * under the node (vis-network draws each edge from center to center and its arrowhead at the node's outline), where
 * it leaves the node's box, beside which the arrowhead sits.
 * @param pts - the line
 * @param end - which end
 * @param node - the node at that end
 * @returns the point
 */
function drawnEnd(pts: readonly Pt[], end: "source" | "target", node: PNode | undefined): Pt {
    const run = end === "source" ? pts : [...pts].reverse();
    // only a line that runs on to the node's very center: one that ends inside a large box (a group's) ends there
    if (node === undefined || Math.hypot(run[0][0] - node.cx, run[0][1] - node.cy) > 2) {
        return run[0];
    }
    const box = boxOfNode(node);
    const under = (p: Pt): boolean => p[0] > box.x0 + 1 && p[0] < box.x1 - 1 && p[1] > box.y0 + 1 && p[1] < box.y1 - 1;
    const out = run.findIndex((p) => !under(p));
    if (out <= 0) {
        return run[0];
    }
    // the crossing of the box's outline on the segment that leaves it, by bisection
    let [a, b] = [run[out - 1], run[out]];
    for (let i = 0; i < 20; i++) {
        const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        [a, b] = under(m) ? [m, b] : [a, m];
    }
    return b;
}

const endOf = (e: PEdge, end: "source" | "target"): Pt =>
    end === "source" ? e.points[0] : (e.points.at(-1) ?? e.points[0]);

/**
 * How far a shape's nearest point is from where a line drawn on under its node leaves the node.
 * @param p - the shape
 * @param e - the edge
 * @param end - which end
 * @param nodes - the drawn nodes
 * @returns the distance
 */
function tipGap(p: Prim, e: PEdge, end: "source" | "target", nodes: readonly PNode[]): number {
    const id = end === "source" ? e.source : e.target;
    const q = drawnEnd(
        e.points,
        end,
        nodes.find((n) => n.id === id),
    );
    return Math.min(...p.points.map((v) => Math.hypot(v[0] - q[0], v[1] - q[1])));
}

/**
 * How far a shape stops short of where its line leaves the node at one end, measured along the line there: 0 or
 * less for a shape that reaches it.
 * @param p - the shape
 * @param e - the edge
 * @param end - which end
 * @param nodes - the drawn nodes
 * @returns the distance
 */
function alongGap(p: Prim, e: PEdge, end: "source" | "target", nodes: readonly PNode[]): number {
    const id = end === "source" ? e.source : e.target;
    const q = drawnEnd(
        e.points,
        end,
        nodes.find((n) => n.id === id),
    );
    const run = end === "source" ? e.points : [...e.points].reverse();
    const far = run.at(-1) ?? q;
    const len = Math.hypot(far[0] - q[0], far[1] - q[1]);
    if (len < 1e-9) {
        return 0;
    }
    // inward, from the end toward the line's other end
    const [ux, uy] = [(far[0] - q[0]) / len, (far[1] - q[1]) / len];
    return Math.min(...p.points.map((v) => (v[0] - q[0]) * ux + (v[1] - q[1]) * uy));
}

/**
 * The geometric edge end nearest a shape by a measure, within a reach.
 * @param edges - the edges; only geometric ones (`#g` ids) count
 * @param gap - the measure of an end
 * @param reach - the farthest an end may be
 * @returns the edge and the end, with the distance, or null
 */
function nearestEnd<End extends ArrowEnd>(
    edges: readonly PEdge[],
    gap: (e: PEdge, end: End) => number,
    reach: number,
    ends: readonly End[],
): { e: PEdge; end: End; d: number } | null {
    let best: { e: PEdge; end: End; d: number } | null = null;
    for (const e of edges) {
        if (!e.id.includes("#g")) {
            continue;
        }
        for (const end of ends) {
            const d = gap(e, end);
            if (d <= reach && (best === null || d < best.d)) {
                best = { e, end, d };
            }
        }
    }
    return best;
}

/**
 * A line's middle and the farther of the two points either side of it, which give the line's direction there.
 * @param path - the line, source end first
 * @returns the middle and that point
 */
function middleAxis(path: readonly Pt[]): [Pt, Pt] {
    const [a, m, b] = middleRun(path);
    const far = (p: Pt | undefined): number => (p === undefined ? -1 : Math.hypot(p[0] - m[0], p[1] - m[1]));
    return [m, far(a) >= far(b) ? a : b];
}

/**
 * The signed distances of a stroke's points from the line through one end's last run of a path.
 * @param stroke - the stroke's points
 * @param path - the line, source end first
 * @param end - which end
 * @returns the distances (positive to the left looking along the run), or null for a run of no length
 */
function offAxis(stroke: readonly Pt[], path: readonly Pt[], end: "source" | "target"): number[] | null {
    const pts = end === "target" ? path : [...path].reverse();
    const [a, b] = [pts.at(-2) ?? pts[0], pts.at(-1) ?? pts[0]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-9) {
        return null;
    }
    return stroke.map((q) => ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])) / len);
}

/**
 * Whether a stroke runs along the line through one end's last run, within a pixel: a stem carrying the line on.
 * @param stroke - the stroke's points
 * @param path - the line, source end first
 * @param end - which end
 * @returns true for such a stroke
 */
function alongEnd(stroke: readonly Pt[], path: readonly Pt[], end: "source" | "target"): boolean {
    return offAxis(stroke, path, end)?.every((d) => Math.abs(d) <= 1) ?? false;
}

/**
 * Whether a stroke at one end of a line lies all to one side of the line through that end's last run (within half a
 * pixel): an arrowhead cut along its line, as Graphviz's l and r arrows are.
 * @param stroke - the stroke's points
 * @param path - the line, source end first
 * @param end - which end
 * @returns true when no point is clearly on the other side
 */
function oneSided(stroke: readonly Pt[], path: readonly Pt[], end: "source" | "target"): boolean {
    const side = offAxis(stroke, path, end);
    return side !== null && (side.every((d) => d > -0.5) || side.every((d) => d < 0.5));
}

/**
 * Whether an open stroke spans its edge's line at one end as an arrowhead drawn as a stroke does (Cytoscape's open
 * half circle): its two ends either side of the line, the chord between them across it, its middle at the line's end
 * (or at the line's middle, for a cap drawn part-way along it). A piece of a node's outline beside the end does none
 * of that.
 * @param stroke - the stroke's points
 * @param e - the edge
 * @param end - which end, or the middle
 * @returns true for a stroke that caps the end
 */
function capsAcross(stroke: readonly Pt[], e: PEdge, end: ArrowEnd): boolean {
    const run = end === "source" ? e.points : [...e.points].reverse();
    // a cap part-way along the line (vis-network's middle curve) spans the line at its middle, along the longer of the
    // two runs either side of it
    const [q, back] = end === "middle" ? middleAxis(e.points) : [run[0], run[Math.min(1, run.length - 1)]];
    const a = stroke[0];
    const b = stroke.at(-1) ?? a;
    const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dir = Math.hypot(back[0] - q[0], back[1] - q[1]);
    if (chord < 1e-9 || dir < 1e-9) {
        return false;
    }
    const across = Math.abs(((b[0] - a[0]) * (back[0] - q[0]) + (b[1] - a[1]) * (back[1] - q[1])) / (chord * dir));
    const middle = Math.hypot((a[0] + b[0]) / 2 - q[0], (a[1] + b[1]) / 2 - q[1]);
    return across < 0.3 && middle <= chord;
}

/**
 * Whether a box's middle lies on an edge's line where an arrowhead at one end would sit: within a sixth of the box's
 * smaller side (and a pixel or two) of the line through that end's last run.
 * @param box - the box
 * @param e - the edge
 * @param end - which end, or the middle
 * @returns true when it is centered on the line
 */
function centeredOnLine(box: PBox, e: PEdge, end: ArrowEnd): boolean {
    const pts = end === "source" ? [...e.points].reverse() : e.points;
    const [a, b] = end === "middle" ? middleRun(pts) : [pts.at(-2) ?? pts[0], pts.at(-1) ?? pts[0]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-9) {
        return false;
    }
    const c: Pt = [cx(box), cy(box)];
    const across = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / len;
    return across <= Math.max(2, Math.min(bw(box), bh(box)) / 6);
}

/**
 * Whether a closed shape is a cap pointing along its line with its point on the line's middle: one of its points lies
 * there (within a twentieth of its size, at least a pixel and a half), and no point of it lies farther along the line
 * that way. A cap at an end has its point at that end, and a shape centered on the middle (a circle, a bar) has no
 * point there.
 * @param p - the shape
 * @param e - the edge
 * @returns true for a cap pointing at the middle
 */
function tipsMiddle(p: Prim, e: PEdge): boolean {
    const run = middleRun(e.points);
    if (run.length < 3 || p.points.length < 3 || !centeredOnLine(p.box, e, "middle")) {
        return false;
    }
    const [a, m, b] = run;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-9) {
        return false;
    }
    const [ux, uy] = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    const tol = Math.max(1.5, 0.05 * Math.max(bw(p.box), bh(p.box)));
    const along = p.points.map((v) => (v[0] - m[0]) * ux + (v[1] - m[1]) * uy);
    const [lo, hi] = [Math.min(...along), Math.max(...along)];
    return (
        hi - lo >= 2 * tol &&
        p.points.some(
            (v, i) => Math.hypot(v[0] - m[0], v[1] - m[1]) <= tol && (along[i] >= hi - 0.5 || along[i] <= lo + 0.5),
        )
    );
}

/**
 * The geometric edge end a closed shape caps as an arrowhead, or null when it caps none. An
 * arrowhead sits at the end (its box within reach of the end point), is small beside its edge
 * (no longer than the line it ends, where the line is over a few pixels long) and holds no node: a group box or an annotation drawn near an
 * edge's end is none of those.
 * @param p - the shape
 * @param edges - the edges so far; only geometric ones (`#g` ids) are capped here
 * @param nodes - the drawn nodes
 * @param centerLines - whether the drawing runs its lines on to the nodes' centers (vis-network), so an arrowhead
 *     sits where a line leaves its node rather than at the line's end
 * @returns the edge and the end, or null
 */
export function arrowheadEdge(
    p: Prim,
    edges: readonly PEdge[],
    nodes: readonly PNode[],
    centerLines = false,
): { e: PEdge; end: ArrowEnd } | null {
    const size = Math.max(bw(p.box), bh(p.box));
    const c: Pt = [cx(p.box), cy(p.box)];
    // a dot no wider than a line it touches the end of is that line's own end (Cytoscape desktop's arrow shape NONE on
    // a wide line), even over a node smaller than twice its size (xgmml-specimen-arrows-p2 arrow-on-wide-edge)
    const lineEnd = edges.some(
        (e) =>
            size <= lineCapSize(e) && (toBox(endOf(e, "source"), p.box) <= 1 || toBox(endOf(e, "target"), p.box) <= 1),
    );
    if (
        !lineEnd &&
        nodes.some((n) => inside([n.cx, n.cy], p.box) || (inside(c, boxOfNode(n)) && size >= 0.5 * Math.min(n.w, n.h)))
    ) {
        return null;
    }
    // Where lines run on under the nodes, many cross one outline: an arrowhead caps the line its tip touches
    // there; one whose tip touches none is judged as anywhere else, by its middle against the lines' ends.
    // An arrowhead at a line's end sits at that end, so a shape that close to any line's end is that end's arrow. Only
    // a shape no end holds so closely, clear of its own line's ends and centered on the line at its middle (a cap
    // drawn part-way along it), is that line's middle arrow: in a dense drawing another edge's arrowhead often lies
    // across a long line's middle, and is that other edge's.
    const reach = size * 1.5 + 3;
    const from = (q: Pt): number => Math.hypot(c[0] - q[0], c[1] - q[1]);
    const near = nearestEnd(edges, (e, end) => from(endOf(e, end)), reach, ["source", "target"]);
    // How far a shape reaches back along a line from its end, inward: about 0 for a cap whose base the line stops at
    // (Cytoscape desktop stops every line at its arrowhead's base), its length for one the line runs on under.
    const behind = (e: PEdge, end: "source" | "target"): number => {
        const q = endOf(e, end);
        const r = end === "source" ? (e.points[1] ?? q) : (e.points.at(-2) ?? q);
        const len = Math.hypot(r[0] - q[0], r[1] - q[1]);
        return len < 1e-9
            ? Number.POSITIVE_INFINITY
            : Math.max(...p.points.map((v) => ((v[0] - q[0]) * (r[0] - q[0]) + (v[1] - q[1]) * (r[1] - q[1])) / len));
    };
    // Where several lines end at one node, the nearest end may lie under the middle of another line's cap (a crowded
    // Cytoscape desktop node, xgmml-syn-mappings 1269791): the line that stops at the cap's base is the cap's.
    const based =
        near !== null && toBox(endOf(near.e, near.end), p.box) <= 2 && behind(near.e, near.end) > 1.5
            ? nearestEnd(
                  edges,
                  (e, end) => {
                      const b = behind(e, end);
                      return toBox(endOf(e, end), p.box) <= 2 && b <= 1 && b >= -2
                          ? from(endOf(e, end))
                          : Number.POSITIVE_INFINITY;
                  },
                  reach,
                  ["source", "target"],
              )
            : null;
    const ends = based ?? near;
    const middleGap = (e: PEdge): number => {
        const [a, b] = middleRun(e.points);
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const across =
            len > 0 ? Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / len : Infinity;
        // an end's arrowhead reaches its line's end, or, where the line runs on to the node's center, its outline:
        // measured along the line, as a crow's foot's tines reach the outline beside the line rather than on it
        const touches = alongGap(p, e, "source", nodes) <= 3 || alongGap(p, e, "target", nodes) <= 3;
        const clear = !touches && from(endOf(e, "source")) > size && from(endOf(e, "target")) > size;
        return clear && across <= Math.max(1, 0.2 * size) ? from(pointAlong(e.points, 0.5)) : Number.POSITIVE_INFINITY;
    };
    const middle = nearestEnd(edges, (e) => middleGap(e), reach, ["middle"]);
    const held = ends !== null && ends.d <= 0.75 * size + 2;
    // a cap whose point is its line's middle, pointing along the line, is that line's middle arrow however near an end
    // its base reaches (vis-network's arrows.middle with a scaleFactor, on a line under twice the cap's length)
    const pointed = nearestEnd(edges, (e) => (tipsMiddle(p, e) ? 0 : Number.POSITIVE_INFINITY), 1, ["middle"]);
    const best =
        (centerLines ? nearestEnd(edges, (e, end) => tipGap(p, e, end, nodes), 3, ["source", "target"]) : null) ??
        pointed ??
        (held || middle === null || (ends !== null && ends.d < middle.d) ? ends : middle);
    if (best === null) {
        return null;
    }
    // the nearest end decides; a shape longer than that edge's own line (beyond a few pixels) is something else drawn
    // near it -- unless the line ends on it and it runs on to that end's node: a program that stops its line at its
    // arrowhead's base (Cytoscape desktop) draws a long arrowhead on a short edge longer than the line it caps
    const capsShortLine = (): boolean => {
        if (best.end === "middle" || toBox(endOf(best.e, best.end), p.box) > 2) {
            return false;
        }
        const id = best.end === "source" ? best.e.source : best.e.target;
        const n = nodes.find((m) => m.id === id);
        return n !== undefined && toBox([n.cx, n.cy], p.box) <= 0.5 * Math.max(n.w, n.h) + 3;
    };
    return size > Math.max(pathLength(best.e.points), 12) && !capsShortLine() ? null : { e: best.e, end: best.end };
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
    guide: { pairs: number; source: "nodes" | "labels" | "texts" | "extent" | "label-anchors" } | null;
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
    const canvas = background ?? "#ffffff";

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
            if (ends === null) {
                continue;
            }
            for (const part of parallelEdges(ps)) {
                const line = longestPath(part);
                if (line === undefined) {
                    continue;
                }
                part.forEach(take);
                const pairId = `${ends[0]}->${ends[1]}`;
                const k = edgeCount.get(pairId) ?? 0;
                edgeCount.set(pairId, k + 1);
                const heads = part.filter((p) => p !== line && p.kind === "shape");
                let { points } = line;
                const endOf = (h: Prim): "source" | "target" => {
                    const c: Pt = [cx(h.box), cy(h.box)];
                    const a = line.points[0];
                    const b = line.points.at(-1) ?? a;
                    return Math.hypot(c[0] - a[0], c[1] - a[1]) < Math.hypot(c[0] - b[0], c[1] - b[1])
                        ? "source"
                        : "target";
                };
                const arrows = heads.map((h) => {
                    const end = endOf(h);
                    points = extendToTip(points, h.points, end);
                    return arrowFrom(h, line.points, end, canvas);
                });
                // Graphviz's curve and icurve (and their l / r halves): a stroked stem along the line to the tip and
                // a stroked arc across it (arrows.c arrow_type_curve), both open paths; the stem carries the line to
                // the tip, the arc is the arrowhead, hollow. A piece of the route (an orthogonal route's rounded
                // corner, its next straight run) joins the line end to end; an arc of a cap joins nothing.
                const open = part.filter((q) => q !== line && q.kind === "path" && !q.closed && q.fill === null);
                const stems = open.filter((q) => !strokedArc(q) && alongEnd(q.points, line.points, endOf(q)));
                const joints = [line, ...open.filter((q) => !strokedArc(q) && !stems.includes(q))].flatMap((q) => [
                    q.points[0],
                    q.points.at(-1) ?? q.points[0],
                ]);
                const joins = (q: Prim): boolean =>
                    [q.points[0], q.points.at(-1) ?? q.points[0]].some((a) =>
                        joints.some((b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.05),
                    );
                const arcs = open.filter((q) => strokedArc(q) && !joins(q));
                // the stems first, so an arc is placed against the tip
                for (const p of [...stems, ...arcs]) {
                    const end = endOf(p);
                    // near the line's own end or the stem's tip (an icurve's arc sits at the stem's back, a curve's
                    // at its front)
                    const reach = Math.max(bw(p.box), bh(p.box));
                    const near = [line.points, points].some((q) => {
                        const tip = end === "target" ? (q.at(-1) ?? q[0]) : q[0];
                        return Math.hypot(cx(p.box) - tip[0], cy(p.box) - tip[1]) <= reach;
                    });
                    if (!near) {
                        continue;
                    }
                    if (arcs.includes(p)) {
                        // an l or r arc keeps the part to one side of the line (arrows.c), as graphty's cap cut to
                        // one side does: half an arrow
                        const shape = oneSided(p.points, line.points, end) ? "half" : "half-circle";
                        arrows.push({ ...arrowFrom(p, line.points, end, canvas), shape, filled: false });
                    }
                    points = extendToTip(points, p.points, end);
                }
                edges.push({
                    id: `${pairId}#${String(k)}`,
                    source: ends[0],
                    target: ends[1],
                    points,
                    stroke: line.stroke,
                    arrows,
                    label: mergeTexts(part.flatMap((p) => (p.text ? [p.text] : []))),
                });
            }
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
    // a specimen sheet's caption (`cap-*`) is words, never a body: drawn as text only, it would take the body of the
    // specimen beside it (the captions are left out of the comparison, and still frame it as texts)
    const guideNodes = guide.nodes.filter((n) => !nodes.has(n.id) && !n.id.startsWith("cap-"));
    let guideInfo: Association["guide"] = null;
    if (guideNodes.length > 0) {
        const pool = free();
        const containers = containerGroups(guide);
        // Through one frame: graphty's drawing carried into the oracle's, refitted once on the bodies it finds; the
        // frame graphty's groups are carried into the oracle's by is the refit one, when there is one.
        const frameThrough = (at: Seed | null): { framed: Map<string, Prim[]>; groupFrame: Similarity | null } => {
            if (at === null) {
                return { framed: new Map(), groupFrame: null };
            }
            const first = matchBodies(guideNodes, pool, through(at.t), containers);
            const pairs = [...first].map(([id, shapes]) => {
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
            return refit === null
                ? { framed: first, groupFrame: at.t }
                : { framed: matchBodies(guideNodes, pool, through(refit), containers), groupFrame: refit };
        };
        // The free texts both draw frame the drawing too (a specimen sheet's captions, where its nodes carry no
        // labels), when they find more bodies than the frame without them: a program may set every caption off its
        // node by more than a small node's size.
        let seed = seedTransform(guide, nodes, pool, width, height);
        let { framed, groupFrame } = frameThrough(seed);
        const byTexts = seedTransform(guide, nodes, pool, width, height, true);
        if (byTexts !== null && byTexts !== seed && byTexts.source === "texts") {
            const other = frameThrough(byTexts);
            if (other.framed.size > framed.size) {
                seed = byTexts;
                ({ framed, groupFrame } = other);
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
            const framedGroups = through(groupFrame ?? seed.t);
            anchored = matchBodies(
                guideNodes,
                pool,
                (n) => {
                    const at = anchors.get(n.id);
                    return at === undefined
                        ? null
                        : { x: cx(at.box), y: cy(at.box), s: textScale * guideSize(n), reach: 1.5 };
                },
                containers,
                framedGroups,
            );
        }
        const useAnchors = anchored.size > framed.size;
        guideInfo = seed === null ? null : { pairs: seed.pairs, source: useAnchors ? "label-anchors" : seed.source };
        const chosen = useAnchors ? anchored : framed;
        // An outline painted as a fill that no body took as its own (a zigzag spiking past a small node, its center
        // off the body's) belongs to the node it rings: of the bodies with no outline, the nearest whose center it holds.
        const claimed = new Set([...chosen.values()].flat().map((p) => p.index));
        for (const ring of pool.filter((p) => p.tag === PAINTED_OUTLINE && !claimed.has(p.index))) {
            let best: { id: string; d: number } | null = null;
            for (const [id, shapes] of chosen) {
                const body = shapes[0];
                const c: Pt = [cx(body.box), cy(body.box)];
                const d = Math.hypot(c[0] - cx(ring.box), c[1] - cy(ring.box));
                if (inside(c, ring.box) && !shapes.some((q) => q.stroke !== null) && (best === null || d < best.d)) {
                    best = { id, d };
                }
            }
            if (best !== null) {
                chosen.set(best.id, [...(chosen.get(best.id) ?? []), ring]);
            }
        }
        for (const [id, drawn] of [...chosen].sort(([x], [y]) => compareIds(x, y))) {
            // an underlay is left free: graphty draws one there or the oracle draws a shape graphty does not
            const under = underlaysOf(drawn);
            const shapes = drawn.filter((p) => !under.has(p));
            shapes.forEach(take);
            nodes.set(id, nodeFrom(id, shapes, []));
        }
    }

    // ---- edges by geometry: open paths whose two ends land on drawn nodes
    const nodeList = [...nodes.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
    const nodeBox = boxOfNode;
    // How far from a node's box a path's end still lands on it: past a thick border too, which a line ends at the
    // outer edge of (Cytoscape's mapped widths run to 7 px, its dots and zigzags are drawn outside the node's
    // outline); a border of a pixel or so is inside the slack already.
    const endReach = (n: PNode): number => {
        const border = n.stroke !== null && Number.isFinite(n.stroke.width) ? n.stroke.width : 0;
        return Math.max(15, 0.5 * Math.max(n.w, n.h)) + (border >= 2 ? border : 0);
    };
    // The closed shapes no body took that hold no node (arrowheads among them, of any size: Cytoscape desktop's arrow
    // size 24 is 51 px long): a line a program stops at its arrowhead's base (Cytoscape desktop's) ends an
    // arrowhead's length short of its node, so an end reaches as far as the shape it touches does.
    const heads = free().filter((q) => q.kind === "shape" && !nodeList.some((n) => inside([n.cx, n.cy], q.box)));
    const gap = (a: PBox, b: PBox): number =>
        Math.hypot(Math.max(b.x0 - a.x1, 0, a.x0 - b.x1), Math.max(b.y0 - a.y1, 0, a.y0 - b.y1));
    // every node a path's end lands on, nearest first; through a shape it touches only where it lands on none itself
    // (an end at a crowded node also touches the arrowheads of the edges beside it)
    const nodesAt = (p: Pt, throughHeads = false): { n: PNode; d: number }[] => {
        const at = (d: (n: PNode) => number): { n: PNode; d: number }[] =>
            nodeList
                .map((n) => ({ n, d: d(n) }))
                .filter(({ n, d: x }) => x <= endReach(n))
                .sort((x, y) => x.d - y.d);
        // how far from where a line ends on the node, its outline or its center: an end inside a big node's box but on
        // a small node's outline drawn over it is the small node's (cys-affinity-purification: a flat round rectangle
        // drawn inside an octagon's box, each with its own edges to the same nodes); an ellipse's outline is its own,
        // not its box's (cys-import-and-save: an end on a small circle's outline, in its box's corner, beside another
        // circle's box); and a program that runs its lines to the centers ends them there
        const direct = at((n) => {
            const b = nodeBox(n);
            const [rx, ry] = [bw(b) / 2, bh(b) / 2];
            const center = Math.hypot(p[0] - cx(b), p[1] - cy(b));
            if (n.shape === "ellipse" && rx > 0 && ry > 0) {
                const k = Math.hypot((p[0] - cx(b)) / rx, (p[1] - cy(b)) / ry);
                return Math.min(center, Math.abs(k - 1) * Math.min(rx, ry));
            }
            return inside(p, b) ? Math.min(center, p[0] - b.x0, b.x1 - p[0], p[1] - b.y0, b.y1 - p[1]) : toBox(p, b);
        });
        if (direct.length > 0 && !throughHeads) {
            return direct;
        }
        const touched = heads.filter((h) => toBox(p, h.box) <= 2).map((h) => h.box);
        return touched.length === 0 ? [] : at((n) => Math.min(...touched.map((b) => gap(b, nodeBox(n)))));
    };
    // The edges graphty draws, by unordered pair, still to be found in the oracle. Where nodes overlap, a path's
    // end lands on several of them, and the nearest is often not the one the edge ends at (a small node drawn
    // over a big one's edge): the pair graphty also draws is the one the path stands for.
    const pairOf = (a: string, b: string): string => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);
    const guidePairs = new Map<string, number>();
    const guideColors = new Map<string, Set<string>>();
    for (const e of guide.edges) {
        const k = pairOf(e.source, e.target);
        guidePairs.set(k, (guidePairs.get(k) ?? 0) + 1);
        guideColors.set(k, (guideColors.get(k) ?? new Set()).add(e.stroke?.color ?? ""));
    }
    // A group graphty draws (a WikiPathways complex) is an edge end too: an end that lands on one of its members may
    // end at the group's box. It stands in as a node with the group's id, its members' box.
    const groupEnds = guide.groups.flatMap((g) => {
        const held = g.members.flatMap((id) => {
            const n = nodes.get(id);
            return n === undefined ? [] : [n];
        });
        if (held.length === 0 || nodes.has(g.id)) {
            return [];
        }
        const box = union(held.map(boxOfNode));
        const node: PNode = { ...held[0], id: g.id, cx: cx(box), cy: cy(box), w: bw(box), h: bh(box), label: null };
        return [{ node, members: new Set(held) }];
    });
    const withGroups = (at: { n: PNode; d: number }[]): { n: PNode; d: number }[] => [
        ...at,
        ...groupEnds.flatMap((g) => {
            const d = Math.min(...at.filter((x) => g.members.has(x.n)).map((x) => x.d));
            return Number.isFinite(d) ? [{ n: g.node, d }] : [];
        }),
    ];
    const guideLoops = new Set(guide.edges.filter((e) => e.source === e.target).map((e) => e.source));
    const endsOf = (path: readonly Pt[], color: string): [PNode, PNode] | null => {
        const from = withGroups(nodesAt(path[0]));
        const to = withGroups(nodesAt(path.at(-1) ?? path[0]));
        if (from.length === 0 || to.length === 0) {
            return null;
        }
        let nearest: [PNode, PNode] = [from[0].n, to[0].n];
        // A short line under a long arrowhead (Cytoscape desktop's arrow size 24 on an edge between small nodes: a
        // 13 px stub and a 51 px head; or between big ones, xgmml-pathguide-allpathwaysdb -27->-22) ends within a
        // node's reach of the node it starts from: where the file has no loop there, its end farther from that node,
        // the one under the head, lands on the node the head reaches instead.
        if (nearest[0] === nearest[1] && !guideLoops.has(nearest[0].id)) {
            const off = (q: Pt): number => Math.hypot(q[0] - nearest[0].cx, q[1] - nearest[0].cy);
            const far = off(path[0]) > off(path.at(-1) ?? path[0]) ? 0 : 1;
            const other = withGroups(nodesAt(far === 0 ? path[0] : (path.at(-1) ?? path[0]), true)).find(
                (x) => x.n !== nearest[0] && (guidePairs.get(pairOf(x.n.id, nearest[0].id)) ?? 0) > 0,
            )?.n;
            if (other !== undefined) {
                nearest = far === 0 ? [other, nearest[1]] : [nearest[0], other];
            }
        }
        // a path whose nearest ends are one node is a piece of that node's drawing, or a loop: never re-read
        if (nearest[0] === nearest[1] || (guidePairs.get(pairOf(nearest[0].id, nearest[1].id)) ?? 0) > 0) {
            return nearest;
        }
        // nearest first; among pairs as near as each other (two lines' stations drawn one over another), the one
        // graphty draws in the path's color
        const pairs = from
            .flatMap((x) => to.map((y) => ({ a: x.n, b: y.n, d: x.d + y.d })))
            .filter(({ a, b }) => a !== b && (guidePairs.get(pairOf(a.id, b.id)) ?? 0) > 0)
            .sort((x, y) => x.d - y.d);
        const tied = pairs.filter((q) => q.d <= (pairs[0]?.d ?? 0) + 2);
        const known = tied.find((q) => guideColors.get(pairOf(q.a.id, q.b.id))?.has(color) === true) ?? pairs.at(0);
        return known === undefined ? nearest : [known.a, known.b];
    };
    // every edge found by geometry, the pieces that are no edge of the file among them, in the order found
    const withPieces: PEdge[] = [];
    const geoEdges = new Map<string, number>();
    /** Where in the drawing each edge found by geometry was drawn: what is drawn first lies under what comes after. */
    const drawnAt = new Map<PEdge, number>();
    const arcs: { readonly p: Prim; readonly piece: PEdge | null }[] = [];
    // An edge's line a program drew as a filled band (Cytoscape desktop's zigzag, sine-wave, dotted, slashed and double
    // edges), its route the band's axis: one of the pairs graphty draws, between two nodes, read after the lines.
    const bands = free().flatMap((p) => {
        if (p.kind !== "shape" || p.fill === null || p.stroke !== null || p.subpaths === undefined) {
            return [];
        }
        // a plain filled bar along an edge is something else drawn there (an edge label's background box)
        const band = bandPaintedAsFill(p.subpaths);
        const ends = band === null || band.dashClass === "solid" ? null : endsOf(band.ends, p.fill.color);
        if (band === null || ends === null || ends[0] === ends[1] || !guidePairs.has(pairOf(ends[0].id, ends[1].id))) {
            return [];
        }
        const line: Prim = {
            ...p,
            kind: "path",
            closed: false,
            points: band.ends,
            fill: null,
            stroke: {
                color: p.fill.color,
                opacity: p.fill.opacity,
                width: band.width ?? Number.NaN,
                dash: null,
                dashClass: band.dashClass,
                painted: true,
                ...(band.patterned ? { patterned: true } : {}),
            },
        };
        return [line];
    });
    for (const p of [...free().filter((q) => q.kind === "path"), ...bands]) {
        if (p.kind !== "path" || p.stroke === null || p.points.length < 2) {
            continue;
        }
        const ends = endsOf(p.points, p.stroke.color);
        if (ends === null) {
            continue;
        }
        const [a, b] = ends;
        // a band is an edge only while graphty draws one between its nodes that no line of the drawing has taken
        if (p.stroke.painted === true && (guidePairs.get(pairOf(a.id, b.id)) ?? 0) <= 0) {
            continue;
        }
        const pk = pairOf(a.id, b.id);
        guidePairs.set(pk, (guidePairs.get(pk) ?? 0) - 1);
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
        drawnAt.set(edge, p.index);
        if (!(a === b && !guideLoops.has(a.id))) {
            edges.push(edge);
        } else if (
            p.points.length >= 5 &&
            (Math.max(bw(p.box), bh(p.box)) < 0.5 * Math.max(a.w, a.h) ||
                (strokedArc(p) && Math.max(bw(p.box), bh(p.box)) <= 3 * Math.max(a.w, a.h, 8)))
        ) {
            // a small curved open stroke beside one node may be an arrowhead drawn as a stroke (Cytoscape's open
            // half circle; vis-network's curve and inv_curve, a half circle larger than a small node), judged with the
            // arrowheads below
            arcs.push({ p, piece: edge });
        }
    }
    // A self-loop a program draws as a whole circle on its node's outline (vis-network's selfReference) is a closed
    // stroked shape, or a path whose ends meet, with no end on the node: where graphty draws a loop on that node and no line was found for it, the circle
    // centered off the node that crosses its outline is the loop. So is a polyline from the node's center through its
    // bends back to it (OGDF's drawSVG of a loop with bends).
    const loopsFound = (id: string): number => geoEdges.get(`${id}->${id}`) ?? 0;
    const loopsWanted = (id: string): number => guide.edges.filter((e) => e.source === id && e.target === id).length;
    const ringed = (p: Prim): boolean => {
        const [a, b] = [p.points[0], p.points.at(-1) ?? p.points[0]];
        // a closed shape, or an open path whose ends meet (an arc drawn all the way round)
        return p.kind === "shape" ? p.closed : p.kind === "path" && Math.hypot(b[0] - a[0], b[1] - a[1]) < 1;
    };
    for (const p of free()) {
        if (!ringed(p) || p.fill !== null || p.stroke === null || p.points.length < 5) {
            continue;
        }
        const c: Pt = [cx(p.box), cy(p.box)];
        const n = nodeList.find(
            (m) =>
                guideLoops.has(m.id) &&
                // a ring with corners is a loop only drawn through the node's own middle (OGDF's drawSVG runs a loop
                // from the node's center through its bends and back), never a polygon beside it
                (p.corners === 0 ||
                    p.points.some((q) => Math.abs(q[0] - m.cx) < 0.25 * m.w && Math.abs(q[1] - m.cy) < 0.25 * m.h)) &&
                loopsFound(m.id) < loopsWanted(m.id) &&
                // centered off the node, on or beyond its outline
                Math.hypot(c[0] - m.cx, c[1] - m.cy) > 0.4 * Math.min(m.w, m.h) &&
                Math.hypot(c[0] - m.cx, c[1] - m.cy) <= (Math.max(bw(p.box), bh(p.box)) + Math.max(m.w, m.h)) / 2,
        );
        if (n === undefined) {
            continue;
        }
        take(p);
        // run the circle from its point nearest the node's center round to it again, so the part the node covers is at
        // both ends of the route, where a route is cut at the node's outline, as a loop leaving and re-entering it
        const ring = p.points.slice(0, -1);
        const nearest = ring.reduce(
            (best, q, i) =>
                Math.hypot(q[0] - n.cx, q[1] - n.cy) < Math.hypot(ring[best][0] - n.cx, ring[best][1] - n.cy)
                    ? i
                    : best,
            0,
        );
        const around = [...ring.slice(nearest), ...ring.slice(0, nearest), ring[nearest]];
        // and the way round graphty's loop on that node runs: a route is judged point by point along it
        const wanted = guide.edges.find((e) => e.source === n.id && e.target === n.id);
        const turn = (pts: readonly Pt[]): number =>
            Math.sign(
                pts.reduce(
                    (sum, [x0, y0], i) => sum + x0 * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * y0,
                    0,
                ),
            );
        const route = wanted !== undefined && turn(wanted.points) * turn(around) < 0 ? around.reverse() : around;
        const key = `${n.id}->${n.id}`;
        const k = loopsFound(n.id);
        geoEdges.set(key, k + 1);
        const edge: PEdge = {
            id: `${key}#g${String(k)}`,
            source: n.id,
            target: n.id,
            points: route,
            stroke: p.stroke,
            arrows: [],
            label: null,
        };
        withPieces.push(edge);
        drawnAt.set(edge, p.index);
        edges.push(edge);
    }
    // A line drawn under a narrower one along the same route between the same nodes is that edge's outline
    // (Cytoscape.js's line outline, vis-network's edge background, in dashes of its own with `background.dashes`): one
    // edge with a band under its line, not two. A band is solid or dashed; a pattern drawn as a shape is a line.
    for (const under of [...edges]) {
        const band = under.stroke;
        if (
            !under.id.includes("#g") ||
            band === null ||
            !["solid", "dashed", "dotted", "dash-dot"].includes(band.dashClass) ||
            !Number.isFinite(band.width)
        ) {
            continue;
        }
        const tol = Math.max(band.width, 2);
        const over = edges.find(
            (e) =>
                e !== under &&
                e.id.includes("#g") &&
                e.stroke !== null &&
                e.outline === undefined &&
                pairOf(e.source, e.target) === pairOf(under.source, under.target) &&
                (drawnAt.get(e) ?? -1) > (drawnAt.get(under) ?? -1) &&
                band.width >= 1.2 * e.stroke.width &&
                sameRoute(e.points, under.points, tol),
        );
        if (over === undefined) {
            continue;
        }
        over.outline = {
            color: band.color,
            opacity: band.opacity,
            width: band.width,
            ...(band.dashClass === "solid" ? {} : { dashClass: band.dashClass }),
        };
        edges.splice(edges.indexOf(under), 1);
        withPieces.splice(withPieces.indexOf(under), 1);
    }
    // a drawing whose lines mostly run on to the nodes' centers draws its arrowheads at the nodes' outlines
    const atCenter = (e: PEdge, end: "source" | "target"): boolean => {
        const n = nodes.get(end === "source" ? e.source : e.target);
        const q = end === "source" ? e.points[0] : (e.points.at(-1) ?? e.points[0]);
        return n !== undefined && Math.hypot(q[0] - n.cx, q[1] - n.cy) <= 2;
    };
    const lines = edges.filter((e) => e.id.includes("#g") && e.source !== e.target);
    const centerLines =
        lines.length > 0 &&
        lines.filter((e) => atCenter(e, "source") && atCenter(e, "target")).length > 0.5 * lines.length;
    // arrowheads: small closed shapes at an edge's end -- not a box drawn tight behind words (a label's background
    // near an edge's end), which the labels take below
    const wordsDrawn = free().flatMap((p) => (p.text === null ? [] : [p.text]));
    const knockouts = new Map<string, { arrow: PArrow; box: PBox }>();
    for (const p of free()) {
        const picture = p.kind === "image";
        if ((p.kind !== "shape" && !picture) || wordsDrawn.some((t) => t.sizePx > 0 && backsText(p, t))) {
            continue;
        }
        const best = arrowheadEdge(p, withPieces, nodeList, centerLines);
        // a picture is an arrowhead only centered on its line, as vis-network stands one there; a picture beside an
        // edge's end (an annotation's, a node's offset graphic) is not
        if (best === null || (picture && !centeredOnLine(p.box, best.e, best.end))) {
            continue;
        }
        // a shape inside its node's box at the end of a piece of that node's own drawing is more of that drawing (a
        // chart's slice beside the line between two slices, cys-specimen-images-charts' ring), left free to be judged
        // against what graphty draws there, never swallowed as the piece's arrowhead
        const owner = best.e.source === best.e.target ? nodes.get(best.e.source) : undefined;
        if (owner !== undefined && !edges.includes(best.e) && within(p.box, nodeBox(owner))) {
            continue;
        }
        take(p);
        // a picture at an edge's end is its arrowhead (vis-network's image arrows), measured by its box, its colors
        // its own
        if (picture) {
            const { x0, y0, x1, y1 } = p.box;
            const corners: Pt[] = [
                [x0, y0],
                [x1, y0],
                [x1, y1],
                [x0, y1],
            ];
            best.e.arrows.push(
                measureArrow(corners, best.e.points, best.end, { filled: true, color: null, shape: "image" }),
            );
            continue;
        }
        // A cap no wider than the line itself (Cytoscape draws a line-wide dot for arrow shape
        // NONE) shows nothing beyond the line: it is part of the line, not an arrowhead.
        if (Math.max(bw(p.box), bh(p.box)) > lineCapSize(best.e)) {
            const arrow = arrowFrom(p, best.e.points, best.end, canvas);
            // Cytoscape.js erases the canvas under a translucent edge's arrowhead before it paints it (cytoscape.js
            // 3.34.3 `drawArrowhead`: the same shape filled white under `destination-out`, which the SVG replay records
            // as a white fill): that erasure is not a hollow arrow of its own, the arrow painted over it is the head
            const key = `${best.e.id}\u0000${best.end}`;
            const under = knockouts.get(key);
            if (under !== undefined && arrow.filled && sameBox(under.box, p.box)) {
                best.e.arrows.splice(best.e.arrows.indexOf(under.arrow), 1, arrow);
                continue;
            }
            if (!arrow.filled && p.fill !== null) {
                knockouts.set(key, { arrow, box: p.box });
            }
            best.e.arrows.push(arrow);
            if (best.end !== "middle") {
                best.e.points = extendToTip(best.e.points, p.points, best.end);
            }
        }
    }
    // a small open stroke at an edge's end is its arrowhead, beside the line, which it does not carry on
    // a small curved open stroke no edge took, across an edge's end: that end's arrowhead drawn as a stroke (vis-network's
    // curve and inv_curve caps, a semicircle a third of the arrow's length across the line at its end), or across its
    // middle: its middle arrow drawn so (vis-network's arrows.middle type curve)
    for (const p of free()) {
        if (strokedArc(p)) {
            arcs.push({ p, piece: null });
        }
    }
    for (const { p, piece } of arcs) {
        const best = arrowheadEdge(
            p,
            withPieces.filter((e) => e !== piece),
            nodeList,
            centerLines,
        );
        if (
            best !== null &&
            (best.end !== "middle" || piece === null) &&
            best.e.arrows.every((x) => x.end !== best.end) &&
            capsAcross(p.points, best.e, best.end)
        ) {
            if (piece === null) {
                take(p);
            }
            const arrow = arrowFrom(p, best.e.points, best.end, canvas);
            // a stroke bent round is the round side of a half circle alone, whichever way it bulges (vis-network's
            // curve bulges toward the node, its inv_curve away from it): hollow
            best.e.arrows.push(strokedArc(p) ? { ...arrow, shape: "half-circle", filled: false } : arrow);
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
    const textPrims = stackedTexts(free().filter((p) => p.text !== null));
    const reachOf = (n: PNode): number => 3 * Math.max(n.w, n.h, 20);
    // a label the program wraps at other words than graphty: its stacked lines are wanted as one text
    for (const w of wanting) {
        const whole = w.lines.join(" ");
        const near = (p: Prim): boolean => Math.hypot(cx(p.box) - w.n.cx, cy(p.box) - w.n.cy) <= reachOf(w.n);
        if (w.lines.length > 1 && textPrims.some((p) => norm(p.text?.content ?? "") === whole && near(p))) {
            w.lines = [whole];
            w.picked = [undefined];
        }
    }
    const candidates = wanting.flatMap((w) => {
        const reach = reachOf(w.n);
        return w.lines.flatMap((line, li) =>
            textPrims
                .filter((p) => norm(p.text?.content ?? "") === line)
                .map((p) => ({ w, li, p, d: Math.hypot(cx(p.box) - w.n.cx, cy(p.box) - w.n.cy) }))
                .filter((c) => c.d <= reach),
        );
    });
    candidates.sort((a, b) => a.d - b.d || a.p.index - b.p.index || compareIds(a.w.n.id, b.w.n.id) || a.li - b.li);
    for (const c of candidates) {
        const parts = runParts.get(c.p) ?? [c.p];
        if (parts.every((q) => !used.has(q.index)) && c.w.picked[c.li] === undefined) {
            parts.forEach(take);
            c.w.picked[c.li] = c.p;
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
    // one guide edge per pair, a labelled one where parallel edges are not all labelled
    const guideEdges = new Map<string, (typeof guide.edges)[number]>();
    for (const e of guide.edges) {
        const k = `${e.source}\u0000${e.target}`;
        if ((guideEdges.get(k)?.label ?? null) === null) {
            guideEdges.set(k, e);
        }
    }
    // closest pairs first, as node labels are: many edges of a line can carry the same words, and an edge met early
    // must not take a text that sits nearer the edge it belongs to
    const freeTexts = [...free().filter((p) => p.text !== null), ...besideTexts(free().filter((p) => p.text !== null))];
    const wantOf = (e: PEdge): string | undefined =>
        (guideEdges.get(`${e.source}\u0000${e.target}`) ?? guideEdges.get(`${e.target}\u0000${e.source}`))?.label
            ?.content;
    const edgeCandidates = edges.flatMap((e, ei) => {
        const want = wantOf(e);
        if (e.label !== null || want === undefined) {
            return [];
        }
        // the whole label near the edge's middle
        const mid = e.points[Math.floor(e.points.length / 2)];
        return freeTexts
            .filter((p) => norm(p.text?.content ?? "") === norm(want))
            .map((p) => ({ ei, p, d: Math.hypot(cx(p.box) - mid[0], cy(p.box) - mid[1]) }));
    });
    edgeCandidates.sort((a, b) => a.d - b.d || a.p.index - b.p.index || a.ei - b.ei);
    for (const c of edgeCandidates) {
        const e = edges[c.ei];
        const parts = runParts.get(c.p) ?? [c.p];
        if (e.label === null && parts.every((q) => !used.has(q.index)) && c.p.text) {
            parts.forEach(take);
            e.label = c.p.text;
        }
    }
    // else each line near any point of the edge: a label at each end (a source and a target label) is drawn as texts
    // of their own
    for (const e of edges) {
        const want = wantOf(e);
        if (e.label !== null || want === undefined) {
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
    const twins = guideTwins(groups, guide, nodeList);
    for (const g of groups) {
        if (g.members.length === 0) {
            g.members = nodeList.filter((n) => inside([n.cx, n.cy], g.box)).map((n) => n.id);
        }
        if (g.label === null) {
            const twin = twins.get(g);
            if (twin === undefined) {
                labelUnpaired(g, free(), nodeList, take);
            } else if (twin.label !== null) {
                labelLike(g, twin.label.content, free(), take);
            }
            // a group graphty draws over the same box with no label: the words inside it are another element's
        }
    }

    // ---- label backgrounds: a box drawn tight round a label's words, under them (Cytoscape.js's text-background and
    // text-border, Cytoscape desktop's label background), is the label's, not a stray
    // A box graphty draws as an annotation round a node's label (a Cytoscape shape annotation framing it) is that
    // annotation, not the label's background: graphty's annotations carried to the oracle's label, by the two labels'
    // middles and font sizes.
    const guideAnnotations = (n: PNode | undefined, t: PText): PBox[] => {
        const gl = n === undefined ? null : guideById.get(n.id)?.label;
        if (gl === null || gl === undefined || !(gl.sizePx > 0)) {
            return [];
        }
        const k = t.sizePx / gl.sizePx;
        const at = (x: number, y: number): Pt => [cx(t.box) + (x - cx(gl.box)) * k, cy(t.box) + (y - cy(gl.box)) * k];
        return guide.strays
            .filter((a) => a.kind === "shape")
            .map((a) => boxOfPoints([at(a.box.x0, a.box.y0), at(a.box.x1, a.box.y1)]));
    };
    const labelled = [
        ...nodeList.map((n) => ({ t: n.label, n })),
        ...[...edges].sort((a, b) => compareIds(a.id, b.id)).map((e) => ({ t: e.label, n: undefined })),
        ...[...groups].sort((a, b) => compareIds(a.id, b.id)).map((g) => ({ t: g.label, n: undefined })),
    ].filter((x): x is { t: PText; n: PNode | undefined } => x.t !== null && x.t.sizePx > 0);
    for (const { t, n } of labelled) {
        const framed = guideAnnotations(n, t);
        const backs = free()
            .filter((p) => p.kind === "shape" && backsText(p, t) && !framed.some((b) => boxIoU(b, p.box) >= 0.5))
            .sort((a, b) => area(a.box) - area(b.box) || a.index - b.index);
        const filled = backs.find((p) => p.fill !== null);
        const bordered = backs.find((p) => p.stroke !== null && (filled === undefined || p.fill === null));
        const parts = [filled, bordered].filter((p): p is Prim => p !== undefined);
        if (parts.length === 0) {
            continue;
        }
        parts.forEach(take);
        // its shape as drawn along the words: a turned label's box turned back first
        const drawn = filled ?? parts[0];
        const a = (-t.rotation * Math.PI) / 180;
        const [ox, oy] = [cx(drawn.box), cy(drawn.box)];
        const upright = drawn.points.map(([x, y]): Pt => [
            ox + (x - ox) * Math.cos(a) - (y - oy) * Math.sin(a),
            oy + (x - ox) * Math.sin(a) + (y - oy) * Math.cos(a),
        ]);
        const outline = shapeOf(t.rotation === 0 ? drawn : { ...drawn, points: upright, box: boxOfPoints(upright) });
        t.background = {
            box: union(parts.map((p) => p.box)),
            fill: filled?.fill ?? null,
            stroke: (bordered ?? filled)?.stroke ?? null,
            shape:
                outline === "rect" || outline === "roundrect" || outline === "ellipse" || outline === null
                    ? outline
                    : "other",
        };
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
 * Whether a shape is the box drawn behind a label: it holds the label's middle and most of its words, and reaches past
 * them by no more than two font sizes on any side (a node's body or a group box round a label reaches much further).
 * @param p - the shape
 * @param t - the label
 * @returns true for a label background
 */
function backsText(p: Prim, t: PText): boolean {
    const reach = Math.max(2 * t.sizePx, 4);
    const b = p.box;
    const w = Math.min(b.x1, t.box.x1) - Math.max(b.x0, t.box.x0);
    const h = Math.min(b.y1, t.box.y1) - Math.max(b.y0, t.box.y0);
    const covered = w > 0 && h > 0 ? (w * h) / Math.max(area(t.box), 1e-9) : 0;
    return (
        (p.fill !== null || p.stroke !== null) &&
        inside([cx(t.box), cy(t.box)], b) &&
        covered >= 0.6 &&
        b.x0 >= t.box.x0 - reach &&
        b.y0 >= t.box.y0 - reach &&
        b.x1 <= t.box.x1 + reach &&
        b.y1 <= t.box.y1 + reach
    );
}

/** Intersection over union of two boxes. */
function boxIoU(a: PBox, b: PBox): number {
    const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
    const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    const inter = w > 0 && h > 0 ? w * h : 0;
    const union = area(a) + area(b) - inter;
    return union > 0 ? inter / union : 0;
}

/**
 * Each oracle group paired with the group graphty drew over the same box: by id when the markup
 * named it, else by box overlap through the fit of the nodes both sides drew, best overlap first.
 * Pairing by box, not by the first words inside it, gives a nested group its own label: the words
 * of an inner group sit inside the outer box too, and a label drawn above its box sits outside it.
 * @param groups - the oracle's groups
 * @param guide - graphty's drawing
 * @param nodes - the oracle's nodes, by graphty's ids
 * @returns graphty's group, by oracle group; an oracle group graphty draws no group over is absent
 */
function guideTwins(groups: readonly PGroup[], guide: PScene, nodes: readonly PNode[]): Map<PGroup, PGroup> {
    const out = new Map<PGroup, PGroup>();
    const left = [...guide.groups];
    for (const g of groups) {
        const k = left.findIndex((x) => x.id === g.id);
        if (k >= 0) {
            out.set(g, left.splice(k, 1)[0]);
        }
    }
    const byId = new Map(guide.nodes.map((n) => [n.id, n]));
    const pairs = nodes.flatMap((n) => {
        const at = byId.get(n.id);
        return at === undefined ? [] : [{ from: [at.cx, at.cy] as Pt, to: [n.cx, n.cy] as Pt }];
    });
    const t =
        pairs.length >= 2
            ? fitSimilarity(
                  pairs.map((q) => q.from),
                  pairs.map((q) => q.to),
              )
            : null;
    if (t === null) {
        return out;
    }
    const framed = left.map((x) => {
        const a = apply(t, [x.box.x0, x.box.y0]);
        const b = apply(t, [x.box.x1, x.box.y1]);
        const box = {
            x0: Math.min(a[0], b[0]),
            y0: Math.min(a[1], b[1]),
            x1: Math.max(a[0], b[0]),
            y1: Math.max(a[1], b[1]),
        };
        return { x, box };
    });
    const cand = groups
        .filter((g) => !out.has(g))
        .flatMap((g) => framed.map((f) => ({ g, f, v: boxIoU(g.box, f.box) })))
        .filter((c) => c.v >= 0.3)
        .sort((a, b) => b.v - a.v || (a.g.id < b.g.id ? -1 : 1) || (a.f.x.id < b.f.x.id ? -1 : 1));
    const used = new Set<PGroup>();
    for (const c of cand) {
        if (!out.has(c.g) && !used.has(c.f.x)) {
            out.set(c.g, c.f.x);
            used.add(c.f.x);
        }
    }
    return out;
}

/**
 * Labels a group with graphty's words for it, wherever the program put them: inside the box or
 * just outside it (Cytoscape.js draws a compound's label above its box), and even where a node
 * drawn later covers them (Cytoscape desktop paints its nodes in an order of its own, which the
 * file does not give: two loads of one file paint in different orders).
 * @param g - the group, labeled in place
 * @param want - graphty's label for it
 * @param free - the free primitives
 * @param take - marks a primitive used
 */
function labelLike(g: PGroup, want: string, free: readonly Prim[], take: (p: Prim) => Prim): void {
    const find = (line: string): Prim | undefined =>
        free
            .filter(
                (p) =>
                    p.text !== null &&
                    norm(p.text.content) === line &&
                    inside([cx(p.box), cy(p.box)], g.box, 2 * bh(p.box)),
            )
            .sort((a, b) => a.box.y0 - b.box.y0 || a.index - b.index)[0];
    // the words as one text, else line by line
    const whole = find(norm(want));
    const picked =
        whole === undefined
            ? want
                  .split("\n")
                  .map(norm)
                  .filter((line) => line !== "")
                  .flatMap((line) => {
                      const hit = find(line);
                      return hit === undefined ? [] : [take(hit)];
                  })
            : [take(whole)];
    g.label = mergeTexts(picked.flatMap((p) => (p.text ? [p.text] : [])));
}

/**
 * Labels a group graphty draws no group over with the first words inside its box that sit in no
 * node.
 * @param g - the group, labeled in place
 * @param free - the free primitives
 * @param nodeList - the oracle's nodes
 * @param take - marks a primitive used
 */
function labelUnpaired(g: PGroup, free: readonly Prim[], nodeList: readonly PNode[], take: (p: Prim) => Prim): void {
    const hit = free
        .filter((p) => p.text !== null && inside([cx(p.box), cy(p.box)], g.box))
        .filter((p) => !nodeList.some((n) => inside([cx(p.box), cy(p.box)], boxOfNode(n))))
        .sort((a, b) => a.box.y0 - b.box.y0 || a.index - b.index)[0];
    if (hit?.text) {
        take(hit);
        g.label = hit.text;
    }
}

/**
 * A first graphty-to-oracle similarity: from nodes the markup already named, else from label
 * text both sides draw once, else from the drawings' extents.
 */
/** A first graphty-to-oracle frame, and the label anchors it came from. */
interface Seed {
    t: Similarity;
    pairs: number;
    source: "nodes" | "labels" | "texts" | "extent";
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
    withTexts = false,
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
    const oracleTexts = count(stackedTexts(free.filter((p) => p.text !== null)), (p) => norm(p.text?.content ?? ""));
    const labelled = guide.nodes.filter((n) => n.label !== null && n.label.content !== "");
    const pairs: { from: Pt; to: Pt }[] = [];
    const anchors = new Map<string, Prim>();
    // a label's first line, then all its lines as one: the program may wrap it elsewhere (its stacked lines are
    // joined too)
    for (const key of [
        (n: PNode): string => norm((n.label?.content ?? "").split("\n")[0]),
        (n: PNode): string => norm((n.label?.content ?? "").replace(/\n/g, " ")),
    ]) {
        const guideTexts = count(labelled, key);
        for (const [text, gs] of [...guideTexts].sort(([a], [b]) => compareIds(a, b))) {
            const os = oracleTexts.get(text);
            if (gs.length === 1 && os?.length === 1 && !anchors.has(gs[0].id)) {
                pairs.push({ from: [gs[0].cx, gs[0].cy], to: [cx(os[0].box), cy(os[0].box)] });
                anchors.set(gs[0].id, os[0]);
            }
        }
    }
    // asked for, and too few labels: the free texts both draw (a label-only node's words, a specimen sheet's
    // captions), middle onto middle
    const labelPairs = pairs.length;
    const freeTexts = count(withTexts && labelPairs < 3 ? guide.texts.filter((t) => norm(t.content) !== "") : [], (t) =>
        norm(t.content),
    );
    for (const [text, gs] of [...freeTexts].sort(([a], [b]) => compareIds(a, b))) {
        const os = oracleTexts.get(text);
        if (gs.length === 1 && os?.length === 1) {
            pairs.push({
                from: [(gs[0].box.x0 + gs[0].box.x1) / 2, (gs[0].box.y0 + gs[0].box.y1) / 2],
                to: [cx(os[0].box), cy(os[0].box)],
            });
        }
    }
    if (pairs.length >= 3) {
        const t = fitSimilarity(
            pairs.map((p) => p.from),
            pairs.map((p) => p.to),
        );
        if (t !== null) {
            return {
                t,
                pairs: pairs.length,
                source: labelPairs >= 3 ? "labels" : "texts",
                rms: Math.sqrt(t.sse / pairs.length),
                anchors,
            };
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

/** The lines each stacked run of {@link stackedTexts} is made of. */
const runParts = new WeakMap<Prim, Prim[]>();

/**
 * The texts, and each run of two to four lines stacked one under another as one text: a program that wraps a long
 * label (Cytoscape at its label width) draws it as one `<text>` per line, where graphty's label is one line.
 * @param texts - the text primitives
 * @returns the texts, then the stacked runs (each the first line's primitive with the run's words and box)
 */
export function stackedTexts(texts: readonly Prim[]): Prim[] {
    const below = (p: Prim): Prim | undefined => {
        const a = p.text;
        return a === null
            ? undefined
            : texts.find((q) => {
                  const b = q.text;
                  const dy = b === null ? 0 : b.y - a.y;
                  return (
                      b !== null &&
                      // one under another: the same anchor, or (each line centered on its own) the same middle, or
                      // (lines flush right, vis-network's font.align right) the same right edge
                      (Math.abs(b.x - a.x) <= 0.5 * a.sizePx ||
                          Math.abs(cx(q.box) - cx(p.box)) <= a.sizePx ||
                          Math.abs(q.box.x1 - p.box.x1) <= 0.5 * a.sizePx) &&
                      Math.abs(b.sizePx - a.sizePx) <= 0.1 * a.sizePx &&
                      dy > 0.5 * a.sizePx &&
                      dy <= 1.6 * a.sizePx
                  );
              });
    };
    const runs: Prim[] = [];
    for (const first of texts) {
        let run = [first];
        for (let next = below(first); next !== undefined && run.length < 4; next = below(next)) {
            run = [...run, next];
            const stacked: Prim = {
                ...first,
                box: union(run.map((q) => q.box)),
                text: {
                    ...(first.text as PText),
                    content: run.map((q) => q.text?.content ?? "").join(" "),
                    // the words' box is every line's, not the first line's: a label is placed by its whole box
                    box: union(run.map((q) => q.text?.box ?? q.box)),
                    lines: run.flatMap((q) => q.text?.lines ?? [q.box]),
                },
            };
            runParts.set(stacked, run);
            runs.push(stacked);
        }
    }
    return [...texts, ...runs, ...besideTexts(texts)];
}

/**
 * Each run of two to eight texts side by side on one line as one text: a program that draws a label's font changes
 * as texts of their own (vis-network's multi-font blocks, "<b>B</b> <i>I</i>" as "B" and "I") draws one line where
 * graphty's label is one text. A run is a text starting where the one before it ends (within half its font size)
 * whose middle lies within that one's height, as {@link joinRuns} joins a node's lines; the words are joined with a
 * space where the texts are apart by more than a sixth of the font size.
 * @param texts - the text primitives
 * @returns the runs (each the first text's primitive with the run's words and box)
 */
function besideTexts(texts: readonly Prim[]): Prim[] {
    const size = (p: Prim): number => Math.max(p.text?.sizePx ?? 1, 1);
    const beside = (p: Prim): Prim | undefined =>
        texts.find(
            (q) =>
                q !== p &&
                q.text !== null &&
                q.box.x0 - p.box.x1 >= -0.2 * size(p) &&
                q.box.x0 - p.box.x1 <= 0.5 * size(p) &&
                cy(q.box) >= p.box.y0 &&
                cy(q.box) <= p.box.y1 &&
                cy(p.box) >= q.box.y0 &&
                cy(p.box) <= q.box.y1,
        );
    const runs: Prim[] = [];
    for (const first of texts) {
        let run = [first];
        let content = first.text?.content ?? "";
        for (let next = beside(first); next !== undefined && run.length < 8 && !run.includes(next);) {
            const last = run[run.length - 1];
            // a blank a text keeps at its side (SVG's " x", whose box starts at its blank) is a space too
            const apart =
                next.box.x0 - last.box.x1 > size(last) / 6 ||
                last.text?.blank?.after === true ||
                next.text?.blank?.before === true;
            content = `${content}${apart ? " " : ""}${next.text?.content ?? ""}`;
            run = [...run, next];
            const box = union(run.map((q) => q.box));
            const joined: Prim = {
                ...first,
                box,
                text: {
                    ...(first.text as PText),
                    content,
                    box: union(run.map((q) => q.text?.box ?? q.box)),
                    lines: [union(run.map((q) => q.text?.box ?? q.box))],
                },
            };
            runParts.set(joined, run);
            runs.push(joined);
            next = beside(next);
        }
    }
    return runs;
}

/** Where a guide node should be in the oracle's frame, how big, and how far its body may sit from there (in sizes). */
/**
 * graphty's groups that are containers: drawn, holding two or more nodes, and at least twice the
 * area of the largest of them. A node that merely covers its neighbours in a dense drawing holds
 * them too, but is no box drawn around them.
 * @param guide - graphty's drawing
 * @returns the groups
 */
function containerGroups(guide: PScene): PGroup[] {
    const byId = new Map(guide.nodes.map((n) => [n.id, n]));
    return guide.groups.filter((g) => {
        const largest = Math.max(0, ...g.members.map((id) => (byId.get(id)?.w ?? 0) * (byId.get(id)?.h ?? 0)));
        return g.members.length >= 2 && (g.fill !== null || g.stroke !== null) && area(g.box) >= 2 * largest;
    });
}

/** The id prefix of a group's claim in {@link matchBodies}, which no node id starts with. */
const GROUP_CLAIM = "\u0000group:";

type Predict = (n: PNode) => { x: number; y: number; s: number; reach: number } | null;

/** Predictions through a similarity: graphty's center and size carried into the oracle's frame. */
const through =
    (t: Similarity): Predict =>
    (n) => {
        const [x, y] = apply(t, [n.cx, n.cy]);
        return { x, y, s: t.scale * guideSize(n), reach: 0.75 };
    };

/**
 * Each guide node's body among the free closed shapes: the closest of a matching size to where
 * the node lands in the oracle's frame, plus the shapes drawn on the same spot at the same size
 * (a fill and its outline drawn as two primitives).
 */
/** What a box drawn tight round a label adds to its cost as a node's body (`matchBodies`). */
const LABEL_BACKGROUND_COST = 0.5;

function matchBodies(
    guideNodes: readonly PNode[],
    free: readonly Prim[],
    predict: Predict,
    guideGroups: readonly PGroup[] = [],
    predictGroup: Predict = predict,
): Map<string, Prim[]> {
    // A closed outline of no size that is stroked is a dot as wide as its stroke: Cytoscape desktop draws a node no
    // larger than its border so, its outline inset to nothing (WikiPathways' anchors, 1 x 1 with a border of 1); the
    // body of a node of size 0. A line of no height (a table's divider) is not a body.
    const dot = (p: Prim): boolean =>
        p.kind === "shape" && area(p.box) === 0 && (p.stroke?.width ?? 0) > 0 && Math.max(bw(p.box), bh(p.box)) < 1;
    const shapes = free.filter((p) => ((p.kind === "shape" || p.kind === "image") && area(p.box) > 0) || dot(p));
    const extent = (p: Prim): number => Math.max(bw(p.box), bh(p.box)) + (dot(p) ? (p.stroke?.width ?? 0) : 0);
    // A box drawn tight round a label is its background (Cytoscape's NODE_LABEL_BACKGROUND), a poorer body than any
    // shape near the node; still the body where nothing else is drawn there (vis-network's box fits its label).
    const texts = free.filter((p) => p.text !== null);
    const backsALabel = (p: Prim): boolean =>
        p.fill !== null &&
        texts.some(
            (t) =>
                t.box.x0 >= p.box.x0 - 1 &&
                t.box.y0 >= p.box.y0 - 1 &&
                t.box.x1 <= p.box.x1 + 1 &&
                t.box.y1 <= p.box.y1 + 1 &&
                area(p.box) <= 2.5 * area(t.box),
        );
    const cand: { cost: number; id: string; p: Prim }[] = [];
    // graphty's container groups claim their own boxes first, so a box drawn around a few nodes is
    // not taken for the body of one of them; a group claims only a shape over its box, and what it claims stays free
    // for the group boxes found by geometry
    for (const g of guideGroups) {
        const w = bw(g.box);
        const h = bh(g.box);
        const n: PNode = {
            id: `${GROUP_CLAIM}${g.id}`,
            cx: g.box.x0 + w / 2,
            cy: g.box.y0 + h / 2,
            w,
            h,
            shape: null,
            fill: null,
            stroke: null,
            label: null,
        };
        const at = predictGroup(n);
        if (at === null) {
            continue;
        }
        const k = at.s / Math.max(w, h, 1e-9);
        const box = { x0: at.x - (k * w) / 2, y0: at.y - (k * h) / 2, x1: at.x + (k * w) / 2, y1: at.y + (k * h) / 2 };
        for (const p of shapes) {
            const v = boxIoU(box, p.box);
            // before any node: a group's box over a flat node is about as wide as the node, and would be taken for
            // the node's outline
            if (v >= 0.5) {
                cand.push({ cost: -v, id: n.id, p });
            }
        }
    }
    for (const n of guideNodes) {
        const at = predict(n);
        if (at === null) {
            continue;
        }
        const { x: px, y: py, s, reach } = at;
        for (const p of shapes) {
            const d = Math.hypot(cx(p.box) - px, cy(p.box) - py);
            const size = extent(p);
            if (d > Math.max(s, 8) * reach) {
                continue;
            }
            cand.push({
                cost:
                    d / Math.max(s, 4) +
                    0.5 * Math.abs(Math.log((size + 1) / (s + 1))) +
                    (backsALabel(p) ? LABEL_BACKGROUND_COST : 0),
                id: n.id,
                p,
            });
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
        const size = extent(body);
        // of the body's width AND its height: a node drawn on the middle of a group box as wide as
        // it but three times as tall is another element, not the body's own outline
        const near = (a: number, b: number): boolean => a / Math.max(b, 1e-9) > 0.8 && a / Math.max(b, 1e-9) < 1.25;
        // and an outline painted as a fill round the body, however far its spikes reach
        const around = (q: Prim): boolean =>
            q.tag === PAINTED_OUTLINE &&
            bw(q.box) >= 0.8 * bw(body.box) &&
            bh(q.box) >= 0.8 * bh(body.box) &&
            Math.max(bw(q.box), bh(q.box)) <= 3 * size;
        const twins = shapes.filter(
            (q) =>
                !taken.has(q.index) &&
                Math.hypot(cx(q.box) - cx(body.box), cy(q.box) - cy(body.box)) <= 0.2 * size + 0.5 &&
                ((near(bw(q.box) + 1, bw(body.box) + 1) && near(bh(q.box) + 1, bh(body.box) + 1)) || around(q)) &&
                // a group's twin is drawn over its box, not a flat node inside it of about its width
                (!c.id.startsWith(GROUP_CLAIM) || boxIoU(q.box, body.box) >= 0.6),
        );
        // a dot's fill, drawn as its own outline of no size under the stroke, is the same dot
        const fills = dot(body)
            ? free.filter(
                  (q) =>
                      q.kind === "shape" &&
                      !taken.has(q.index) &&
                      area(q.box) === 0 &&
                      Math.hypot(cx(q.box) - cx(body.box), cy(q.box) - cy(body.box)) <= 0.5,
              )
            : [];
        [...twins, ...fills].forEach((q) => taken.add(q.index));
        out.set(c.id, [body, ...twins, ...fills]);
    }
    for (const id of out.keys()) {
        if (id.startsWith(GROUP_CLAIM)) {
            out.delete(id);
        }
    }
    return out;
}

/**
 * A raster oracle's own account of its drawing (`drawn` in its metadata): each node it drew and, where the record
 * has them, each edge, with the paint the program itself parsed from the display color (`fill`, `#rrggbb`, and
 * `alpha`, which it blends with) and an edge's width in the raster's pixels.
 */
export interface RasterDrawing {
    nodes: {
        id: string;
        x: number;
        y: number;
        r: number;
        label: string | null;
        fill?: string | null;
        alpha?: number | null;
    }[];
    edges?: {
        id: string;
        source: string;
        target: string;
        fill?: string | null;
        alpha?: number | null;
        width?: number;
        label?: string | null;
    }[];
}

/** A label the raster oracle names but does not place: only its words are judged (`labelGeometry: false`). */
const wordsAt = (content: string, x: number, y: number): PText => ({
    content,
    x,
    y,
    box: { x0: x, y0: y, x1: x, y1: y },
    sizePx: 0,
    family: "",
    weight: 400,
    style: "normal",
    anchor: "start",
    rotation: 0,
    color: "#000000",
    opacity: 1,
});

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
 * the program's own account of where it drew each node and which labels it drew, with each fill the program's own
 * parse of its color where the record has one (else read off its pixels) and the background read off its pixels; a
 * node painted over by a later one is not in it. Labels carry their words only. Edges are read only from a record
 * that carries their paint.
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
    const colors = drawing.nodes.map((n) => fillAt(n.x, n.y, 0.5 * n.r));
    // The program draws its nodes in order, each over the ones before (sigma: the graph's order). A node whose box
    // lies inside a later one's, which shows its color over the node, is painted over: by the rule graphty's side
    // counts a node an opaque node in front holds as not drawn. Where the program recorded its paint, the later node
    // covers it when that paint is opaque; else when the pixels show the same color over both (one see-through node
    // over another shows a blend of the two).
    const covers = (i: number, j: number): boolean => {
        const m = drawing.nodes[j];
        return typeof m.fill === "string" ? m.alpha === 1 : colors[i] !== null && colors[i] === colors[j];
    };
    const seen = drawing.nodes.filter((n, i) =>
        drawing.nodes.slice(i + 1).every((m, k) => {
            const inside = Math.abs(m.x - n.x) + n.r <= m.r + 1 && Math.abs(m.y - n.y) + n.r <= m.r + 1;
            return !(inside && covers(i, i + 1 + k));
        }),
    );
    // The program's own paint where it recorded one: the pixels hold the color blended over the page (an alpha) or
    // another node's color (a node drawn over it), so they say what shows, not what the node was given. A node drawn
    // fully transparent shows nothing, as on graphty's side, unless its label is drawn.
    const shows = (n: RasterDrawing["nodes"][number]): boolean => n.alpha !== 0 || n.label !== null;
    const nodes = seen.filter(shows).map((n): PNode => {
        const color = typeof n.fill === "string" ? n.fill : colors[drawing.nodes.indexOf(n)];
        const opacity = typeof n.fill === "string" && typeof n.alpha === "number" ? n.alpha : 1;
        return {
            id: n.id,
            cx: n.x,
            cy: n.y,
            // a node of no size, or of a negative one (sigma: scaleSize of a negative size), is drawn as nothing
            w: Math.max(0, 2 * n.r),
            h: Math.max(0, 2 * n.r),
            shape: "ellipse",
            fill: color === null || n.r <= 0 ? null : { color, opacity, gradient: null },
            stroke: null,
            label: n.label === null ? null : wordsAt(n.label, n.x, n.y),
        };
    });
    // Each edge the program recorded with its paint and width, a straight line between its nodes' centers (sigma.js
    // draws every edge type it reads as one); none drawn fully transparent. A record without them (an older oracle)
    // judges no edge, and then what graphty draws besides nodes cannot be told extra.
    const painted = drawing.nodes.some((n) => typeof n.fill === "string");
    const at = new Map(drawing.nodes.map((n) => [n.id, n]));
    const edges = (painted ? (drawing.edges ?? []) : [])
        .filter((e) => typeof e.fill === "string" && e.alpha !== 0 && at.has(e.source) && at.has(e.target))
        .map((e): PEdge => {
            const [s, t] = [at.get(e.source), at.get(e.target)] as [
                RasterDrawing["nodes"][number],
                RasterDrawing["nodes"][number],
            ];
            return {
                id: e.id,
                source: e.source,
                target: e.target,
                points: [
                    [s.x, s.y],
                    [t.x, t.y],
                ],
                stroke: {
                    color: e.fill as string,
                    opacity: typeof e.alpha === "number" ? e.alpha : 1,
                    width: e.width ?? Number.NaN,
                    dash: null,
                    dashClass: "solid",
                },
                arrows: [],
                label:
                    typeof e.label === "string" && e.label !== ""
                        ? wordsAt(e.label, (s.x + t.x) / 2, (s.y + t.y) / 2)
                        : null,
            };
        });
    return {
        side: "oracle",
        width,
        height,
        background: fillAt(0, 0, 0.5),
        nodes: nodes.sort((a, b) => compareIds(a.id, b.id)),
        edges: edges.sort((a, b) => compareIds(a.id, b.id)),
        groups: [],
        texts: [],
        strays: [],
        labelGeometry: false,
        nodesOnly: !painted,
    };
}

/** Half a pixel: how far a box may poke past another and still count as inside it (extract-scene's INSIDE_SLACK). */
const INSIDE_SLACK = 0.5;
/** The least fill opacity that hides what is behind it (extract-scene's OPAQUE). */
const OPAQUE = 0.99;

/**
 * Whether one box lies wholly inside another, within half a pixel.
 * @param inner - the box that may be inside
 * @param outer - the box that may hold it
 * @param slack - how far inner may poke past outer
 * @returns true when every side of inner is within outer
 */
export function boxWithin(inner: PBox, outer: PBox, slack = INSIDE_SLACK): boolean {
    return (
        inner.x0 >= outer.x0 - slack &&
        inner.x1 <= outer.x1 + slack &&
        inner.y0 >= outer.y0 - slack &&
        inner.y1 <= outer.y1 + slack
    );
}

/**
 * Whether a box lies wholly inside a node's shape: inside its ellipse for a round node (every corner of the box), else
 * inside its box, within the slack.
 * @param inner - the box that may be inside
 * @param outer - the node's box
 * @param ellipse - whether the node is round
 * @param slack - how far inner may poke past the node
 * @returns true when inner is inside the node
 */
export function withinShape(inner: PBox, outer: PBox, ellipse: boolean, slack = INSIDE_SLACK): boolean {
    if (!ellipse) {
        return boxWithin(inner, outer, slack);
    }
    const [mx, my] = [(outer.x0 + outer.x1) / 2, (outer.y0 + outer.y1) / 2];
    const [rx, ry] = [(outer.x1 - outer.x0) / 2 + slack, (outer.y1 - outer.y0) / 2 + slack];
    return [
        [inner.x0, inner.y0],
        [inner.x1, inner.y0],
        [inner.x0, inner.y1],
        [inner.x1, inner.y1],
    ].every(([x, y]) => ((x - mx) / rx) ** 2 + ((y - my) / ry) ** 2 <= 1);
}

/**
 * The oracle's scene without what it draws wholly under a node, judged as graphty's side judges its own (`occluders`
 * in extract-scene.ts, `linelessCaps` in drawn-primitives.ts): a node, or a stray shape, is covered by an opaque node
 * drawn after it (later in the document) whose box, out to its outline's outer edge, holds its whole box (a stray's box
 * must lie inside a round node's ellipse). A covered
 * node's label is still drawn, as a free text it owns, as graphty's side keeps a hidden node's label. Gephi draws a
 * node at (nearly) the same place as a larger or earlier one under it (`gexf-cns-wos` n5, n23, n50, n100), which
 * graphty's scene marks hidden, and the arrowheads of edges whose nodes swallow their line under those nodes
 * (`gexf-sigma-ediaspora`). The half pixel a box may poke past is graphty's, taken into the oracle's pixels by the
 * ratio of the two drawings' sizes of the same nodes (`gexf-cns-wos` draws 1.36 oracle pixels to graphty's one).
 * @param scene - the oracle's scene
 * @param guide - graphty's scene, whose nodes' sizes give the scale; none takes the oracle's pixel as graphty's
 * @returns the scene without what is covered
 */
export function withoutCovered(scene: PScene, guide?: PScene): PScene {
    const theirs = new Map((guide?.nodes ?? []).map((n) => [n.id, n.w]));
    const ratios = scene.nodes
        .flatMap((n) => {
            const w = theirs.get(n.id) ?? 0;
            return w > 0 && n.w > 0 ? [n.w / w] : [];
        })
        .sort((a, b) => a - b);
    const slack = INSIDE_SLACK * (ratios.length > 0 ? ratios[Math.floor(ratios.length / 2)] : 1);
    const boxOf = (n: PNode): PBox => {
        const out = (n.stroke?.width ?? 0) / 2;
        return {
            x0: n.cx - n.w / 2 - out,
            y0: n.cy - n.h / 2 - out,
            x1: n.cx + n.w / 2 + out,
            y1: n.cy + n.h / 2 + out,
        };
    };
    const covers = scene.nodes
        .filter((n) => n.order !== undefined && n.fill !== null && n.fill.opacity >= OPAQUE)
        .map((n) => ({ n, box: boxOf(n), order: n.order ?? -1 }));
    const covered = new Set(
        scene.nodes.filter((n) =>
            covers.some((c) => c.n !== n && c.order > (n.order ?? Infinity) && boxWithin(boxOf(n), c.box, slack)),
        ),
    );
    const strays = scene.strays.filter(
        (s) =>
            s.kind !== "shape" ||
            !covers.some((c) => c.order > s.index && withinShape(s.box, c.box, c.n.shape === "ellipse", slack)),
    );
    if (covered.size === 0 && strays.length === scene.strays.length) {
        return scene;
    }
    return {
        ...scene,
        nodes: scene.nodes.filter((n) => !covered.has(n)),
        texts: [
            ...scene.texts,
            ...[...covered].flatMap((n) => (n.label === null ? [] : [{ ...n.label, owner: n.id }])),
        ],
        strays,
    };
}
