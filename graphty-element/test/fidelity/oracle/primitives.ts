/**
 * The primitive model both sides of the oracle comparison are read into: what a program's own SVG
 * export draws (`svg-primitives.ts`) and what graphty-element drew (`drawn-primitives.ts`), as
 * resolved geometry and paint in one pixel frame per side, y down. Pure data, no DOM, so the
 * comparer (`compare-oracle.ts`) runs and is unit-tested in Node.
 */

import { convexHull } from "../../../src/meshes/shapeOutlines";

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
 * A gradient as drawn: its kind, its stops and, for a linear one, the screen direction its color changes along
 * (degrees, clockwise from the +x axis, y down: from its first stop towards its last; across its lines of one color,
 * as `rampAngleOnScreen` reads a stretched ramp), or null where the drawing does not say.
 */
export interface PGradient {
    kind: "linear" | "radial";
    stops: PStop[];
    angle: number | null;
    /**
     * A linear gradient read off a picture's pixels (`pictureGradient`), whose direction is known only up to a half
     * turn: one run the other way from its other end is the same picture. Absent for a gradient a program wrote.
     */
    halfTurn?: true;
    /**
     * Where a radial gradient's middle is, in fractions of its node's box from the top left corner, when it is off the
     * node's middle; its stops are then in halves of the node's shorter side from there. Absent, the node's middle.
     */
    center?: readonly [number, number];
}

/**
 * The screen direction a linear ramp's color changes along, where the ramp runs along a vector in its own units and a
 * linear map takes those units to the screen. A map that stretches one way more than the other (a ramp painted across
 * a unit square, or an SVG gradient in objectBoundingBox units, laid over a box wider than tall) turns the ramp's lines
 * of one color with it, and the color changes across those lines, not along the stretched vector: a ramp from corner to
 * corner of a 220 x 94 box runs along 23.1 degrees on screen, and its color changes along 66.9. That direction is the
 * map's inverse transpose applied to the vector.
 * @param v - the ramp's vector, in its own units
 * @param a - the map's matrix `[a, b, c, d]` (x' = a x + c y, y' = b x + d y)
 * @returns the direction in degrees, or null for a ramp of no length or a map that flattens it
 */
export function rampAngleOnScreen(v: Pt, [a, b, c, d]: readonly [number, number, number, number]): number | null {
    const det = a * d - b * c;
    if (Math.hypot(v[0], v[1]) < 1e-12 || Math.abs(det) < 1e-12) {
        return null;
    }
    const x = (d * v[0] - b * v[1]) / det;
    const y = (a * v[1] - c * v[0]) / det;
    return (Math.atan2(y, x) * 180) / Math.PI;
}

/**
 * The stops a reflected or repeated ramp paints across its shape, from where the shape starts along the ramp to where
 * it ends: an SVG gradient's `spreadMethod="reflect"` or `"repeat"` runs its stops again past their ends, so its
 * colors across the shape are not its stops. yEd's shape-node ramp from a third of the way across to the right side,
 * reflected, paints the color halfway along it at the left side, its first color a third across and its last at the
 * right (t from -0.5 to 1). `pad` keeps its stops: both sides read a padded ramp along its own vector.
 * @param stops - the ramp's stops, offsets 0 to 1
 * @param spread - the gradient's spreadMethod
 * @param start - where the shape starts along the ramp (0 its first stop, 1 its last)
 * @param end - where the shape ends
 * @returns the stops across the shape, offsets 0 to 1, or the stops themselves when nothing repeats over the shape
 */
export function spreadStops(stops: readonly PStop[], spread: string, start: number, end: number): PStop[] {
    const sorted = [...stops].sort((a, b) => a.offset - b.offset);
    const eps = 1e-6;
    if ((spread !== "reflect" && spread !== "repeat") || sorted.length === 0 || end - start < eps) {
        return sorted;
    }
    if (start >= -eps && end <= 1 + eps) {
        return sorted;
    }
    // ponytail: places are rounded to 1e-9, so a corner a float's width off a stop is that stop
    const near = (t: number): number => Math.round(t * 1e9) / 1e9;
    const [t0, t1] = [near(start), near(end)];
    // every place a stop, run again either way, falls or a run ends
    const at = new Set([t0, t1]);
    for (let k = Math.floor(t0) - 1; k <= Math.ceil(t1) + 1; k++) {
        for (const t of [k, ...sorted.flatMap((st) => [near(k + st.offset), near(k + 1 - st.offset)])]) {
            if (t > t0 && t < t1) {
                at.add(t);
            }
        }
    }
    const out: PStop[] = [];
    for (const t of [...at].sort((a, b) => a - b)) {
        const offset = Math.round(((t - t0) / (t1 - t0)) * 1e6) / 1e6;
        const [left, right] = spreadSides(spread, t).map(([u, above]) => ({ ...stopAlong(sorted, u, above), offset }));
        // a seam or a hard stop is two colors at one place; the shape's own ends show only the side inside it
        if (t !== t0) {
            out.push(left);
        }
        if (t !== t1 && (t === t0 || right.color !== left.color || right.opacity !== left.opacity)) {
            out.push(right);
        }
    }
    return out;
}

/**
 * Where along its stops a reflected or repeated ramp is just before a place and just after it, and whether it is read
 * from above that place along its stops: a repeat jumps from its end back to its start at each whole place, a
 * reflection runs back down its stops on every other run.
 * @param spread - `reflect` or `repeat`
 * @param t - the place
 * @returns `[u, above]` just before it and just after it
 */
function spreadSides(spread: string, t: number): [[number, boolean], [number, boolean]] {
    if (spread === "repeat") {
        const u = t - Math.floor(t);
        return [
            [u === 0 ? 1 : u, false],
            [u, true],
        ];
    }
    const m = t - 2 * Math.floor(t / 2);
    return [m > 0 && m <= 1 ? [m, false] : [m === 0 ? 0 : 2 - m, true], m < 1 ? [m, true] : [2 - m, false]];
}

/**
 * A ramp's color and opacity at a place along its sorted stops, read from below the place or above it: at a hard stop
 * (two stops at one place) the first stop's below and the last's above.
 * @param stops - the stops, sorted
 * @param u - the place, 0 to 1
 * @param above - read from above
 * @returns the color and opacity
 */
function stopAlong(stops: readonly PStop[], u: number, above: boolean): { color: string; opacity: number } {
    const last = stops.length - 1;
    const next = stops.findIndex((s) => s.offset >= u);
    const k = above ? stops.filter((s) => s.offset <= u).length - 1 : (next < 0 ? stops.length : next) - 1;
    if (k < 0 || k >= last) {
        const s = stops[k < 0 ? 0 : last];
        return { color: s.color, opacity: s.opacity };
    }
    const [a, b] = [stops[k], stops[k + 1]];
    const f = b.offset > a.offset ? (u - a.offset) / (b.offset - a.offset) : 1;
    const hex = (h: string, i: number): number => Number.parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
    const color = `#${[0, 1, 2]
        .map((i) =>
            Math.round(hex(a.color, i) + f * (hex(b.color, i) - hex(a.color, i)))
                .toString(16)
                .padStart(2, "0"),
        )
        .join("")}`;
    return { color, opacity: Math.round((a.opacity + f * (b.opacity - a.opacity)) * 1000) / 1000 };
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
 * a zigzag, a sine wave, slashes across the line, a row of arrows, a line tapering to a point. "other" is a pattern no class names: it matches
 * nothing, not even another "other".
 */
export type DashClass =
    | "solid"
    | "dashed"
    | "dotted"
    | "dash-dot"
    | "double"
    | "zigzag"
    | "sinewave"
    | "slashes"
    | "arrows"
    | "tapered"
    | "other";

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
    /**
     * How thick a line waving within the stroke's width is (graphty's zigzag and sine-wave borders with a swing of
     * their own), where `width` is the ring it waves in: the width a reader compares with the program's line.
     */
    line?: number;
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
    /**
     * The oracle's side only: how far `box`, the browser's reading, stands under the line the font lays out, in pixels.
     * The browser rounds a font's ascent and descent to whole pixels.
     */
    lineDrop?: number;
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
    /** graphty's side only, on a free text: the id of the label-only node whose label it is. */
    owner?: string;
    /**
     * The oracle's side only: blanks the text keeps before or after its words (an SVG text with
     * `xml:space="preserve"`), which part it from a run of the same line drawn beside it.
     */
    blank?: { before: boolean; after: boolean };
    /**
     * The oracle's side only: drawn as glyph outlines (`Prim.lettering`), so `lines` and `color` are what was drawn, but
     * `content` is empty and `sizePx` only the rows' height: the words and the face are not known.
     */
    glyphs?: true;
}

/** A box drawn behind a label's words (Cytoscape.js `text-background-*`, `text-border-*`; graphty's label plane). */
export interface PLabelBox {
    box: PBox;
    fill: PFill | null;
    stroke: PStroke | null;
    /** Its outline's class: a rectangle, a rounded one, an ellipse. */
    shape: "rect" | "roundrect" | "ellipse" | "other" | null;
}

/** The tag of a stray that is one piece of an SVG picture graphty draws over a node. */
export const PICTURE_PART = "picture-part";

/**
 * The tag of a stray of such a picture never judged as extra, though it can answer for a program's shape: the picture
 * as a whole, whose pieces say whether it is extra, and an open line, as a program's open line is no stray to find.
 */
export const PICTURE_WHOLE = "picture-whole";

/** The raw drawing primitives an SVG holds, before they are associated with graph elements. */
export interface Prim {
    /** Document order, for deterministic tie breaks and for findings. */
    index: number;
    tag: string;
    kind: "shape" | "path" | "text" | "image";
    box: PBox;
    /**
     * A fill its own clip cuts (`clipCut`): the box of the whole shape it was drawn as. `box` is what shows. Absent for
     * a shape shown whole.
     */
    uncut?: PBox;
    /**
     * An image's four corners as drawn, which a turned image's box is wider than.
     */
    quad?: readonly [number, number][];
    /**
     * An image's: the gradient its pixels are (`pictureGradient`), as a program draws a gradient fill as a picture
     * (Cytoscape desktop's gradient custom graphics). Absent for everything else.
     */
    gradient?: PGradient;
    /** The outline sampled by arc length (shapes and paths), in the side's frame. */
    points: Pt[];
    /** A curved outline with a dent (`dented`: Pajek's man) sampled finely, for its node's figure; absent otherwise. */
    fine?: Pt[];
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
    /** Whether an outline with curves has a corner on a corner of its box. */
    squareCorner?: boolean;
    /**
     * A closed path that is a row of letters drawn as outlines (`isLettering`): words, filled or stroked as a halo,
     * that are no arrowhead, band or body. Absent for everything else.
     */
    lettering?: true;
    /**
     * An open line's: the band drawn along it under it, as `PEdge.outline` says (yEd's framed edge, its outline round
     * the line, `framedBand`). Absent for everything else.
     */
    lineOutline?: { color: string; opacity: number; width: number };
    /** The fill of the panel a yFiles group lays over this, its tab. Absent for everything else. */
    panel?: PFill;
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
    /**
     * A second ring drawn clear of the outline, outside it (Cytoscape.js's `outline-*`, Graphviz's `peripheries`):
     * neither the node's size nor its border. `reach` is how far its outer edge lies out from the node's box, in the
     * side's pixels. Absent or null for none.
     */
    ring?: (PStroke & { reach: number }) | null;
    /**
     * The boxes of the pictures drawn as part of the node: on the oracle's side an image over or inside its shape
     * (vis-network's circularImage and image nodes), which graphty draws as pieces over the node's face; on graphty's,
     * only the image a node with no body draws as itself. Absent for none.
     */
    pictures?: PBox[];
    /**
     * The oracle's side only: the pieces of a fill drawn in pieces (a yEd table's header and lanes, Graphviz's stripes),
     * which graphty draws as pieces over the node's face, each with its color. Absent for a fill in one piece.
     */
    faces?: { box: PBox; color: string }[];
    /**
     * The oracle's side only: the parts of the node a clip cuts from a fill of another color than the node's (yEd's
     * entity header), each of which graphty must draw over the face in that color. Absent for none.
     */
    bands?: { box: PBox; color: string }[];
    label: PText | null;
    /**
     * graphty's side only: a label under a node-size rule (sigma's labelRenderedSizeThreshold), shown or not at
     * graphty's framing, with its node's size across in render px and the least that shows it. The comparison shows it
     * where the oracle's framing would (`labelAtScale`).
     */
    sizedLabel?: { label: PText; acrossPx: number; min: number };
    /**
     * graphty's side only: whether its border was drawn in from the node's size (a border inside the size or centered
     * on it), so its fill lies inside the outline the program strokes, not on it.
     */
    inset?: boolean;
    /**
     * graphty's side only: a node that draws no body (shape "none", no picture), as the texts it draws instead, its
     * label and its glyph. The comparison reads them as free texts and leaves the node out (`withoutCaptions`); the
     * raster comparison still masks its box.
     */
    faceless?: PText[];
    /**
     * The oracle's side only: the document order of its front-most primitive, which says what it is drawn over (a
     * later node is drawn in front of an earlier one).
     */
    order?: number;
    /**
     * The oracle's side only: the document order of the primitive that paints its fill, which says what its fill hides
     * (what it draws after its fill, a chart's slices, is drawn over it).
     */
    fillOrder?: number;
    /**
     * A figure's own outline, where it is neither its box nor the ellipse its box holds (a shape with a dent: Pajek's
     * man, woman and cross, a star): its edges, in halves of the node's width and height from its center, y down, so
     * the node's place and size carry it. A line is cut, and a node judged hidden, at it (`insideFigure`). Absent for
     * any other shape.
     */
    figure?: [Pt, Pt][];
}

/**
 * Arrowhead shape classes a reader can tell apart, read from the outline in the frame of the line it caps: a triangle
 * pointing on along the line, one pointing back ("inverted"), a concave arrow ("vee": an arrow with a notch, a
 * chevron), a crow's foot (tines spreading toward the node, one of them along the line), a vee pointing back with no
 * tine along the line ("inverted-vee", vis-network's crow), a diamond, a circle, a box, a bar across the line ("tee"),
 * half an arrow on one side of the line, half a disc with its flat side across the tip ("half-circle", or its round
 * side alone), two strokes crossing on the line ("cross"). "other" matches nothing.
 */
export type ArrowShape =
    | "triangle"
    | "inverted"
    | "vee"
    | "crow"
    | "inverted-vee"
    | "diamond"
    | "circle"
    | "box"
    | "tee"
    | "half"
    | "half-circle"
    // a picture drawn as the arrowhead (vis-network's image arrows)
    | "image"
    // a delta with a bar across the line behind it (Cytoscape's CROSS_DELTA, CROSS_OPEN_DELTA)
    | "cross-delta"
    // a disc at the tip with a triangle behind it pointing at it (Cytoscape.js's circle-triangle)
    | "circle-triangle"
    // two strokes crossing on the line (yEd's and yEd Live's cross)
    | "cross"
    | "other";

/** Where along its edge an arrowhead sits: at one end, or part-way along the line ("middle"). */
export type ArrowEnd = "source" | "target" | "middle";

/** An arrowhead as drawn. */
export interface PArrow {
    /** Which end of its edge it sits on, or "middle" for one drawn part-way along the line, away from both ends. */
    end: ArrowEnd;
    /** Its extent along the edge and across it, in the side's pixels. */
    length: number;
    width: number;
    filled: boolean;
    /** Its shape class. */
    shape: ArrowShape;
    /** `#rrggbb`: its fill where it is filled, else its outline's color; null where the drawing does not say. */
    color: string | null;
    /** Its middle, where its outline says: parts drawn at one place (a fill and its outline) are one part. */
    at?: Pt;
    /** graphty's side: how many pixels past the allowance it sits off its line's end (`capPlaceMiss`); absent when on it. */
    misplaced?: number;
    /**
     * graphty's side: an end's arrowhead its style draws part-way along the line (`ArrowStyle.position` between 0 and 1,
     * Pajek's `arrowPosition`), whose place is judged along the line, never from the line's end.
     */
    partWay?: boolean;
    /** graphty's cap stood back from its line's end by a stem: how far back is judged against the program's. */
    standing?: boolean;
    /**
     * An end's arrowhead: the break between where its line stops and where the head itself first meets the line, as a
     * share of the head's length (0 where they meet). Cytoscape desktop runs the line on under its half arrows to where
     * the barb meets it; graphty stopped it at the head's back, short of a barb that meets the line only near its tip.
     */
    lineGap?: number;
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
    /**
     * A band drawn under the line along its length (Cytoscape.js `line-outline-*`, vis-network's edge `background`):
     * its paint, its whole width across, in the side's pixels, and its line class (absent: solid); absent or null for
     * none.
     */
    outline?: { color: string; opacity: number; width: number; dashClass?: DashClass } | null;
    /**
     * A band drawn over the line along its length (Cytoscape.js `overlay-*`): its paint and its whole width across, in
     * the side's pixels; absent or null for none.
     */
    overlay?: { color: string; opacity: number; width: number } | null;
    /**
     * The nodes its file names as its ends, where `source` and `target` are instead the nodes a reader sees it end at:
     * an end at a node drawn wholly under another at the same place is seen at the node over it. Absent: the same.
     */
    ownEnds?: { source: string; target: string };
}

/** A group box as drawn. */
export interface PGroup {
    id: string;
    box: PBox;
    fill: PFill | null;
    stroke: PStroke | null;
    /**
     * The oracle's side only: the panel a yFiles group lays over its frame. This is the fill behind its members, and
     * `fill` is then the band of the frame left showing round it. Absent for any other group.
     */
    panel?: PFill;
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
    /** Words a program drew as glyph outlines (`isLettering`), whose words it does not say. */
    lettering?: true;
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
 * The id of an oracle shape no graph element owns (a stray, a group read off a box), from what it is and where the
 * program drew it: its tag and its box in the oracle's own frame, rounded to whole pixels (`rect@10,20,110,60`). The
 * oracle is a fixed file, so the id stays the same whatever the association leaves unmatched before it; a position in
 * a list would renumber every later shape when one more or one fewer is matched.
 * @param tag - what the shape is
 * @param box - its box in the oracle's frame
 * @returns the id
 */
export const shapeId = (tag: string, box: PBox): string =>
    `${tag}@${[box.x0, box.y0, box.x1, box.y1].map((v) => String(Math.round(v) || 0)).join(",")}`;

/**
 * A dash array as it is seen: a round or square line cap draws each dash half a width longer at either end, so into its
 * gaps (yEd's dotted line is `0,4` under round caps: dots one width long, not nothing). An odd-length array repeats to
 * an even one.
 * @param dash - the dash array
 * @param width - the line width
 * @param cap - the line cap (`butt`, `round` or `square`)
 * @returns the dashes and gaps as drawn
 */
export function dashAsDrawn(dash: readonly number[], width: number, cap = "butt"): number[] {
    const pairs = dash.length % 2 === 1 ? [...dash, ...dash] : [...dash];
    const grow = cap === "butt" ? 0 : width;
    return pairs.map((d, i) => (i % 2 === 0 ? Math.max(0, d) + grow : Math.max(0, d - grow)));
}

/**
 * The dash class of a dash array, from its dashes and its gaps relative to the line's width, as drawn
 * (`dashAsDrawn`): gaps that add to a tenth of the pattern or
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
    const drawn = dashAsDrawn(dash, width, cap);
    const on = drawn.filter((_, i) => i % 2 === 0);
    const off = drawn.filter((_, i) => i % 2 === 1);
    const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
    // a gap under a tenth of the pattern reads as no gap; one of a tenth still shows (vis-network's [5, 5] dashes at
    // width 4 under round caps: gaps of 1 px in a 10 px pattern, drawn and visible), and a drawing measured at a scale
    // gives that tenth back only within a few parts in a thousand
    if (sum(off) < 0.099 * (sum(on) + sum(off))) {
        return "solid";
    }
    const dot = Math.max(1, width) * 1.5;
    // long dashes and short ones (a dot, drawn two widths long by a round cap) alternate: by the quartiles, as a measured
    // line's last element is cut short by its end
    const sorted = [...on].sort((x, y) => x - y);
    const alternate = sorted[Math.floor(0.75 * sorted.length)] >= 2 * sorted[Math.floor(0.25 * sorted.length)];
    if (on.every((d) => d <= dot)) {
        // under the floor every dash is a dot, but a hairline's dash and dot still differ (cx-syn-mappings 342->360)
        return alternate ? "dash-dot" : "dotted";
    }
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

/**
 * Places for the nodes a drawing has none for, from their neighbours': each at the middle of its neighbours that have
 * one, taken in rounds so a node whose neighbours have none waits for them. A node with fewer than two placed
 * neighbours stays without: one neighbour says nothing of where beside it the node stood. A position-matched drawing moves graphty's nodes to where the program drew them, and a node the
 * program's drawing does not show (drawn wholly under another, as in a dense clique) would otherwise stay where graphty's
 * own layout put it, far from the drawing it is moved into.
 * @param placed - the nodes that have a place
 * @param ids - every node
 * @param edges - the edges, as their two nodes
 * @returns a place for each node in `ids` without one that could be given one
 */
export function placeUndrawn(
    placed: ReadonlyMap<string, Pt>,
    ids: readonly string[],
    edges: readonly (readonly [string, string])[],
): Map<string, Pt> {
    const at = new Map(placed);
    const out = new Map<string, Pt>();
    let waiting = ids.filter((id) => !at.has(id));
    for (let grew = true; grew && waiting.length > 0;) {
        const round = waiting.flatMap((id): [string, Pt][] => {
            const near = edges
                .filter((e) => e.includes(id))
                .map(([a, b]) => at.get(a === id ? b : a))
                .filter((p): p is Pt => p !== undefined);
            const mean = (k: 0 | 1): number => near.reduce((sum, p) => sum + p[k], 0) / near.length;
            return near.length < 2 ? [] : [[id, [mean(0), mean(1)]]];
        });
        for (const [id, p] of round) {
            at.set(id, p);
            out.set(id, p);
        }
        grew = round.length > 0;
        waiting = waiting.filter((id) => !at.has(id));
    }
    return out;
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
 * and nearer the rim than the center for the most part (an arrowhead or a glyph is drawn to its middle; Cytoscape
 * desktop's contiguous-arrow border, whose chevrons reach two border widths either side of the ring, leaves a hole a
 * third as wide as it reaches).
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
    return drawn.length >= 0.75 * SECTORS && hollow >= 0.3;
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

/**
 * Whether pieces are drawn in turn on two rows, each nearer the one two after it than the next (Cytoscape desktop's
 * double border, tick by tick, one on each row): how a double ring shows on a node that is not round, whose rows are no
 * distance from one center (cx2-syn-mappings 273: a 46 x 17 diamond). One row's next piece is always its nearest.
 * @param subpaths - the pieces, in drawing order
 * @returns true for two rows
 */
function drawnInTurn(subpaths: readonly (readonly Pt[])[]): boolean {
    const centers = subpaths.map((q): Pt => [
        q.reduce((t, p) => t + p[0], 0) / q.length,
        q.reduce((t, p) => t + p[1], 0) / q.length,
    ]);
    const step = (by: number): number =>
        median(centers.slice(by).map((c, i) => Math.hypot(c[0] - centers[i][0], c[1] - centers[i][1])));
    return centers.length >= 4 && step(2) < 0.75 * step(1);
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
        // a period of a wave (Cytoscape desktop's sine wave is a crest and a trough a piece) or a lobe of one lies off
        // its own mirror image by half its thickness or more (a wide one's period, cys-syn-mappings 432->450: 1.3 px off
        // at 1.4 thick); an arrow drawn square on the line is its own mirror image, a fraction of a pixel off
        const lopsided = median(subpaths.map((q) => mirrorGap(q, run.mirror))) > 0.5 * thin;
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
    if (run.circular === true && drawnInTurn(subpaths)) {
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

/** The sine of the widest angle between two sides still read as running alongside one another (10 degrees). */
const ALONGSIDE = Math.sin((10 * Math.PI) / 180);

/**
 * How far apart two outlines most often are: over one outline's points, the distance to the other's nearest side
 * running alongside it (within 10 degrees), and of those the run within a tenth of one another that holds the most,
 * its median. Only a side alongside is the line's other edge: a zigzag drawn thick (Cytoscape desktop's 6 px border,
 * cx-syn-bypass 2106) brings its next leg's far edge nearer than its own across the turn, which read the band half
 * its width.
 * @param a - one outline, sampled
 * @param b - the other, closed
 * @returns the distance
 */
function outlinesApart(a: readonly Pt[], b: readonly Pt[]): number {
    const toSide = ([x, y]: Pt, [x0, y0]: Pt, [x1, y1]: Pt): number => {
        const [dx, dy] = [x1 - x0, y1 - y0];
        const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / Math.max(dx * dx + dy * dy, 1e-12)));
        return Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy));
    };
    const alongside = (u: Pt, v: Pt): boolean => {
        const [lu, lv] = [Math.hypot(u[0], u[1]), Math.hypot(v[0], v[1])];
        return lu > 1e-9 && lv > 1e-9 && Math.abs(u[0] * v[1] - u[1] * v[0]) <= ALONGSIDE * lu * lv;
    };
    const step = Math.max(1, Math.floor(a.length / 256));
    const gaps: number[] = [];
    for (let i = 0; i < a.length; i += step) {
        const next = a[(i + 1) % a.length];
        const dir: Pt = [next[0] - a[i][0], next[1] - a[i][1]];
        let nearest = Number.POSITIVE_INFINITY;
        for (let k = 0; k < b.length; k++) {
            const q = b[(k + 1) % b.length];
            if (alongside(dir, [q[0] - b[k][0], q[1] - b[k][1]])) {
                nearest = Math.min(nearest, toSide(a[i], b[k], q));
            }
        }
        if (Number.isFinite(nearest)) {
            gaps.push(nearest);
        }
    }
    if (gaps.length === 0) {
        return Number.NaN;
    }
    gaps.sort((x, y) => x - y);
    let [best, from] = [0, 0];
    for (let i = 0, j = 0; i < gaps.length; i++) {
        while (j < gaps.length && gaps[j] <= gaps[i] * 1.1) {
            j++;
        }
        if (j - i > best) {
            [best, from] = [j - i, i];
        }
    }
    return median(gaps.slice(from, from + best));
}

const patternResult = (dashClass: DashClass, width: number | null, box: PBox): PaintedOutline => ({
    width,
    dashClass,
    patterned: isPattern(dashClass),
    box,
});

/**
 * Whether a path's subpaths are a row of letters drawn as outlines (Cytoscape desktop's FreeHEP export draws a
 * custom graphic's text, stringApp's enhanced label, as glyph paths, its halo stroked and its letters filled): three
 * pieces or more in a row at least half again as wide as it is tall, set close side by side (the median gap between
 * one and the next under half the row's height), and unlike one another (their outlines' lengths vary by 0.15 of
 * their mean or more, or under three quarters of them are alike). A line or a border drawn in pieces repeats one
 * piece, spaced by a dash's gap.
 * @param subpaths - the subpaths, sampled
 * @returns whether they are lettering
 */
export function isLettering(subpaths: readonly (readonly Pt[])[]): boolean {
    if (subpaths.length < 3 || subpaths.some((q) => q.length < 2)) {
        return false;
    }
    const boxes = subpaths.map((q) => boxOfPoints(q));
    const row = boxOfPoints(subpaths.flat());
    const h = row.y1 - row.y0;
    if (!(h > 0) || row.x1 - row.x0 < 1.5 * h) {
        return false;
    }
    const lengths = subpaths.map((q) => lengthOf(q));
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const spread = Math.sqrt(lengths.reduce((s, l) => s + (l - mean) ** 2, 0) / lengths.length);
    // the most pieces alike (outlines within 0.15 of one's length): a word repeats a letter or two (TET3's two Ts keep
    // its spread at 0.15), a line or a border in pieces is nearly all one piece
    const alike = Math.max(...lengths.map((l) => lengths.filter((k) => Math.abs(k - l) <= 0.15 * l).length));
    if (spread < 0.15 * mean && alike >= 0.75 * lengths.length) {
        return false;
    }
    const byX = [...boxes].sort((a, b) => a.x0 - b.x0);
    let reach = byX[0].x1;
    const gaps = byX.slice(1).map((b) => {
        const gap = Math.max(0, b.x0 - reach);
        reach = Math.max(reach, b.x1);
        return gap;
    });
    return median(gaps) <= 0.5 * h;
}

/** How much of two boxes' union they must share for two wavy outlines to be one ring's. */
const CROSSED_WAVE_SHARE = 0.7;

/**
 * Whether two outlines are a wave's round one small node, each swinging past the other so neither's box holds the other's
 * (cx2-syn-mappings 195: a zigzag border 2 px past its other outline on a 48 x 18 hexagon): nearly one box, and wavy.
 * @param subpaths - the two outlines, sampled
 * @param boxes - their boxes
 * @returns true for one ring
 */
function crossedWave(subpaths: readonly (readonly Pt[])[], [a, b]: readonly PBox[]): boolean {
    const shared =
        Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) *
        Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    return (
        shared >= CROSSED_WAVE_SHARE * (areaOf(a) + areaOf(b) - shared) &&
        subpaths.every((q) => continuousPattern(q) !== "solid")
    );
}

/**
 * What two plain nested subpaths wound the same way fill under the nonzero rule: all the outer one holds. A zigzag's
 * outlines cross themselves, so what their areas say of their winding says nothing.
 * @param subpaths - the path's subpaths
 * @returns the outer subpath, or null for anything else
 */
export function solidOuter(subpaths: readonly (readonly Pt[])[]): readonly Pt[] | null {
    if (subpaths.length !== 2 || signedArea(subpaths[0]) * signedArea(subpaths[1]) <= 0) {
        return null;
    }
    const [a, b] = subpaths.map((q) => boxOfPoints(q));
    if (!holds(a, b) && !holds(b, a)) {
        return null;
    }
    const outer = holds(a, b) ? subpaths[0] : subpaths[1];
    return continuousPattern(outer) === "solid" ? outer : null;
}

/**
 * Whether a filled path is an outline stroked into a fill, and what of its line can be read.
 * Cytoscape desktop exports a node border it does not draw solid (dots, zigzag, sine wave, double, slashes) as the
 * stroke's own outline, filled: a ring of two subpaths, or many pieces round the node. Read as a fill, it is larger
 * than the node's body and takes its place.
 * Two subpaths wound the same way under the nonzero rule fill all the inner one holds: a disc, no ring (yEd's
 * intermediate BPMN event and transaction write their body's two outlines in one path).
 * @param subpaths - the path's subpaths, each sampled evenly by arc length in the side's frame
 * @param nonzero - whether the path is filled by the nonzero rule, where unset nothing is known of its rule
 * @returns the outline, or null when the path is no such outline
 */
export function outlinePaintedAsFill(subpaths: readonly (readonly Pt[])[], nonzero = false): PaintedOutline | null {
    if (subpaths.length < 2 || subpaths.some((q) => q.length < 3)) {
        return null;
    }
    if (nonzero && solidOuter(subpaths) !== null) {
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
    // a ring: every other subpath inside the outermost, or as good as: round a small node a zigzag's sharp turns are
    // drawn through their own corners (Java2D's inner join), and the inner outline's turn there can poke a tenth of a
    // pixel past the outer one's tip (xgmml-syn-bypass's B61)
    const slack = 0.05 * Math.min(outerBox.x1 - outerBox.x0, outerBox.y1 - outerBox.y0);
    const grown = {
        x0: outerBox.x0 - slack,
        y0: outerBox.y0 - slack,
        x1: outerBox.x1 + slack,
        y1: outerBox.y1 + slack,
    };
    const nested = boxes.every((b) => b === outerBox || holds(grown, b));
    if (subpaths.length === 2 && (nested || crossedWave(subpaths, boxes))) {
        const band = Math.abs(subpaths.reduce((sum, q) => sum + signedArea(q), 0));
        const width = (2 * band) / subpaths.reduce((sum, q) => sum + lengthOf(q), 0);
        if (!(width > 0)) {
            return null;
        }
        const outer = subpaths[boxes.indexOf(outerBox)];
        const dashClass = continuousPattern(outer);
        // A zigzag or sine wave stroked as Java2D strokes a line has its inner corners drawn through the corner's own
        // point (Stroker's inner join), and round a small node its sharp turns overlap their strokes, both of which
        // lengthen its outlines but not its band: its width is how far its two outlines most often are apart, where
        // the line runs straight.
        const waved = dashClass === "zigzag" || dashClass === "sinewave";
        return patternResult(
            dashClass,
            waved ? outlinesApart(outer, subpaths[1 - boxes.indexOf(outerBox)]) : width,
            box,
        );
    }
    // two shapes side by side, neither round the other, are two shapes (Cytoscape.js's triangle-tee arrow): a line
    // drawn in pieces round a node is many pieces
    if (subpaths.length === 2 || !(ringsAHole(subpaths, box) || drawnInTurn(subpaths)) || !closesOnItself(boxes)) {
        return null;
    }
    // round the ring: along is the angle at the ring's mean radius, its mirror the circle there; across and the
    // tangent are read against the ring's own outline (its pieces' convex hull), so a box's or a diamond's two rows of
    // a double line lie each at one depth, as a circle's do at one radius (cx2-syn-mappings 201 was read as slashes
    // against the circle's radius)
    const r0 = median(subpaths.flat().map((p) => frame(p).across));
    const { dashClass, width } = piecesPattern(subpaths, hullFrame(convexHull(subpaths.flat())), {
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

/**
 * A pattern frame against a convex outline: at a point, the direction of the outline's nearest side and how far
 * inside it the point is.
 * @param hull - the outline, counter-clockwise
 * @returns the frame
 */
function hullFrame(hull: readonly (readonly [number, number])[]): PatternFrame {
    return ([x, y]) => {
        let best = { tangent: [1, 0] as Pt, across: Number.POSITIVE_INFINITY };
        for (let i = 0; i < hull.length; i++) {
            const [x0, y0] = hull[i];
            const [x1, y1] = hull[(i + 1) % hull.length];
            const [dx, dy] = [x1 - x0, y1 - y0];
            const len = Math.hypot(dx, dy);
            if (len <= 1e-9) {
                continue;
            }
            const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (len * len)));
            const d = Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy));
            if (d < best.across) {
                best = { tangent: [dx / len, dy / len], across: d };
            }
        }
        return best;
    };
}

/** How many times as long as it is wide a filled band must be to be read as a line at all. */
const BAND_ASPECT = 1.5;

/** An edge a program drew as a filled band between its two ends: the ends of its axis and its line's pattern. */
export interface PaintedBand extends PaintedOutline {
    /** The two ends of the band's axis, along its longest direction. */
    ends: [Pt, Pt];
    /** How far the band reaches across its axis: a wave's or a zigzag's swing, a double line's two rows. */
    across: number;
    /**
     * The line's route where the band is drawn in pieces (dots, dashes, slashes) and bends: through every piece's
     * center in order along it, so a curved edge's pieces trace its curve rather than its chord. Absent, the band is
     * straight and runs between its `ends`.
     */
    route?: Pt[];
}

/**
 * Whether a filled path is an edge's line drawn as a fill (Cytoscape desktop exports a zigzag, sine-wave, dotted,
 * slashed, arrowed or double edge so), and what of its line can be read: a band at least one and a half times as long
 * as it is wide, of one outline or of many pieces along its axis. A zigzag drawn wide on a short edge is little longer
 * than it is tall (Cytoscape desktop's on a specimen sheet's cell: 60 px long, 27 px across); what makes it an edge is
 * where it ends, which the association checks.
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
    if (a1 - a0 < BAND_ASPECT * Math.max(spread, 1e-9)) {
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
            return { ...patternResult("double", null, box), ends, across: spread };
        }
        const q = subpaths[0];
        const width = (2 * Math.abs(signedArea(q))) / Math.max(lengthOf(q), 1e-9);
        return { ...patternResult(continuousPattern(q), width, box), ends, across: spread };
    }
    if (subpaths.length < 3) {
        return null;
    }
    const alongOf = ([x, y]: Pt): number => (x - mx) * u[0] + (y - my) * u[1];
    const { dashClass, width } = piecesPattern(subpaths, frame, {
        length: a1 - a0,
        along: alongOf,
        mirror: ([x, y]) => {
            const c = -(x - mx) * u[1] + (y - my) * u[0] - mid;
            return [x + 2 * c * u[1], y - 2 * c * u[0]];
        },
    });
    const result = { ...patternResult(dashClass, width, box), ends, across: spread };
    // A straight band reaches across its axis as far as one of its pieces does; one that reaches twice as far bends,
    // and is routed through its pieces' centers, in order along it, its ends the end pieces' centers carried out along
    // the axis to the band's ends.
    const acrossOf = ([x, y]: Pt): number => -(x - mx) * u[1] + (y - my) * u[0];
    const pieceAcross = subpaths.map((q) => {
        const c = q.map(acrossOf);
        return Math.max(...c) - Math.min(...c);
    });
    const sorted = subpaths
        .map((q): Pt => [q.reduce((t, p) => t + p[0], 0) / q.length, q.reduce((t, p) => t + p[1], 0) / q.length])
        .sort((p, q) => alongOf(p) - alongOf(q));
    // A double line's pieces lie in turn on its two rows, which reach across it as far apart as the rows are: its line
    // runs midway between neighboring pieces on the two rows (cx-specimen-edges-lines PARALLEL_LINES, read through each
    // piece's center, zigzagged from one row to the other).
    const centers = dashClass === "double" ? midline(sorted, acrossOf) : sorted;
    const reach = (pts: readonly Pt[]): number => Math.max(...pts.map(acrossOf)) - Math.min(...pts.map(acrossOf));
    if (spread <= 2 * median(pieceAcross) || (dashClass === "double" && reach(centers) <= median(pieceAcross))) {
        return result;
    }
    const out = (c: Pt, a: number): Pt => [c[0] + (a - alongOf(c)) * u[0], c[1] + (a - alongOf(c)) * u[1]];
    return { ...result, route: [out(centers[0], a0), ...centers, out(centers[centers.length - 1], a1)] };
}

/**
 * The line between a double line's two rows of pieces: the middle of each two neighboring pieces that lie on the two
 * rows, a row apart across the line, and not of two on one row (pieces on the two rows are not drawn strictly in turn).
 * @param centers - the pieces' centers, in order along the line
 * @param across - how far across the line a point lies
 * @returns the line's points
 */
function midline(centers: readonly Pt[], across: (p: Pt) => number): Pt[] {
    const steps = centers.slice(1).map((c, i) => Math.abs(across(c) - across(centers[i])));
    const rows = [...steps].sort((a, b) => a - b)[Math.floor(0.75 * steps.length)] ?? 0;
    return centers
        .slice(1)
        .flatMap((c, i): Pt[] =>
            steps[i] >= rows / 2 ? [[(c[0] + centers[i][0]) / 2, (c[1] + centers[i][1]) / 2]] : [],
        );
}

/** How many times as long as its base a filled triangle must be to be read as a line tapering to a point. */
const TAPER_ASPECT = 4;

/**
 * Whether a filled path is an edge's line drawn as a long thin triangle, as wide as the line at one end and narrowing to
 * a point at the other (Cytoscape.js's `straight-triangle`), and its axis: from the middle of its base to its point.
 * @param points - the path's points, in drawing order
 * @returns the band, its width the base's, or null when the path is no such line
 */
export function taperPaintedAsFill(points: readonly Pt[]): PaintedBand | null {
    // its three corners: a closed outline repeats its first point at its end
    const last = points.at(-1);
    const corners =
        last !== undefined && points.length > 1 && Math.hypot(last[0] - points[0][0], last[1] - points[0][1]) < 1e-6
            ? points.slice(0, -1)
            : [...points];
    if (corners.length !== 3) {
        return null;
    }
    const side = (i: number): number => {
        const [a, b] = [corners[(i + 1) % 3], corners[(i + 2) % 3]];
        return Math.hypot(b[0] - a[0], b[1] - a[1]);
    };
    // the base is the shortest side, the point the corner across from it
    const tip = [0, 1, 2].sort((i, j) => side(i) - side(j))[0];
    const [a, b] = [corners[(tip + 1) % 3], corners[(tip + 2) % 3]];
    const base: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const width = side(tip);
    const length = Math.hypot(corners[tip][0] - base[0], corners[tip][1] - base[1]);
    // both long sides alike: a line's taper, not an arrowhead's barb leaning off the line
    if (!(width > 0) || length < TAPER_ASPECT * width || Math.abs(side((tip + 1) % 3) - side((tip + 2) % 3)) > width) {
        return null;
    }
    return {
        width,
        dashClass: "tapered",
        patterned: false,
        box: boxOfPoints(corners),
        ends: [base, corners[tip]],
        across: width,
    };
}

/** How narrow, as a share of its widest, a tapered line's end must be to be read as its point. */
const TAPER_POINT = 0.25;

/**
 * Whether a filled outline is an edge's line drawn as Graphviz's `style=tapered` draws it (lib/common/taper.c): one
 * polygon that runs along one side of the line and back along the other, each point on the way out across from one on
 * the way back, as wide as the pen at its widest and narrowing to a point at one end, or at both (`dir=both`). The
 * axis runs through the middle of each pair, so a curved route keeps its curve.
 * @param points - the outline's points, in drawing order; repeats of the first at the end (closings) are dropped
 * @returns the band, its width the widest pair's and its route the axis; null when the outline is no such line
 */
export function taperedOutline(points: readonly Pt[]): PaintedBand | null {
    const first = points[0];
    const v = [...points];
    while (v.length > 1 && first !== undefined && samePoint(v[v.length - 1], first)) {
        v.pop();
    }
    const n = v.length;
    if (n < 8) {
        return null;
    }
    // each point on the way out and the one across from it on the way back: with a point at the start (dir=both) the
    // way back ends on the start, which the closings took, and the start is its own partner
    const odd = n % 2 === 1;
    const pairs = Array.from({ length: odd ? (n + 1) / 2 : n / 2 }, (_, i): [Pt, Pt] => [
        v[i],
        v[odd ? (n - i) % n : n - 1 - i],
    ]);
    const route = pairs.map(([a, b]): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    const widths = pairs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]));
    const width = Math.max(...widths);
    let length = 0;
    for (let i = 1; i < route.length; i++) {
        length += Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]);
    }
    const pointed = Math.min(widths[0], widths[widths.length - 1]) <= TAPER_POINT * width;
    if (!(width > 0) || !pointed || length < TAPER_ASPECT * width) {
        return null;
    }
    return {
        width,
        dashClass: "tapered",
        patterned: false,
        box: boxOfPoints(v),
        ends: [route[0], route[route.length - 1]],
        across: width,
        route,
    };
}

/**
 * Whether two points are the same, to a coordinate's rounding.
 * @param a - one point
 * @param b - the other
 * @returns true when they coincide
 */
function samePoint(a: Pt, b: Pt): boolean {
    return Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6;
}

/** The sharpest corner, in degrees, a band's end is read as a cap of two corners at; a sharper one is an arrow's tip. */
const TIP_ANGLE = 75;

/** How many times as long as it is wide a closed outline must be to be read as a framed edge's band. */
const FRAMED_ASPECT = 4;

/** How far, as a share of its width, a framed edge's band may narrow or widen anywhere: a coordinate's rounding. */
const FRAMED_SIDES = 0.1;

/** An edge drawn as one closed outline round a band (yEd's `com.yworks.edge.framed`). */
export interface FramedBand {
    /** The line's route through the band's middle, source end first, between its arrowheads' backs or its ends. */
    route: Pt[];
    /** How far apart the band's two sides are: the edge's line width. */
    width: number;
    /** Each arrowhead the outline runs round, as a closed outline from its back on one side to its back on the other. */
    heads: { end: "source" | "target"; outline: Pt[] }[];
}

/**
 * Points evenly along an open polyline by arc length.
 * @param poly - the polyline
 * @param n - how many points, ends included
 * @returns the points
 */
export function spacedAlong(poly: readonly Pt[], n: number): Pt[] {
    const cum = [0];
    for (let i = 1; i < poly.length; i++) {
        cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
    }
    const total = cum[cum.length - 1];
    const out: Pt[] = [];
    let j = 0;
    for (let s = 0; s < n; s++) {
        const target = n === 1 ? 0 : (total * s) / (n - 1);
        while (j < poly.length - 2 && cum[j + 1] < target) {
            j++;
        }
        const seg = cum[j + 1] - cum[j];
        const f = seg > 0 ? Math.min(1, Math.max(0, (target - cum[j]) / seg)) : 0;
        out.push([poly[j][0] + f * (poly[j + 1][0] - poly[j][0]), poly[j][1] + f * (poly[j + 1][1] - poly[j][1])]);
    }
    return out;
}

/**
 * The point of an open polyline nearest a point.
 * @param p - the point
 * @param line - the polyline
 * @returns the nearest point on it
 */
function nearestOn(p: Pt, line: readonly Pt[]): Pt {
    let best: Pt = line[0];
    let bestD = Infinity;
    for (let i = 0; i + 1 < line.length; i++) {
        const [a, b] = [line[i], line[i + 1]];
        const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
        const len2 = dx * dx + dy * dy;
        const t = len2 > 0 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0;
        const q: Pt = [a[0] + t * dx, a[1] + t * dy];
        const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
        if (d < bestD) {
            [best, bestD] = [q, d];
        }
    }
    return best;
}

/**
 * How far a point is from an open polyline.
 * @param p - the point
 * @param line - the polyline
 * @returns the distance
 */
function toPolyline(p: Pt, line: readonly Pt[]): number {
    const q = nearestOn(p, line);
    return Math.hypot(p[0] - q[0], p[1] - q[1]);
}

/**
 * Whether a closed straight-sided outline is an edge drawn as a band round its route, and what of the edge it draws:
 * yEd writes a framed edge as one outline that starts at the source end, runs down one side of the band to the target
 * end (round the target's arrowhead, or across the band's end), back up the other side, and closes round the source
 * end. Its two sides are paired by arc length, the route runs midway between them, and an arrowhead is the part of the
 * outline that reaches out past the band's sides and back to them at a sharp tip.
 * @param vertices - the outline's corners, in drawing order, in the side's frame
 * @param samples - how many points the route is given
 * @returns the band, or null when the outline is no such band
 */
export function framedBand(vertices: readonly Pt[], samples: number): FramedBand | null {
    const gap = (p: Pt, q: Pt): number => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const v: Pt[] = [];
    for (const p of vertices) {
        if (v.length === 0 || gap(p, v[v.length - 1]) > 1e-3) {
            v.push(p);
        }
    }
    if (v.length > 1 && gap(v[0], v[v.length - 1]) <= 1e-3) {
        v.pop();
    }
    if (v.length < 4) {
        return null;
    }
    // yEd starts some outlines at the target's arrowhead, one corner past its tip, at its wing, the tip their last
    // corner (yed-graphml-specimen-edges-lines generic-framed, Arrows target="standard"; graphml-galaxy-lcms-workflow
    // n0::e12, target="delta"): read from the tip, the end read first is the target
    const plain = bandOf(v, samples);
    if (plain !== null) {
        return plain;
    }
    const fromTarget = bandOf([v[v.length - 1], ...v.slice(0, -1)], samples);
    return fromTarget === null
        ? null
        : {
              route: [...fromTarget.route].reverse(),
              width: fromTarget.width,
              heads: fromTarget.heads
                  .map((h) => ({ ...h, end: h.end === "source" ? ("target" as const) : ("source" as const) }))
                  .reverse(),
          };
}

/**
 * The band a closed outline draws, read from its first corner (`framedBand`).
 * @param v - the outline's corners, no two alike in a row, at least 4
 * @param samples - how many points the route is given
 * @returns the band, or null when the outline read from that corner is no such band
 */
function bandOf(v: readonly Pt[], samples: number): FramedBand | null {
    const gap = (p: Pt, q: Pt): number => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const n = v.length;
    const at = (i: number): Pt => v[((i % n) + n) % n];
    const fwd = [0];
    for (let i = 1; i <= n; i++) {
        fwd.push(fwd[i - 1] + gap(at(i - 1), at(i)));
    }
    const perimeter = fwd[n];
    // the far end: the corner as far round the outline from its start one way as the other
    let k = 1;
    for (let i = 2; i < n; i++) {
        if (Math.min(fwd[i], perimeter - fwd[i]) > Math.min(fwd[k], perimeter - fwd[k])) {
            k = i;
        }
    }
    const angleAt = (i: number): number => {
        const [a, o, b] = [at(i - 1), at(i), at(i + 1)];
        const [ux, uy, wx, wy] = [a[0] - o[0], a[1] - o[1], b[0] - o[0], b[1] - o[1]];
        return Math.abs((Math.atan2(ux * wy - uy * wx, ux * wx + uy * wy) * 180) / Math.PI);
    };
    const tip0 = angleAt(0) < TIP_ANGLE;
    const tipK = angleAt(k) < TIP_ANGLE;
    // side A runs forward from the source end, side B backward; at a cap they start at its two corners
    let [a0, b0] = [0, n];
    if (!tip0) {
        [a0, b0] = gap(at(0), at(1)) < gap(at(0), at(n - 1)) ? [1, n] : [0, n - 1];
    }
    let [a1, b1] = [k, k];
    if (!tipK) {
        [a1, b1] = gap(at(k), at(k + 1)) < gap(at(k), at(k - 1)) ? [k, k + 1] : [k - 1, k];
    }
    if (a1 - a0 < 1 || b0 - b1 < 1) {
        return null;
    }
    const sideA = Array.from({ length: a1 - a0 + 1 }, (_, i) => at(a0 + i));
    const sideB = Array.from({ length: b0 - b1 + 1 }, (_, i) => at(b0 - i));
    // a corner of one side lies the band's width from the other side; an arrowhead's wing lies further, its tip on it
    const tipAt = (p: Pt): boolean => (tip0 && p === at(0)) || (tipK && p === at(k));
    const offsets = [
        ...sideA.filter((p) => !tipAt(p)).map((p) => toPolyline(p, sideB)),
        ...sideB.filter((p) => !tipAt(p)).map((p) => toPolyline(p, sideA)),
    ];
    const apart = Math.min(...offsets);
    if (!(apart > 0)) {
        return null;
    }
    const onSide = (1 + FRAMED_SIDES) * apart + 0.05;
    // the corner, counted from a side's tip, where the outline comes back to the band's side past the arrowhead's wing
    const backOf = (side: readonly Pt[], other: readonly Pt[]): number => {
        let wing = false;
        for (let j = 1; j < side.length - 1; j++) {
            if (toPolyline(side[j], other) > onSide) {
                wing = true;
            } else if (wing) {
                return j;
            }
        }
        return -1;
    };
    let [a, b] = [sideA, sideB];
    const heads: FramedBand["heads"] = [];
    if (tip0) {
        const [ja, jb] = [backOf(a, b), backOf(b, a)];
        if (ja > 0 && jb > 0) {
            heads.push({ end: "source", outline: [...a.slice(0, ja + 1).reverse(), ...b.slice(1, jb + 1)] });
            [a, b] = [a.slice(ja), b.slice(jb)];
        }
    }
    if (tipK) {
        const [ra, rb] = [[...a].reverse(), [...b].reverse()];
        const [ja, jb] = [backOf(ra, rb), backOf(rb, ra)];
        if (ja > 0 && jb > 0) {
            heads.push({ end: "target", outline: [...ra.slice(0, ja + 1).reverse(), ...rb.slice(1, jb + 1)] });
            [a, b] = [ra.slice(ja).reverse(), rb.slice(jb).reverse()];
        }
    }
    // past the arrowheads, each point of one side paired with the nearest point of the other, straight across the band
    // (side by side, the outer side of a bend is the longer)
    const across = spacedAlong(a, samples).map((p): [Pt, Pt] => [p, nearestOn(p, b)]);
    const route = across.map(([p, q]): Pt => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]);
    const gaps = across.map(([p, q]) => gap(p, q));
    const width = median(gaps);
    let length = 0;
    for (let i = 1; i < sideA.length; i++) {
        length += gap(sideA[i - 1], sideA[i]);
    }
    // two sides that keep one width apart the whole way, far longer, arrowheads and all, than that width (a star's or a
    // gear's sides come and go)
    if (
        !(width > 0) ||
        length < FRAMED_ASPECT * width ||
        gaps.some((g) => Math.abs(g - width) > FRAMED_SIDES * width)
    ) {
        return null;
    }
    return { route, width, heads };
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
    // a line across the edge with no length of its own, as far as its coordinates' rounding (yEd's dash and t_shape)
    if (W > 1e-9 && L < BAR_LENGTH * W) {
        return "tee";
    }
    if (!(L > 1e-9 && W > 1e-9)) {
        return "other";
    }
    // where the outline crosses the line square to the axis at t, back (0) to tip (1)
    const crossings = (t: number): number[] => crossingsAt(a, c, a0 + t * L);
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
    // full width all along is a box however it is turned: one a few degrees off its axis has one corner for a tip, at
    // its side, as a zigzag's fitted axis leaves it on cx-syn-mappings 252->255
    if (Math.min(...w) >= 0.85) {
        return L < 0.5 * W ? "tee" : "box";
    }
    // half an arrow (a barb, a triangle with one side along the line) lies wholly to one side of its tip, which is on
    // the line
    const tipped = outline.flatMap((_, i) => (a[i] >= a1 - 0.02 * L ? [c[i]] : []));
    const ct = tipped.reduce((x, y) => x + y, 0) / tipped.length;
    if (c0 >= ct - 0.15 * W || c1 <= ct + 0.15 * W) {
        return "half";
    }
    if (middle >= 0.85 && back <= 0.45 && tip <= 0.45) {
        return "diamond";
    }
    if (middle >= 0.85 && back <= 0.8 && tip <= 0.8) {
        return "circle";
    }
    if (back > tip + 0.3) {
        // notched when the back is pressed in more than about a fifth of the length (0.19): draw.io's classic, a
        // quarter deep, is a vee; Pajek's arrow (a sixth) and vis-network's (a tenth) are triangles. At 0.2 a quarter
        // notch covers exactly 0.75, so the line is drawn at 0.15.
        return cover(0.15) < 0.75 ? "vee" : "triangle";
    }
    // a triangle pointing back widens evenly towards the tip; a half circle is most of its width by its middle
    if (tip > back + 0.3 && middle < 0.75) {
        if (cover(0.8) >= 0.75) {
            return "inverted";
        }
        // a crow's foot has a tine along the line between its outer two, crossed near its tip as a third run (Graphviz's
        // crow draws it as a spike of no width, crossed twice at one place); a vee turned back (vis-network's crow) has
        // its notch empty there
        return crossings(0.85).length >= 6 ? "crow" : "inverted-vee";
    }
    // half a disc, flat across the tip: sqrt(1 - (1 - t)^2) wide, 0.44 near its back, 0.87 at its middle, all of it at
    // the tip
    const widening = w.every((x, i) => i === 0 || x >= w[i - 1] - 0.02);
    if (widening && tip >= 0.9 && middle >= 0.75 && middle < 0.95 && back <= 0.6 && w[2] >= 0.6 && w[2] <= 0.85) {
        return "half-circle";
    }
    return crossedDelta(outline, a, c, dir) ? "cross-delta" : "other";
}

/**
 * Where a closed outline crosses a line square to an axis, across the axis, in order.
 * @param a - each point's place along the axis
 * @param c - each point's place across it
 * @param at - the place along the axis
 * @returns the places across it
 */
function crossingsAt(a: readonly number[], c: readonly number[], at: number): number[] {
    const xs: number[] = [];
    for (let i = 0; i < a.length; i++) {
        const j = (i + 1) % a.length;
        // half open, so a vertex on the line is crossed once, not once by each side meeting there
        if (a[i] <= at !== a[j] <= at) {
            xs.push(c[i] + ((at - a[i]) / (a[j] - a[i])) * (c[j] - c[i]));
        }
    }
    return xs.sort((x, y) => x - y);
}

/** A barb no thicker than this share of its length, across its middle, is a stroke drawn as a fill. */
const STROKED_BARB = 0.1;

/**
 * Whether a filled outline is a barb drawn as a stroke: a strip of even width, its thickest across the middle of its
 * long axis (its two points farthest apart) at most `STROKED_BARB` of its length. Cytoscape desktop exports its
 * HALF_TOP and HALF_BOTTOM as such a strip, one open stroked barb, where a half arrow drawn filled is a wedge.
 * @param outline - the outline, in drawing order
 * @returns true for a stroked barb
 */
export function strokedBarb(outline: readonly Pt[]): boolean {
    let [p, q, d] = [outline[0], outline[0], 0];
    for (const u of outline) {
        for (const v of outline) {
            const uv = Math.hypot(v[0] - u[0], v[1] - u[1]);
            if (uv > d) {
                [p, q, d] = [u, v, uv];
            }
        }
    }
    if (outline.length < 3 || !(d > 1e-9)) {
        return false;
    }
    const [ux, uy] = [(q[0] - p[0]) / d, (q[1] - p[1]) / d];
    const a = outline.map(([x, y]) => (x - p[0]) * ux + (y - p[1]) * uy);
    const c = outline.map(([x, y]) => -(x - p[0]) * uy + (y - p[1]) * ux);
    // across its middle only: a stroke's ends (a cap, the foot it stands on) are wider than its run
    const thickest = Math.max(
        ...[0.3, 0.4, 0.5, 0.6, 0.7].map((t) => {
            const xs = crossingsAt(a, c, t * d);
            return xs.length < 2 ? 0 : (xs.at(-1) ?? 0) - xs[0];
        }),
    );
    return thickest <= STROKED_BARB * d;
}

/** The share of its width a head reaches along its line at most, to be a bar drawn as one line across it. */
const BAR_LENGTH = 0.02;

/**
 * A stroke's two ends, where it runs straight, there and back if the path closes it: the point farthest from its start.
 * @param q - the stroke's points
 * @returns its ends, or null for a stroke that bends
 */
function straightRun(q: readonly Pt[]): [Pt, Pt] | null {
    const a = q[0];
    const b = q.reduce(
        (far, p) => (Math.hypot(p[0] - a[0], p[1] - a[1]) > Math.hypot(far[0] - a[0], far[1] - a[1]) ? p : far),
        a,
    );
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const off = (p: Pt): number => Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / len;
    return len > 1e-9 && q.every((p) => off(p) <= 0.05 * len) ? [a, b] : null;
}

/**
 * Whether an arrowhead's pieces are two straight strokes crossing at their middles: the middles within a tenth of a
 * stroke's length of one another, and not along one line.
 * @param pieces - the arrowhead's subpaths
 * @returns true for a cross
 */
export function crossedStrokes(pieces: readonly (readonly Pt[])[]): boolean {
    const [s, t] = pieces.map(straightRun);
    if (pieces.length !== 2 || s === null || t === null) {
        return false;
    }
    const [u, v] = [s, t].map(([a, b]) => [b[0] - a[0], b[1] - a[1]]);
    const [m, n] = [s, t].map(([a, b]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    const [lu, lv] = [Math.hypot(u[0], u[1]), Math.hypot(v[0], v[1])];
    return Math.hypot(m[0] - n[0], m[1] - n[1]) <= 0.1 * lu && Math.abs(u[0] * v[1] - u[1] * v[0]) > 0.25 * lu * lv;
}

/**
 * The shape class of an arrowhead drawn as separate pieces in one path, where the pieces read as one outline make no
 * shape (Cytoscape.js's compound arrows): a disc and a triangle are a circle-triangle; a triangle with bars beside it
 * reads as its triangle, pointing the way it points (a triangle-tee or triangle-cross part-way along a line, pointing
 * back at its source, is inverted), as graphty's triangle-tee and triangle-cross caps read.
 * @param pieces - the arrowhead's subpaths
 * @param dir - the axis, back to tip
 * @returns the class, or null when the pieces are none of these
 */
export function piecedArrowShapeOf(pieces: readonly (readonly Pt[])[], dir: Pt): ArrowShape | null {
    if (crossedStrokes(pieces)) {
        return "cross";
    }
    const shapes = pieces.map((q) => arrowShapeOf(q, dir));
    const triangles = shapes.filter((x) => x === "triangle" || x === "inverted");
    const rest = shapes.filter((x) => x !== "triangle" && x !== "inverted");
    if (triangles.length !== 1 || rest.length === 0) {
        return null;
    }
    if (rest.length === 1 && rest[0] === "circle") {
        return "circle-triangle";
    }
    return rest.every((x) => x === "tee" || x === "box") ? triangles[0] : null;
}

/**
 * Whether an arrowhead is a delta with a bar across the line behind it, a gap between them (Cytoscape's CROSS_DELTA
 * and CROSS_OPEN_DELTA): no point of the outline in a gap across the axis, a thin bar behind it at least as wide as
 * what is in front, and a delta in front, solid or outlined.
 * @param outline - the outline
 * @param a - each point's place along the axis
 * @param c - each point's place across it
 * @param dir - the axis
 * @returns true for a crossed delta
 */
function crossedDelta(outline: readonly Pt[], a: readonly number[], c: readonly number[], dir: Pt): boolean {
    const sorted = [...a].sort((x, y) => x - y);
    const L = (sorted.at(-1) ?? 0) - sorted[0];
    // the first gap from the back (a delta drawn by its corners alone has another between its back and its tip)
    const at = sorted.findIndex((x, i) => i > 0 && x - sorted[i - 1] > 0.1 * L);
    if (at < 0 || sorted[at - 1] - sorted[0] > 0.2 * L) {
        return false;
    }
    const cut = sorted[at - 1];
    const span = (keep: (i: number) => boolean): number => {
        const cs = c.filter((_, i) => keep(i));
        return cs.length === 0 ? 0 : Math.max(...cs) - Math.min(...cs);
    };
    const front = outline.filter((_, i) => a[i] > cut);
    return (
        front.length >= 3 &&
        span((i) => a[i] <= cut) >= 0.95 * span((i) => a[i] > cut) &&
        // an outlined delta drawn as a frame (an inner delta inside the outer one) reads as a notched one
        ["triangle", "vee"].includes(arrowShapeOf(front, dir))
    );
}

/** A closed outline's area under this share of its convex hull's has a dent a reader sees: a figure, not a box. */
export const FIGURE_FILLS = 0.95;

/** Twice the area a closed outline encloses (shoelace). */
export const twiceArea = (ring: readonly (readonly [number, number])[]): number =>
    Math.abs(
        ring.reduce(
            (s, [x0, y0], i) => s + x0 * ring[(i + 1) % ring.length][1] - ring[(i + 1) % ring.length][0] * y0,
            0,
        ),
    );

/**
 * Whether a closed outline has a dent (Pajek's man, woman and cross, a star): its area under `FIGURE_FILLS` of its
 * convex hull's. A shape with none is judged by its box or the ellipse in it.
 * @param pts - the outline
 * @returns true for a figure
 */
export function dented(pts: readonly (readonly [number, number])[]): boolean {
    return pts.length >= 4 && twiceArea(pts) < FIGURE_FILLS * twiceArea(convexHull(pts));
}

/**
 * A closed outline's edges in halves of a box from a center (a node's `figure`), when it has a dent (`dented`), else
 * undefined.
 * @param pts - the outline, in the side's pixels
 * @param n - the node's center and size, in the same pixels
 * @param n.cx - its center's x
 * @param n.cy - its center's y
 * @param n.w - its width
 * @param n.h - its height
 * @returns the edges, or undefined
 */
export function figureOf(
    pts: readonly Pt[],
    n: { cx: number; cy: number; w: number; h: number },
): [Pt, Pt][] | undefined {
    if (!(n.w > 0 && n.h > 0) || !dented(pts)) {
        return undefined;
    }
    const unit = pts.map(([x, y]): Pt => [(x - n.cx) / (n.w / 2), (y - n.cy) / (n.h / 2)]);
    return unit.map((q, i): [Pt, Pt] => [q, unit[(i + 1) % unit.length]]);
}

/**
 * Whether a point lies inside a node's figure (`PNode.figure`, even-odd), or within `slack` pixels of its outline.
 * @param figure - the figure's edges, in halves of the node's size from its center
 * @param n - the node's center and size, in the point's pixels
 * @param n.cx - its center's x
 * @param n.cy - its center's y
 * @param n.w - its width
 * @param n.h - its height
 * @param p - the point
 * @param slack - how far outside the outline still counts as inside, in pixels
 * @returns true when the point is inside
 */
export function insideFigure(
    figure: readonly (readonly [Readonly<Pt>, Readonly<Pt>])[],
    n: { cx: number; cy: number; w: number; h: number },
    [px, py]: Readonly<Pt>,
    slack = 0,
): boolean {
    const [hw, hh] = [n.w / 2, n.h / 2];
    const edges = figure.map(([a, b]): [Pt, Pt] => [
        [n.cx + a[0] * hw, n.cy + a[1] * hh],
        [n.cx + b[0] * hw, n.cy + b[1] * hh],
    ]);
    let inside = false;
    for (const [[x0, y0], [x1, y1]] of edges) {
        if (y0 > py !== y1 > py && px < x0 + ((py - y0) * (x1 - x0)) / (y1 - y0)) {
            inside = !inside;
        }
    }
    const off = ([[x0, y0], [x1, y1]]: [Pt, Pt]): number => {
        const [dx, dy] = [x1 - x0, y1 - y0];
        const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy || 1)));
        return Math.hypot(px - x0 - t * dx, py - y0 - t * dy);
    };
    return inside || (slack > 0 && edges.some((e) => off(e) <= slack));
}
