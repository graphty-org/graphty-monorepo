/**
 * graphty-element's drawing in the oracle comparison's primitive model (`primitives.ts`): the
 * scene `extractScene` built from the renderer (with its precedence rules: a hidden node, a
 * covered fill, an occluded label are not drawn) plus what only the raw drawn read
 * (`drawn-scene.ts`) carries -- a label's weight, style, family and rotation, a gradient fill,
 * each flat arrowhead's outline. Lengths are render pixels, y down. Pure: no DOM.
 */
import type { Scene, SceneNode, ShapeClass } from "../../../../graph-io/test/fidelity/scene";
import type { DrawnEdge, DrawnGraph, DrawnLabel } from "../drawn-scene";
import { borderInset } from "../extract-scene";
import { extendToTip, measureArrow, mergeTexts, stackedOn, withinShape } from "./associate";
import {
    type ArrowShape,
    boxOfPoints,
    compareIds,
    type DashClass,
    dashClassOf,
    type PArrow,
    type PBox,
    type PEdge,
    type PGradient,
    type PNode,
    type PScene,
    type PShape,
    type Pt,
    type PText,
} from "./primitives";

const SHAPES: Partial<Record<ShapeClass, PShape>> = {
    ellipse: "ellipse",
    rect: "rect",
    roundrect: "roundrect",
    triangle: "triangle",
    diamond: "diamond",
    hexagon: "hexagon",
    octagon: "octagon",
};

function textOf(d: DrawnLabel): PText {
    // the words' own box, as an SVG text's box is its letters', not the plane they are drawn on with its margins
    const b = d.textBox ?? d.box;
    const box = { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 };
    const n = Math.max(1, d.lineCount);
    const lineH = (box.y1 - box.y0) / n;
    const bg = d.background;
    return {
        content: d.text,
        x: (box.x0 + box.x1) / 2,
        y: (box.y0 + box.y1) / 2,
        box,
        sizePx: d.fontPx,
        family: d.family,
        weight: d.weight,
        style: d.style === "italic" || d.style === "oblique" ? d.style : "normal",
        anchor: "middle",
        rotation: d.rotation,
        color: d.color,
        opacity: d.opacity,
        // graphty draws its lines in one plane: their count is read, their alignment declared
        lines: Array.from({ length: n }, (_, i) => ({ ...box, y0: box.y0 + i * lineH, y1: box.y0 + (i + 1) * lineH })),
        align: d.align,
        outline: d.outline,
        background:
            bg === null
                ? null
                : {
                      box: bg.box,
                      fill: bg.color === null ? null : { color: bg.color, opacity: bg.opacity, gradient: null },
                      stroke:
                          bg.border === null
                              ? null
                              : {
                                    color: bg.border.color,
                                    opacity: bg.border.opacity,
                                    width: bg.border.width,
                                    dash: null,
                                    dashClass: "solid",
                                },
                      shape: bg.rounded ? "roundrect" : "rect",
                  },
    };
}

/**
 * The line class of each pattern graphty draws an edge or a border in. Its discrete patterns are elements one and a half
 * element lengths apart (`patternElementPeriod`), a gap no reader takes for a solid line, so the dash class
 * `dashClassOf` reads a dash array by is the element's: a dash three widths long is a dash, a dot or a square box one
 * width long a dot. A star or a diamond is a pattern no class names.
 */
const LINE_CLASS: Readonly<Record<string, DashClass>> = {
    solid: "solid",
    dashed: "dashed",
    dotted: "dotted",
    double: "double",
    dash: "dashed",
    dot: "dotted",
    box: "dotted",
    "dash-dot": "dash-dot",
    sinewave: "sinewave",
    zigzag: "zigzag",
    "forward-slash": "slashes",
    "backward-slash": "slashes",
    "vertical-slash": "slashes",
    "separate-arrow": "arrows",
    "contiguous-arrow": "arrows",
};

/** The patterns whose elements are dashes or dots, whose class the drawn element lengths and gaps decide. */
const DASHED_PATTERNS: ReadonlySet<string> = new Set(["dash", "dot", "box", "dash-dot", "dashed", "dotted"]);

/**
 * The line class of an edge as graphty drew it: a dashed or dotted pattern by its elements' drawn lengths and the gaps
 * between them against the line's width (`dashClassOf`, the rule the oracle's dash arrays are read by), so elements
 * crowded together on a short edge read as the solid line they show; any other pattern by its name.
 * @param style - the scene's line style
 * @param pattern - the pattern graphty drew, or null
 * @param dashPx - the drawn elements and gaps, or null where none were read
 * @param width - the line's width in pixels
 * @returns the class
 */
function drawnLineClass(
    style: string,
    pattern: string | null,
    dashPx: readonly number[] | null,
    width: number,
): DashClass {
    const name = pattern ?? style;
    if (dashPx !== null && dashPx.length >= 2 && DASHED_PATTERNS.has(name)) {
        return dashClassOf(dashPx, width);
    }
    return LINE_CLASS[name] ?? "other";
}

/**
 * The drawn elements and gaps a line's class is measured off, or null where it is read by name.
 * @param style - the scene's line style
 * @param pattern - the pattern graphty drew, or null
 * @param dashPx - the drawn elements and gaps, or null
 * @returns the dash array in pixels, or null
 */
const dashed = (style: string, pattern: string | null, dashPx: readonly number[] | null): number[] | null =>
    dashPx !== null && dashPx.length >= 2 && DASHED_PATTERNS.has(pattern ?? style) ? [...dashPx] : null;

/** The shape class of each cap type graphty draws; a hollow cap's is its filled twin's. */
const ARROW_SHAPE: Readonly<Record<string, ArrowShape>> = {
    normal: "triangle",
    "open-normal": "triangle",
    inverted: "inverted",
    vee: "vee",
    crow: "crow",
    diamond: "diamond",
    "open-diamond": "diamond",
    dot: "circle",
    "open-dot": "circle",
    "sphere-dot": "circle",
    box: "box",
    tee: "tee",
    "half-open": "half",
    "half-circle": "half-circle",
    "open-half-circle": "half-circle",
    // the round side of a half circle alone, bulging toward the node (vis-network's curve), drawn as a stroke
    curve: "half-circle",
    // a triangle with a bar behind it reads as the triangle
    "triangle-tee": "triangle",
    "triangle-cross": "triangle",
    // a disc at the tip with a triangle behind it pointing at it, read as itself whichever way it points
    "circle-triangle": "circle-triangle",
    // a picture standing on the line
    image: "image",
    // a delta with a bar across the line behind it, a gap between them; a hollow one's is its filled twin's
    "cross-delta": "cross-delta",
    "open-cross-delta": "cross-delta",
};

/** Where along its edge each of graphty's caps sits. */
/**
 * The band graphty draws under an edge's line, with the line class of the pattern it is drawn in (a joined line's dots
 * dotted, its dashes dashed); none for a solid band.
 * @param o - the band as drawn, or null
 * @returns the band, or null for none
 */
function outlineOf(o: DrawnEdge["outline"] | undefined): PEdge["outline"] {
    if (o === null || o === undefined) {
        return null;
    }
    const { pattern, ...band } = o;
    const dashClass = pattern === undefined ? "solid" : (LINE_CLASS[pattern] ?? "other");
    return dashClass === "solid" ? band : { ...band, dashClass };
}

const CAP_END: Readonly<Record<DrawnEdge["caps"][number]["end"], PArrow["end"]>> = {
    arrowHead: "target",
    arrowTail: "source",
    arrowMiddleHead: "middle",
    arrowMiddleTail: "middle",
};

/** The shape classes a cap cut to one side of its line keeps: its front still runs across the line. */
const SIDED_KEEP_CLASS: ReadonlySet<ArrowShape> = new Set(["box", "tee", "inverted"]);

/** A shape class turned to point back along its line, where turning it changes its class. */
const POINTING_BACK: Partial<Record<ArrowShape, ArrowShape>> = {
    triangle: "inverted",
    inverted: "triangle",
    vee: "crow",
    crow: "vee",
};

/** One of graphty's drawn caps. */
type DrawnCap = DrawnEdge["caps"][number];

/** How far off its line's end a cap may sit before a reader sees it stand off, sit back or sit aside, in pixels. */
const CAP_PLACE_PX = 2;

/**
 * graphty's cap as drawn: its shape by its name, unless its outline points the other way along the line (a head drawn
 * backward), and how far it sits off its line's end. The name alone read a head drawn backward, or one standing 15 px
 * off its line, 30 px back along it or 12 px to its side, as a head in its place (extendToTip bridged a gap to it).
 * @param c - the cap
 * @param line - the line as drawn, source end first, before any cap carries it on
 * @returns the arrow
 */
function drawnArrow(c: DrawnCap, line: readonly Pt[]): PArrow {
    const end = CAP_END[c.end];
    const open =
        (c.name.includes("open") && !FILLED_OPEN_NAMES.some((n) => c.name.includes(n))) ||
        STROKED_NAMES.some((n) => c.name.includes(n));
    // a cap part-way along is classed against the line's direction, source to target, as the oracle's is: a mid tail
    // points back along it
    const named = arrowShapeNamed(c.name);
    const shape = c.end === "arrowMiddleTail" ? (POINTING_BACK[named] ?? named) : named;
    // a picture's colors are its own, not the cap's
    const look = { filled: !open, color: shape === "image" ? null : c.color, shape };
    if (c.outline === null) {
        return { end, length: c.sizePx, width: c.sizePx, ...look };
    }
    const read = measureArrow(c.outline, line, end, { filled: look.filled, color: look.color });
    const backward = end !== "middle" && POINTING_BACK[shape] !== undefined && read.shape === POINTING_BACK[shape];
    const arrow = measureArrow(c.outline, line, end, backward ? { ...look, shape: read.shape } : look);
    // a half arrow lies to one side of its line by its make
    const misplaced = end === "middle" ? 0 : capPlaceMiss(c.outline, line, end, !shape.startsWith("half"));
    return misplaced > 0 ? { ...arrow, misplaced } : arrow;
}

/**
 * How far past `CAP_PLACE_PX` a cap at a line's end sits off it: ahead of the end with a gap between, behind it
 * wholly back along the line, or its middle aside from the line by more than a quarter of its width.
 * @param outline - the cap's points
 * @param line - the line, source end first
 * @param end - the end it caps
 * @param centered - whether the cap is drawn centered on its line (not half an arrow)
 * @returns the pixels past the allowance, 0 for a cap on its end
 */
export function capPlaceMiss(
    outline: readonly Pt[],
    line: readonly Pt[],
    end: "source" | "target",
    centered = true,
): number {
    const run = end === "target" ? line : [...line].reverse();
    const tip = run.at(-1);
    const from = [...run].reverse().find((p) => tip !== undefined && Math.hypot(p[0] - tip[0], p[1] - tip[1]) >= 1);
    if (tip === undefined || from === undefined || outline.length === 0) {
        return 0;
    }
    const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
    const [ux, uy] = [(tip[0] - from[0]) / len, (tip[1] - from[1]) / len];
    const along = outline.map(([x, y]) => (x - tip[0]) * ux + (y - tip[1]) * uy);
    const across = outline.map(([x, y]) => -(x - tip[0]) * uy + (y - tip[1]) * ux);
    const width = Math.max(...across) - Math.min(...across);
    const middle = (Math.max(...across) + Math.min(...across)) / 2;
    const ahead = Math.max(0, Math.min(...along));
    const behind = Math.max(0, -Math.max(...along));
    const aside = centered ? Math.max(0, Math.abs(middle) - 0.25 * width) : 0;
    return Math.max(0, Math.max(ahead, behind, aside) - CAP_PLACE_PX);
}

/** The caps whose name says "open" though they are drawn filled: graphty's half-open is one filled barb (a half vee). */
const FILLED_OPEN_NAMES: readonly string[] = ["half-open"];

/** Cap names drawn as a stroke, hollow whatever their name says (vis-network's curve, an arc). */
const STROKED_NAMES: readonly string[] = ["curve"];

/**
 * A path whose end at an open half circle is moved back to the arc's back, where the line meets the stroke.
 * @param path - the edge's path, source end first, ending at the cap's mouth
 * @param outline - the arc's points
 * @param end - which end it caps
 * @returns the path, its end moved back along its last segment
 */
function backToArc(
    path: readonly [number, number][],
    outline: readonly [number, number][],
    end: "source" | "target",
): [number, number][] {
    const pts = end === "target" ? [...path] : [...path].reverse();
    const last = pts.at(-1);
    const back = pts.at(-2);
    if (last === undefined || back === undefined || outline.length === 0) {
        return [...path];
    }
    const len = Math.hypot(last[0] - back[0], last[1] - back[1]);
    if (len < 1e-9) {
        return [...path];
    }
    const [dx, dy] = [(last[0] - back[0]) / len, (last[1] - back[1]) / len];
    const reach = Math.min(...outline.map((q) => (q[0] - last[0]) * dx + (q[1] - last[1]) * dy));
    if (reach < 0 && -reach < len) {
        pts[pts.length - 1] = [last[0] + dx * reach, last[1] + dy * reach];
    }
    return end === "target" ? pts : pts.reverse();
}

/**
 * A cap's shape class by its mesh's name (`arrow-2d-open-normal`, `sphere-dot-arrow-3d`): the longest cap type the name
 * holds, so "open-normal" is not read as "normal".
 * @param name - the cap's mesh name
 * @returns the class
 */
function arrowShapeNamed(name: string): ArrowShape {
    const type = Object.keys(ARROW_SHAPE)
        .filter((t) => name.includes(t))
        .sort((a, b) => b.length - a.length)[0];
    const shape = type === undefined ? "other" : (ARROW_SHAPE[type] ?? "other");
    // a cap cut along its line to one side (`arrowHead.side`) is half an arrow when its tip is a point on the line; a
    // box, a bar or a triangle pointing back still meets the line along its whole front, and reads as itself
    return /-(?:left|right)-half\b/.test(name) && !SIDED_KEEP_CLASS.has(shape) ? "half" : shape;
}

/**
 * A node's gradient as graphty paints it: its colors at their stops (evenly spaced when it has none), a linear one
 * along its direction.
 * @param ramp - the drawn ramp
 * @returns the gradient, or null
 */
function gradientOf(
    ramp: { kind: "linear" | "radial"; colors: string[]; direction: number | null; stops?: number[] } | null,
): PGradient | null {
    if (ramp === null) {
        return null;
    }
    const last = Math.max(ramp.colors.length - 1, 1);
    return {
        kind: ramp.kind,
        stops: ramp.colors.map((color, i) => ({ offset: ramp.stops?.[i] ?? i / last, color, opacity: 1 })),
        angle: ramp.kind === "linear" ? (ramp.direction ?? 0) : null,
    };
}

/**
 * An edge's gradient as graphty draws it: each piece's color at the piece's middle, a linear one along the line's
 * chord from its source end, a radial one by its distance from the line's middle.
 * @param drawn - the drawn gradient
 * @param points - the line on screen, source end first
 * @returns the gradient, or null
 */
function edgeGradientOf(drawn: DrawnEdge["gradient"], points: readonly [number, number][]): PGradient | null {
    if (drawn === null || drawn.colors.length === 0) {
        return null;
    }
    const n = drawn.colors.length;
    // a linear piece is one flat color from its start to its end: a hard switch between two pieces is drawn as one, not
    // blended across the two pieces' middles (dot-specimen-edges-lines color-segments, red;0.5:blue)
    const stops = drawn.colors
        .flatMap((color, i) =>
            drawn.kind === "radial"
                ? [{ offset: Math.abs((2 * (i + 0.5)) / n - 1), color, opacity: 1 }]
                : [
                      { offset: i / n, color, opacity: 1 },
                      { offset: (i + 1) / n, color, opacity: 1 },
                  ],
        )
        .sort((a, b) => a.offset - b.offset);
    const [a, b] = [points[0], points.at(-1) ?? points[0]];
    return {
        kind: drawn.kind,
        stops,
        angle:
            drawn.kind === "linear" && a !== undefined ? (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI : null,
    };
}

/**
 * The glyph a node with no body draws, as the free text a program draws it as: its character over the node's box.
 * @param n - the node
 * @param glyph - its glyph and color, or null
 * @returns the text, none without a glyph
 */
function glyphTexts(n: SceneNode, glyph: { text: string; color: string | null } | null): PText[] {
    if (glyph === null) {
        return [];
    }
    const box = { x0: n.x - n.w / 2, y0: n.y - n.h / 2, x1: n.x + n.w / 2, y1: n.y + n.h / 2 };
    return [
        {
            content: glyph.text,
            x: n.x,
            y: n.y,
            box,
            sizePx: n.h,
            family: "",
            weight: 400,
            style: "normal",
            anchor: "middle",
            rotation: 0,
            color: glyph.color ?? "#000000",
            opacity: 1,
            owner: n.id,
        },
    ];
}

/**
 * The arrowheads graphty draws on edges it draws no line for (Gephi's swallowed curved edge keeps its arrowhead,
 * `gexf-sigma-ediaspora`), as free shapes: no line carries them on either side, so the oracle's are strays, and each
 * is judged against graphty's by its box (stray.present, stray.extra). One wholly inside an opaque node is drawn under
 * it and seen nowhere, as the oracle's side leaves out a stray under a node drawn after it (`withoutCovered`).
 * @param scene - the scene
 * @param drawn - `readDrawn` of the same frame
 * @returns the caps, as strays without their index
 */
function linelessCaps(
    scene: Scene,
    drawn: DrawnGraph,
): { tag: string; kind: "shape"; box: PBox; fill: string | null; stroke: null; text: null }[] {
    const opaque = scene.nodes.flatMap((n) => {
        const d = drawn.nodes.get(n.id);
        return d !== undefined && d.visible && d.fillDrawn !== null && d.fillOpacity >= 0.99
            ? [{ box: d.box, ellipse: n.shape === "ellipse" }]
            : [];
    });
    return scene.edges.flatMap((e) => {
        const d = drawn.edges.get(e.id);
        if (d === undefined || !d.shown || (e.points.length >= 2 && e.width > 0 && e.opacity > 0)) {
            return [];
        }
        return d.caps.flatMap((c) =>
            c.outline === null ||
            c.outline.length === 0 ||
            c.opacity <= 0 ||
            c.sizePx <= 0 ||
            opaque.some((n) => withinShape(boxOfPoints(c.outline ?? []), n.box, n.ellipse))
                ? []
                : [
                      {
                          tag: "arrowhead",
                          kind: "shape" as const,
                          box: boxOfPoints(c.outline),
                          fill: c.color,
                          stroke: null,
                          text: null,
                      },
                  ],
        );
    });
}

/**
 * Where a reader sees each edge end: an end at a node drawn wholly under another at the same place (`hiddenBy`, a
 * station drawn over another line's station, json-cyjs-tokyo's 199) is at the node drawn over it, the one the line is
 * seen to end at, as the oracle's side reads it (`withoutCovered`). Only a node centered on the one over it (within
 * the node position tolerance, `stackedOn`): one merely inside a bigger node's box is told hidden or not by a half
 * pixel each side measures alike only by chance (json-cyjs-perf), and moving its ends there would part the sides. An
 * edge between two nodes drawn one over the other keeps its own ends: it is no loop of the node in front.
 * @param scene - the scene, its nodes' `drawn.hiddenBy` set
 * @param drawnIds - the nodes the primitives draw
 * @returns each edge's ends as seen
 */
function shownEnds(
    scene: Scene,
    drawnIds: ReadonlySet<string>,
): (e: { source: string; target: string }) => Pick<PEdge, "source" | "target" | "ownEnds"> {
    const byId = new Map(scene.nodes.map((n) => [n.id, n]));
    const hider = new Map<string, string>();
    for (const n of scene.nodes) {
        const by = n.drawn?.hiddenBy;
        const over = typeof by === "string" ? byId.get(by) : undefined;
        if (over !== undefined && stackedOn([n.x, n.y], over)) {
            hider.set(n.id, over.id);
        }
    }
    const shownAt = (id: string): string => {
        const seen = new Set([id]);
        let at = hider.get(id);
        while (at !== undefined && !drawnIds.has(at) && !seen.has(at)) {
            seen.add(at);
            at = hider.get(at);
        }
        return at !== undefined && drawnIds.has(at) ? at : id;
    };
    return ({ source, target }) => {
        const [s, t] = [shownAt(source), shownAt(target)];
        if ((s === t && source !== target) || (s === source && t === target)) {
            return { source, target };
        }
        return { source: s, target: t, ownEnds: { source, target } };
    };
}

/**
 * graphty's drawing as primitives.
 * @param scene - `extractScene` of the drawing
 * @param drawn - `readDrawn` of the same frame
 * @param options - what to read
 * @param options.groups - false to compare every node as a node: a node drawn over smaller ones is no group box
 * @returns the scene in the primitive model
 */
export function drawnPrimitives(
    scene: Scene,
    drawn: DrawnGraph,
    options: { groups: boolean } = { groups: true },
): PScene {
    const sceneGroups = options.groups ? scene.groups : [];
    const groupIds = new Set(sceneGroups.map((g) => g.id));
    const nodes: PNode[] = [];
    for (const n of scene.nodes) {
        if (!n.visible || groupIds.has(n.id)) {
            continue;
        }
        const d = drawn.nodes.get(n.id);
        const inset = d === undefined ? 0 : 2 * borderInset(d);
        const ownLabel = n.label?.visible === true && d?.label ? textOf(d.label) : null;
        const rule = d?.label?.nodeSizeRule;
        const sized =
            rule !== undefined && d?.label && (n.label?.visible === true || n.drawn?.labelHiddenBySize === true)
                ? { sizedLabel: { label: textOf(d.label), acrossPx: rule.acrossPx, min: rule.min } }
                : {};
        // its further texts (a record's fields) are its label too, as the oracle reads every text in the node's box
        // each drawn on its own line at its own place, so their alignment is read off their boxes, as the oracle's is
        const parts = (d?.texts ?? []).map((t) => ({ ...textOf(t), align: undefined }));
        const label =
            parts.length === 0
                ? ownLabel
                : mergeTexts([...(ownLabel === null || ownLabel.content === "" ? [] : [ownLabel]), ...parts]);
        // a node that draws no body (shape "none", no picture in its place) is its label and its glyph alone, as a
        // program draws a text-only or an icon-only node (vis-network's text and icon shapes): the comparison reads
        // those as free texts, never as a node shape (withoutCaptions)
        const faceless =
            d?.faceless === true
                ? [...(label === null ? [] : [{ ...label, owner: n.id }]), ...glyphTexts(n, d.glyph ?? null)]
                : undefined;
        // A fill under one render pixel is drawn all the same: the comparison judges it at the oracle's scale, where a
        // layout graphty spreads wider than the program's does not shrink it out of sight (`compareOracle`).
        const sub = n.drawn;
        const tiny = n.visible && sub?.subPixel === true && !sub.fillCovered && n.fillOpacity > 0;
        const fill: string | null = n.fill ?? (tiny && typeof sub.fillDrawn === "string" ? sub.fillDrawn : null);
        // an outer ring beside a border of the node's own is judged on its own (`ring`): the node is its fill out to
        // that border, as the oracle reads a ring clear of the outline; a ring with no border is the node's outline
        const outer = d?.outer ?? null;
        const split = outer !== null && (d?.innerBorder ?? null) !== null;
        const own = split ? (d?.innerBorder ?? null) : (d?.border ?? null);
        const gap = split ? 2 * outer.gapPx : 0;
        const borderColor = split ? (own?.color ?? null) : n.border.color;
        const borderWidth = split ? (own?.widthPx ?? 0) : n.border.width;
        // a line waving round the node is as thick as it is drawn, in a ring as wide as the border
        const waved = split ? null : (d?.border?.lineWidthPx ?? null);
        nodes.push({
            id: n.id,
            cx: n.x,
            cy: n.y,
            // the fill, which graphty's border rings from outside (the scene's size takes the inset back)
            w: n.w - inset - gap,
            h: n.h - inset - gap,
            shape: SHAPES[n.shape] ?? "other",
            fill:
                fill === null
                    ? null
                    : {
                          color: fill,
                          opacity: n.fillOpacity,
                          gradient: d?.gradient === true ? gradientOf(d.ramp) : null,
                      },
            stroke:
                borderColor !== null && borderWidth > 0
                    ? {
                          color: borderColor,
                          opacity: own?.opacity ?? 1,
                          width: borderWidth,
                          dash: null,
                          // the style the ring was built in: the scene folds a double border into "other"
                          dashClass: LINE_CLASS[own?.style ?? n.border.style] ?? "other",
                          ...(own?.screen === true ? { screen: true } : {}),
                          ...(waved === null ? {} : { line: waved }),
                      }
                    : null,
            ring:
                split && outer.border.color !== null && outer.border.widthPx > 0
                    ? {
                          color: outer.border.color,
                          opacity: outer.border.opacity,
                          width: outer.border.widthPx,
                          dash: null,
                          dashClass: LINE_CLASS[outer.border.style] ?? "other",
                          reach: outer.gapPx + outer.border.widthPx,
                      }
                    : null,
            label,
            ...sized,
            inset: inset > 0,
            ...(faceless === undefined ? {} : { faceless }),
        });
    }
    const ends = shownEnds(scene, new Set(nodes.map((n) => n.id)));
    const edges = scene.edges.flatMap((e) => {
        const d = drawn.edges.get(e.id);
        if (d === undefined || !d.shown || e.points.length < 2 || e.width <= 0 || e.opacity <= 0) {
            return [];
        }
        // a cap drawn at no opacity or no size draws nothing
        const arrows: PArrow[] = d.caps
            .filter((c) => c.opacity > 0 && c.sizePx > 0)
            .map((c) => drawnArrow(c, d.points));
        // a cap that reaches past the end the edge reports (a circle or an inverted triangle placed by its middle)
        // carries the line on to its tip, as the oracle's line is carried on to its arrowhead's (extendToTip) -- except
        // an open half circle standing off its node (a gap, Cytoscape's OPEN_HALF_CIRCLE): the line stops at the arc's
        // back, where the oracle's reader ends it too (associate.ts, "a small open stroke at an edge's end"), not at
        // the cap's mouth the scene reports. One against its node (vis-network's inv_curve) has the line run on under it.
        let { points } = e;
        for (const c of d.caps) {
            const end = CAP_END[c.end];
            if (end === "middle" || c.outline === null || c.opacity <= 0 || c.sizePx <= 0) {
                continue;
            }
            // an open half circle's mouth faces the node (Cytoscape's OPEN_HALF_CIRCLE); a curve straddles the line's end
            const openArc = c.name.includes("open-half-circle") && (c.gap ?? 0) > 0;
            points = openArc ? backToArc(points, c.outline, end) : extendToTip(points, c.outline, end);
        }
        const gradient = edgeGradientOf(d.gradient, d.points);
        // by the pattern graphty drew (the scene folds a dash-dot, a zigzag and a sine wave into "other"), a dashed or
        // dotted one measured off its drawn elements
        const dashClass = drawnLineClass(
            e.style,
            d.pattern,
            d.dashPx ?? null,
            d.thicknessPx > 0 ? d.thicknessPx : e.width,
        );
        return [
            {
                id: e.id,
                ...ends(e),
                points,
                stroke: {
                    // a line painted in a gradient shows its first stop's color, as the oracle's does
                    color: gradient?.stops[0]?.color ?? e.color,
                    opacity: e.opacity,
                    width: e.width,
                    // a line drawn at its screen floor is that many pixels at any zoom, as a program's floor is
                    ...(d.screenFloored === true ? { screen: true } : {}),
                    // the elements and gaps it drew, where its class was measured off them
                    dash: dashed(e.style, d.pattern, d.dashPx ?? null),
                    dashClass,
                    gradient,
                },
                arrows,
                outline: outlineOf(d.outline),
                // a band over the line, which graphty draws solid
                overlay:
                    d.overlay === null || d.overlay === undefined
                        ? null
                        : { color: d.overlay.color, opacity: d.overlay.opacity, width: d.overlay.width },
                // the texts at its ends belong to it too, as the oracle reads every text beside an edge
                label: mergeTexts(
                    [e.label !== null ? d.label : null, ...d.endLabels]
                        .filter((l): l is DrawnLabel => l !== null && l.enabled && l.fontPx >= 1 && l.text !== "")
                        .map(textOf),
                ),
            },
        ];
    });
    // a group graphty draws no fill and no outline for is no box on the canvas (json-cyjs-tokyo's 204 invisible
    // compound parents); a label it draws for one is free text, as the oracle reads a cluster drawn with no outline
    // (Graphviz's peripheries=0 or penwidth=0): words with no box round them
    const drawnGroups = sceneGroups.map((g) => {
        const n = scene.nodes.find((x) => x.id === g.id);
        const d = drawn.nodes.get(g.id);
        return {
            id: g.id,
            box: { x0: g.bbox.x, y0: g.bbox.y, x1: g.bbox.x + g.bbox.w, y1: g.bbox.y + g.bbox.h },
            fill: g.fill === null ? null : { color: g.fill, opacity: n?.fillOpacity ?? 1, gradient: null },
            stroke:
                n !== undefined && n.border.color !== null && n.border.width > 0
                    ? {
                          color: n.border.color,
                          opacity: d?.border?.opacity ?? 1,
                          width: n.border.width,
                          dash: null,
                          dashClass: LINE_CLASS[d?.border?.style ?? n.border.style] ?? "other",
                      }
                    : null,
            label: g.label !== null && d?.label ? textOf(d.label) : null,
            members: [...g.members].sort(),
        };
    });
    const boxed = (g: (typeof drawnGroups)[number]): boolean =>
        (g.fill !== null && g.fill.opacity > 0) || g.stroke !== null;
    const groups = drawnGroups.filter(boxed);
    return {
        side: "graphty",
        width: drawn.width,
        height: drawn.height,
        background: scene.background ?? null,
        nodes: nodes.sort((a, b) => compareIds(a.id, b.id)),
        edges: edges.sort((a, b) => compareIds(a.id, b.id)),
        groups: groups.sort((a, b) => (a.id < b.id ? -1 : 1)),
        // the labels graphty draws for nodes it draws no body for (a label-only node), which no node carries here
        texts: [
            ...scene.nodes.flatMap((n) => {
                const d = drawn.nodes.get(n.id);
                return !n.visible && !groupIds.has(n.id) && n.label?.visible === true && d?.label
                    ? [{ ...textOf(d.label), owner: n.id }]
                    : [];
            }),
            ...drawnGroups.flatMap((g) => (!boxed(g) && g.label !== null ? [g.label] : [])),
        ],
        strays: [
            ...(scene.annotations ?? []).map((a) => ({
                tag: `annotation-${a.kind}`,
                kind: a.kind === "text" ? ("text" as const) : ("shape" as const),
                box: { x0: a.bbox.x, y0: a.bbox.y, x1: a.bbox.x + a.bbox.w, y1: a.bbox.y + a.bbox.h },
                fill: null,
                stroke: null,
                text: a.text ?? null,
            })),
            ...linelessCaps(scene, drawn),
        ].map((s, index) => ({ index, ...s })),
    };
}
