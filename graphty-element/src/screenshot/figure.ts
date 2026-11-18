/**
 * @file A vector figure of the graph as it is drawn now (issue #819): every visible node as a
 * filled shape where the canvas draws it, every visible edge as a line, every shown label as
 * text, and the key a screenshot draws, as an SVG or a PDF document. It reads the picture the last frame
 * drew -- the same screen positions `nodeScreenPosition` reports -- so the figure lines up with a
 * screenshot taken at the same moment.
 */

import { Camera } from "@babylonjs/core/Cameras/camera.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh.js";
import type { Mesh } from "@babylonjs/core/Meshes/mesh.js";

import type { EdgeStyleConfig } from "../config/EdgeStyle";
import type { Edge, EdgeCapEnd } from "../Edge";
import type { DrawnNodeSpot, Graph, NodeScreenPosition } from "../Graph";
import { dataManagerInternals } from "../managers/DataManager";
import type { ArrowCap } from "../meshes/ArrowCapBatch";
import type { RichTextLabel } from "../meshes/RichTextLabel";
import { pixelsPerUnit } from "../meshes/screenSize";
import { convexHull, flatShapeOutline, isFlatShape, type Point2 } from "../meshes/shapeOutlines";
import { type Node, nodeInternals } from "../Node";
import { toColorValue } from "../session/styles/channels";
import { downloadBlob } from "../utils/download";
import { captureError } from "./captureError";
import { LEGEND_METRICS, legendSections, legendSize } from "./drawLegend";
import { figurePdf } from "./figurePdf";
import type { ScreenshotLegendPosition, ScreenshotLegendSection, ScreenshotOptions } from "./types";

/** What {@link Graphty.exportFigure} draws and where it goes. */
export interface FigureOptions {
    /** The file format: `"svg"`, or `"pdf"` for a one-page PDF the canvas's size. @default "svg" */
    format?: "svg" | "pdf";
    /** The key drawn into the figure, exactly as `ScreenshotOptions.legend` takes it. Absent, no key. */
    legend?: ScreenshotOptions["legend"];
    /** Leave the canvas background out, so the figure has no backdrop. @default false */
    transparentBackground?: boolean;
    /** Also hand the file to the reader as a download. @default false */
    download?: boolean;
    /** The download's file name. @default "graph.svg", or "graph.pdf" for a PDF */
    downloadFilename?: string;
}

/** A figure {@link Graphty.exportFigure} made. */
export interface FigureResult {
    /** The file: `image/svg+xml`, or `application/pdf` for a PDF. */
    blob: Blob;
    /** Its width in CSS pixels, the canvas's. */
    width: number;
    /** Its height in CSS pixels, the canvas's. */
    height: number;
    /** Whether a download was started. */
    downloaded: boolean;
}

/** A triangle on screen. */
type Triangle = readonly [Point2, Point2, Point2];

/**
 * One filled shape in screen pixels: a node as a circle or a closed outline, or a mesh the canvas
 * draws (an arrow cap, a node's border) as its triangles, all wound one way so they fill as one
 * shape and a ring keeps its hole.
 */
export type FigureShape = (
    { circle: { x: number; y: number; r: number } } | { points: readonly Point2[] } | { triangles: readonly Triangle[] }
) & {
    fill: string;
    opacity: number;
};

/** One label's lines of text, centred on its point, over its panel when it has a solid one. */
export interface FigureText {
    x: number;
    y: number;
    lines: readonly string[];
    size: number;
    font: string;
    weight: string;
    style: string;
    color: string;
    /** The panel drawn behind the words, in screen pixels. */
    background?: { x: number; y: number; w: number; h: number; radius: number; fill: string; opacity: number };
}

/** One mark of the key: a box, a color ramp, a filled outline or a line of text centred on its `y`. */
export type FigureMark =
    | {
          rect: { x: number; y: number; w: number; h: number; radius?: number };
          fill: string;
          opacity?: number;
          stroke?: string;
      }
    | { ramp: { x: number; y: number; w: number; h: number }; colors: readonly string[] }
    | { polygon: readonly Point2[]; fill: string }
    | { text: string; x: number; y: number; anchor: "start" | "end"; color: string; weight?: string };

/** Everything one figure draws, in screen pixels: what {@link figureSvg} and `figurePdf` write out. */
export interface FigureDrawing {
    width: number;
    height: number;
    background?: string;
    edges: readonly { x1: number; y1: number; x2: number; y2: number; color: string; opacity: number; width: number }[];
    /** The arrow caps, drawn over the nodes, as the canvas draws a cap over its node's border. */
    caps: readonly FigureShape[];
    /** The nodes, far first, each followed by its border and outer border. */
    nodes: readonly FigureShape[];
    texts: readonly FigureText[];
    legend?: {
        sections: readonly ScreenshotLegendSection[];
        position: ScreenshotLegendPosition;
        /** The card's inner width and its height, as `legendSize` measures them. */
        inner: number;
        height: number;
    };
}

const LEGEND_FONT = "system-ui, sans-serif";
/** The key's text color, and its quieter one for values and notes. */
const INK = "#1a1a1a";
const FAINT = "#666666";

/**
 * Text made safe inside an SVG element or attribute.
 * @param text - Any text.
 * @returns It, escaped.
 */
function esc(text: string): string {
    return text.replaceAll(/[&<>"']/g, (c) => `&#${String(c.codePointAt(0))};`);
}

/**
 * An opacity attribute, or nothing at full strength.
 * @param name - The attribute.
 * @param opacity - The opacity.
 * @returns ` name="value"`, or an empty string.
 */
function opacityAttr(name: string, opacity: number): string {
    return opacity < 1 ? ` ${name}="${num(opacity)}"` : "";
}

/**
 * Points as a polygon's `points` attribute takes them.
 * @param points - The points.
 * @returns `x,y x,y ...`.
 */
function pointList(points: readonly Point2[]): string {
    return points.map(([x, y]) => `${num(x)},${num(y)}`).join(" ");
}

/**
 * A number short enough for a file, exact enough for a figure.
 * @param n - The number.
 * @returns Two decimals at most.
 */
function num(n: number): string {
    return String(Math.round(n * 100) / 100);
}

/**
 * A box as SVG takes it: a rectangle, rounded when it has a radius.
 * @param box - The box.
 * @param box.x - Its left.
 * @param box.y - Its top.
 * @param box.w - Its width.
 * @param box.h - Its height.
 * @param box.radius - Its corner radius.
 * @param paint - The rest of its attributes.
 * @returns The element.
 */
function rectSvg(box: { x: number; y: number; w: number; h: number; radius?: number }, paint: string): string {
    const rx = box.radius === undefined || box.radius <= 0 ? "" : ` rx="${num(box.radius)}"`;
    return `<rect x="${num(box.x)}" y="${num(box.y)}" width="${num(box.w)}" height="${num(box.h)}"${rx} ${paint}/>`;
}

/**
 * One mark of the key as SVG.
 * @param mark - The mark.
 * @param index - Its place in the key, naming a ramp's gradient.
 * @returns The element.
 */
function markSvg(mark: FigureMark, index: number): string {
    if ("rect" in mark) {
        const stroke = mark.stroke === undefined ? "" : ` stroke="${esc(mark.stroke)}"`;
        return rectSvg(mark.rect, `fill="${esc(mark.fill)}"${opacityAttr("fill-opacity", mark.opacity ?? 1)}${stroke}`);
    }
    if ("ramp" in mark) {
        const id = `graphty-ramp-${String(index)}`;
        const last = Math.max(mark.colors.length - 1, 1);
        const stops = mark.colors.map((c, i) => `<stop offset="${num(i / last)}" stop-color="${esc(c)}"/>`).join("");
        const fill = `fill="url(#${id})"`;
        return `<defs><linearGradient id="${id}">${stops}</linearGradient></defs>${rectSvg(mark.ramp, fill)}`;
    }
    if ("polygon" in mark) {
        return `<polygon points="${pointList(mark.polygon)}" fill="${esc(mark.fill)}"/>`;
    }
    const anchor = mark.anchor === "end" ? ` text-anchor="end"` : "";
    const weight = mark.weight === undefined ? "" : ` font-weight="${esc(mark.weight)}"`;
    return `<text x="${num(mark.x)}" y="${num(mark.y)}"${anchor}${weight} fill="${esc(mark.color)}">${esc(mark.text)}</text>`;
}

/**
 * A filled shape as SVG.
 * @param shape - The shape.
 * @returns The element.
 */
function shapeSvg(shape: FigureShape): string {
    const paint = `fill="${esc(shape.fill)}"${opacityAttr("fill-opacity", shape.opacity)}`;
    if ("circle" in shape) {
        return `<circle cx="${num(shape.circle.x)}" cy="${num(shape.circle.y)}" r="${num(shape.circle.r)}" ${paint}/>`;
    }
    if ("points" in shape) {
        return `<polygon points="${pointList(shape.points)}" ${paint}/>`;
    }
    const d = shape.triangles.map(([a, b, c]) => `M${corner(a)}L${corner(b)}L${corner(c)}Z`).join("");
    return `<path d="${d}" ${paint}/>`;
}

/**
 * A point as a path takes it.
 * @param point - The point.
 * @returns `x y`.
 */
function corner(point: Point2): string {
    return `${num(point[0])} ${num(point[1])}`;
}

/**
 * The SVG document for a drawing: background, edges, nodes, arrow caps, labels, then the key on top.
 * @param drawing - What to draw.
 * @param key - The key's marks.
 * @returns The document.
 */
function figureSvg(drawing: FigureDrawing, key: readonly FigureMark[]): string {
    const out: string[] = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${num(drawing.width)}" height="${num(drawing.height)}" ` +
            `viewBox="0 0 ${num(drawing.width)} ${num(drawing.height)}">`,
    ];
    if (drawing.background !== undefined) {
        out.push(`<rect width="100%" height="100%" fill="${esc(drawing.background)}"/>`);
    }
    out.push(`<g stroke-linecap="round">`);
    for (const e of drawing.edges) {
        out.push(
            `<line x1="${num(e.x1)}" y1="${num(e.y1)}" x2="${num(e.x2)}" y2="${num(e.y2)}" stroke="${esc(e.color)}" ` +
                `stroke-width="${num(e.width)}"${opacityAttr("stroke-opacity", e.opacity)}/>`,
        );
    }
    out.push(
        `</g><g>`,
        ...drawing.nodes.map((n) => shapeSvg(n)),
        `</g><g>`,
        ...drawing.caps.map((c) => shapeSvg(c)),
        `</g><g text-anchor="middle" dominant-baseline="central">`,
    );
    for (const t of drawing.texts) {
        if (t.background !== undefined) {
            const bg = t.background;
            out.push(rectSvg(bg, `fill="${esc(bg.fill)}"${opacityAttr("fill-opacity", bg.opacity)}`));
        }
        const first = t.y - ((t.lines.length - 1) * t.size * 1.2) / 2;
        const spans = t.lines
            .map((line, i) => `<tspan x="${num(t.x)}" y="${num(first + i * t.size * 1.2)}">${esc(line)}</tspan>`)
            .join("");
        out.push(
            `<text font-family="${esc(t.font)}" font-size="${num(t.size)}" font-weight="${esc(t.weight)}" ` +
                `font-style="${esc(t.style)}" fill="${esc(t.color)}">${spans}</text>`,
        );
    }
    out.push(`</g>`);
    if (key.length > 0) {
        out.push(
            `<g font-family="${LEGEND_FONT}" font-size="${String(LEGEND_METRICS.FONT_SIZE)}" dominant-baseline="central">`,
            ...key.map((mark, i) => markSvg(mark, i)),
            `</g>`,
        );
    }
    out.push(`</svg>`);
    return out.join("\n");
}

/**
 * The key as marks, laid out as `drawLegend` lays it out on a screenshot: a light card in its
 * corner holding each section's title, rows, ramp and note. Both file formats draw these.
 * @param legend - The key and its measured size, or nothing for no key.
 * @param width - The figure's width.
 * @param height - The figure's height.
 * @returns The marks, in drawing order.
 */
function legendMarks(legend: FigureDrawing["legend"], width: number, height: number): FigureMark[] {
    if (legend === undefined || legend.sections.length === 0) {
        return [];
    }
    const { PAD, LINE, GAP, RAMP_HEIGHT } = LEGEND_METRICS;
    const cardWidth = legend.inner + PAD * 2;
    const cardLeft = legend.position.endsWith("left") ? PAD : width - PAD - cardWidth;
    const cardTop = legend.position.startsWith("top") ? PAD : height - PAD - legend.height;
    const left = cardLeft + PAD;
    const right = left + legend.inner;
    const marks: FigureMark[] = [
        {
            rect: { x: cardLeft, y: cardTop, w: cardWidth, h: legend.height, radius: 4 },
            fill: "#ffffff",
            opacity: 0.92,
            stroke: "#d0d0d0",
        },
    ];
    let y = cardTop + PAD;
    for (const section of legend.sections) {
        marks.push({ text: section.title, x: left, y: y + LINE / 2, anchor: "start", color: INK, weight: "600" });
        y = rowMarks(section.rows ?? [], left, right, y + LINE, marks);
        if (section.ramp) {
            const colors = section.ramp.colors ?? [];
            if (colors.length > 0) {
                marks.push({ ramp: { x: left, y, w: right - left, h: RAMP_HEIGHT }, colors });
            } else {
                // A size wedge: thin at the low end, full height at the high end.
                const wedge: Point2[] = [
                    [left, y + RAMP_HEIGHT],
                    [right, y],
                    [right, y + RAMP_HEIGHT],
                ];
                marks.push({ polygon: wedge, fill: "#888888" });
            }
            const mid = y + RAMP_HEIGHT + GAP + LINE / 2;
            marks.push(
                { text: section.ramp.min, x: left, y: mid, anchor: "start", color: INK },
                { text: section.ramp.max, x: right, y: mid, anchor: "end", color: INK },
            );
            y += RAMP_HEIGHT + GAP + LINE;
        }
        if (section.note !== undefined) {
            marks.push({ text: section.note, x: left, y: y + LINE / 2, anchor: "start", color: FAINT });
            y += LINE;
        }
        y += GAP;
    }
    return marks;
}

/**
 * A key section's rows: each one's chip, label and value.
 * @param rows - The rows.
 * @param left - The card's inner left.
 * @param right - The card's inner right.
 * @param top - Where the first row starts.
 * @param marks - The key's marks so far, added to.
 * @returns Where the next thing starts.
 */
function rowMarks(
    rows: NonNullable<ScreenshotLegendSection["rows"]>,
    left: number,
    right: number,
    top: number,
    marks: FigureMark[],
): number {
    const { LINE, GAP, CHIP } = LEGEND_METRICS;
    let y = top;
    for (const row of rows) {
        let x = left;
        const mid = y + LINE / 2;
        if (row.color !== undefined) {
            marks.push({ rect: { x, y: mid - CHIP / 2, w: CHIP, h: CHIP }, fill: row.color });
            x += CHIP + GAP;
        }
        marks.push({ text: row.label, x, y: mid, anchor: "start", color: INK });
        if (row.value !== undefined) {
            marks.push({ text: row.value, x: right, y: mid, anchor: "end", color: FAINT });
        }
        y += LINE;
    }
    return y;
}

/**
 * A color as SVG takes it.
 * @param c - Channels 0-255 and alpha 0-1.
 * @param c.r - Red.
 * @param c.g - Green.
 * @param c.b - Blue.
 * @returns `rgb(r,g,b)`.
 */
function rgb(c: { r: number; g: number; b: number }): string {
    return `rgb(${String(Math.round(c.r))},${String(Math.round(c.g))},${String(Math.round(c.b))})`;
}

/**
 * The settled legend option: the caller's sections, or the element's own legend, and its corner.
 * The same rules a screenshot follows.
 * @param graph - The graph.
 * @param legend - The option.
 * @returns The sections (none for no key) and their corner.
 */
function resolveLegend(
    graph: Graph,
    legend: FigureOptions["legend"],
): { sections: readonly ScreenshotLegendSection[]; position: ScreenshotLegendPosition } {
    if (legend === undefined || legend === false) {
        return { sections: [], position: "top-left" };
    }
    if (typeof legend === "object" && "length" in legend) {
        return { sections: legend, position: "top-left" };
    }
    const options = typeof legend === "object" ? legend : {};
    const bound = legendSections(graph.getSession().styles.legend());
    const sections =
        legend === "auto" && bound.length === 0
            ? []
            : [...(options.title === undefined ? [] : [{ title: options.title }]), ...bound];
    return { sections, position: options.position ?? "bottom-right" };
}

/**
 * A label as text where it is drawn, or nothing when it is not shown.
 * @param label - The label.
 * @param graph - The graph.
 * @param camera - The camera.
 * @param css - CSS pixels per render pixel.
 * @returns The text, or undefined.
 */
function labelText(
    label: RichTextLabel | null | undefined,
    graph: Graph,
    camera: Camera,
    css: number,
): FigureText | undefined {
    const mesh = label?.labelMesh;
    if (!label || !mesh || !mesh.isEnabled() || !mesh.isVisible || mesh.visibility <= 0) {
        return undefined;
    }
    const lines = label.textRuns.map((runs) => runs.map((run) => run.text).join(""));
    const first = label.textRuns[0]?.[0]?.style;
    const size = label.screenFontPx(camera) * css;
    if (first === undefined || size <= 0 || lines.every((line) => line === "")) {
        return undefined;
    }
    const at = graph.worldToScreen(mesh.getAbsolutePosition());
    const background = labelPanel(label, mesh, graph);
    return {
        ...at,
        lines,
        size,
        font: first.font,
        weight: first.weight,
        style: first.style,
        color: first.color,
        ...(background === undefined ? {} : { background }),
    };
}

/**
 * A label's solid panel where it is drawn: its plane's box on screen, cut to the panel's share of it.
 * @param label - The label.
 * @param mesh - Its plane.
 * @param graph - The graph.
 * @returns The panel, or undefined when the label has no solid one.
 */
function labelPanel(label: RichTextLabel, mesh: Mesh, graph: Graph): FigureText["background"] {
    const { panel } = label;
    const color = panel === undefined ? null : toColorValue(panel.color);
    if (panel === undefined || color === null || color.a <= 0) {
        return undefined;
    }
    const corners = mesh.getBoundingInfo().boundingBox.vectorsWorld.map((c) => graph.worldToScreen(c));
    const xs = corners.map((c) => c.x);
    const ys = corners.map((c) => c.y);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const w = Math.max(...xs) - left;
    const h = Math.max(...ys) - top;
    // ponytail: a pointer, a border or a gradient panel is drawn as its solid box only.
    return {
        x: left + panel.left * w,
        y: top + panel.top * h,
        w: (panel.right - panel.left) * w,
        h: (panel.bottom - panel.top) * h,
        radius: panel.radius * w,
        fill: rgb(color),
        opacity: color.a,
    };
}

/**
 * A node's outline on screen: a circle for a round shape, a flat shape fitted to its projected
 * box, or the hull of a solid's box corners as the camera sees them (exact for a box).
 * @param graph - The graph.
 * @param spot - Where the node is drawn, from its `Node` or its row.
 * @returns The outline, unpainted.
 */
function nodeOutline(
    graph: Graph,
    spot: DrawnNodeSpot,
): { circle: { x: number; y: number; r: number } } | { points: readonly Point2[] } {
    const { at, node, column } = spot;
    if ((node?.roundRadius ?? column?.roundRadius ?? null) !== null) {
        return { circle: { x: at.x, y: at.y, r: at.radius } };
    }
    const type = node?.shapeType ?? column?.paint.style.shape?.type ?? "";
    if (isFlatShape(type)) {
        // ponytail: fitted to the projected box, so a flat shape turned away from the camera is drawn facing it.
        const { left, right, top, bottom } = at.bounds;
        const outline = flatShapeOutline(type, right - left, bottom - top);
        return { points: outline.map(([x, y]): Point2 => [at.x + x, at.y - y]) };
    }
    const corners = spot.corners.map((c): Point2 => {
        const p = graph.worldToScreen(c);
        return [p.x, p.y];
    });
    return { points: convexHull(corners) };
}

/**
 * How wide a line is drawn on screen, by the line renderers' rules: world units of `width / 40`
 * in 2D, `width * 20` screen units over the clip w in 3D (CustomLineRenderer's vertex shader).
 * @param width - The style's `line.width`.
 * @param mid - The line's middle, in the world.
 * @param camera - The camera.
 * @param is2D - Whether the view is flat.
 * @param css - CSS pixels per render pixel.
 * @returns The width in CSS pixels.
 */
function lineWidthPx(width: number, mid: Vector3, camera: Camera, is2D: boolean, css: number): number {
    if (is2D) {
        return (width / 40) * pixelsPerUnit(camera, mid) * css;
    }
    const clipW =
        camera.mode === Camera.ORTHOGRAPHIC_CAMERA ? 1 : Vector3.TransformCoordinates(mid, camera.getViewMatrix()).z;
    return (width * 10) / Math.max(clipW, 1e-6);
}

/** A visible node as the figure reads it: where it is on screen, and its centre in the world. */
interface ShownNode {
    readonly at: NodeScreenPosition;
    readonly centre: Vector3;
}

/** One edge to draw: its ends' rows, its paint's style and, for an `Edge`, the `Edge` (its label and caps). */
interface FigureEdge {
    readonly source: number;
    readonly target: number;
    readonly style: EdgeStyleConfig | undefined;
    readonly edge: Edge | undefined;
}

/**
 * Every edge drawn now, building no `Edge` or `Node`: each `Edge` built, then on the `"batched"`
 * path each row line drawn with no `Edge`, in row order -- the order `getEdges()` lists them.
 * @param graph - The graph.
 * @yields Each visible edge.
 */
function* drawnEdges(graph: Graph): Generator<FigureEdge> {
    const painter = graph.getStylePainter();
    const data = graph.getDataManager();
    for (const edge of dataManagerInternals.builtEdges(data).values()) {
        if (edge.isRenderVisible()) {
            // By id, not `srcNode`: an `Edge` builds the `Node` of an end it is asked for.
            const source = dataManagerInternals.rowOf(data, edge.srcId);
            const target = dataManagerInternals.rowOf(data, edge.dstId);
            yield { source, target, style: painter.edgePaint(edge.index)?.style, edge };
        }
    }

    const lines = graph.getEdgeRowLines();
    for (const row of lines?.rows() ?? []) {
        const ends = lines?.endsOf(row);
        if (ends !== undefined && !(lines?.isHidden(row) ?? true)) {
            yield { source: ends[0], target: ends[1], style: painter.edgePaint(row)?.style, edge: undefined };
        }
    }
}

/**
 * Every visible edge as a straight line between its ends' centres, its label added to `texts` and
 * its arrow caps to `caps`.
 * @param graph - The graph.
 * @param shown - Where each visible node is drawn, by row.
 * @param camera - The camera.
 * @param css - CSS pixels per render pixel.
 * @param texts - The labels drawn so far, added to.
 * @param caps - The caps drawn so far, added to.
 * @returns The lines.
 */
function edgeLines(
    graph: Graph,
    shown: ReadonlyMap<number, ShownNode>,
    camera: Camera,
    css: number,
    texts: FigureText[],
    caps: FigureShape[],
): FigureDrawing["edges"][number][] {
    const is2D = graph.getViewMode() === "2d";
    const edges: FigureDrawing["edges"][number][] = [];
    for (const { source, target, style, edge } of drawnEdges(graph)) {
        const src = shown.get(source);
        const dst = shown.get(target);
        if (!src || !dst || !style) {
            continue;
        }
        const line = style.line ?? {};
        const mid = Vector3.Center(src.centre, dst.centre);
        const px = Math.max(lineWidthPx(line.width ?? 0.25, mid, camera, is2D, css), line.minScreenWidth ?? 0);
        if (px <= 0) {
            continue;
        }
        edges.push({
            x1: src.at.x,
            y1: src.at.y,
            x2: dst.at.x,
            y2: dst.at.y,
            color: typeof line.color === "string" ? line.color : "#a9a9a9",
            opacity: line.opacity ?? 1,
            width: px,
        });
        if (edge) {
            caps.push(...edgeCaps(graph, edge, style, camera));
        }
        const words = labelText(edge?.label, graph, camera, css);
        if (words) {
            texts.push(words);
        }
    }

    return edges;
}

/**
 * An edge's arrow caps as the canvas draws them: each cap's own triangles, placed as its batch's
 * shader or its slot's matrix places them, then projected. Heads, tails, middle caps and stacks.
 * @param graph - The graph.
 * @param edge - The edge.
 * @param style - Its style, for each cap's colour and an open cap's inside colour.
 * @param camera - The camera.
 * @returns The caps, each its inside (when it has a fill) before its frame.
 */
function edgeCaps(graph: Graph, edge: Edge, style: EdgeStyleConfig, camera: Camera): FigureShape[] {
    const caps: [EdgeCapEnd, ArrowCap | null][] = [
        ["arrowHead", edge.arrowCap],
        ...edge.arrowHeadStackCaps.map((cap): [EdgeCapEnd, ArrowCap] => ["arrowHead", cap]),
        ["arrowTail", edge.arrowTailCap],
        ...edge.arrowTailStackCaps.map((cap): [EdgeCapEnd, ArrowCap] => ["arrowTail", cap]),
        ["arrowMiddleHead", edge.arrowMiddleHeadCap],
        ["arrowMiddleTail", edge.arrowMiddleTailCap],
    ];
    return caps.flatMap(([end, cap]) => (cap === null ? [] : capShapes(graph, cap, style, end, camera)));
}

/**
 * One cap's shapes: its inside when it has a fill, then its frame or whole shape.
 * @param graph - The graph.
 * @param cap - The cap.
 * @param style - Its edge's style.
 * @param end - Which of the edge's caps it is drawn for: a stacked cap is its end's.
 * @param camera - The camera.
 * @returns The shapes, none for a hidden cap.
 */
function capShapes(
    graph: Graph,
    cap: ArrowCap,
    style: EdgeStyleConfig,
    end: EdgeCapEnd,
    camera: Camera,
): FigureShape[] {
    const opacity = cap.visibility;
    const mesh = cap.batchMesh;
    // ponytail: an image cap is a picture, which a figure leaves out.
    if (cap.isDisposed() || opacity <= 0 || mesh === null || cap.name === "arrow-2d-image") {
        return [];
    }
    const triangles = capTriangles(graph, cap, mesh, camera);
    const arrow = style[end];
    const color = arrow?.color ?? style.line?.color;
    const out: FigureShape[] = [];
    // An open cap with a fill has its inside's triangles first (FilledArrowRenderer.splitInside).
    const inside = mesh.subMeshes.length > 1 ? ((mesh.metadata as { capFill?: number } | null)?.capFill ?? 0) / 3 : 0;
    if (inside > 0 && typeof arrow?.fillColor === "string") {
        out.push({ triangles: triangles.slice(0, inside), fill: arrow.fillColor, opacity });
    }
    if (triangles.length > inside) {
        out.push({ triangles: triangles.slice(inside), fill: typeof color === "string" ? color : "#FFFFFF", opacity });
    }
    return out;
}

/**
 * One cap's triangles on screen, in its mesh's index order.
 * @param graph - The graph.
 * @param cap - The cap.
 * @param mesh - Its batch's mesh: its shape at scale 1, tip at the origin, pointing along +X.
 * @param camera - The camera.
 * @returns The triangles; none when the cap is hidden.
 */
function capTriangles(graph: Graph, cap: ArrowCap, mesh: Mesh, camera: Camera): Triangle[] {
    const slot = cap.transform;
    if (slot.m[15] === 0) {
        return [];
    }
    const world = slot.multiply(mesh.getWorldMatrix());
    const look = cap.drawnAppearance;
    let place: (x: number, y: number, z: number) => Vector3;
    if (look === null) {
        // A 2D cap or the 3D sphere-dot: its geometry under its slot's matrix.
        place = (x, y, z) => Vector3.TransformCoordinates(new Vector3(x, y, z), world);
    } else {
        // The billboard shader's frame (FilledArrowRenderer, filledArrowVertexShader): along the
        // line, across it facing the camera, at the cap's length.
        const centre = world.getTranslation();
        const forward = look.direction.normalizeToNew();
        let right = Vector3.Cross(forward, camera.globalPosition.subtract(centre).normalize());
        if (right.lengthSquared() < 1e-12) {
            right = Vector3.Cross(forward, Math.abs(forward.y) < 0.99 ? Vector3.Up() : Vector3.Right());
        }
        right.normalize();
        const up = Vector3.Cross(right, forward);
        place = (x, y, z) =>
            centre.add(forward.scale(x).addInPlace(up.scale(y)).addInPlace(right.scale(z)).scaleInPlace(look.size));
    }
    return meshTriangles(graph, mesh, place);
}

/**
 * A mesh's triangles on screen, each wound the same way, in its index order.
 * @param graph - The graph.
 * @param mesh - The mesh whose geometry is drawn.
 * @param place - Where a vertex of it is in the world.
 * @returns The triangles.
 */
function meshTriangles(graph: Graph, mesh: Mesh, place: (x: number, y: number, z: number) => Vector3): Triangle[] {
    const positions = mesh.getVerticesData("position");
    const indices = mesh.getIndices();
    if (!positions || !indices) {
        return [];
    }
    const screen: Point2[] = [];
    for (let i = 0; i < positions.length; i += 3) {
        const p = graph.worldToScreen(place(positions[i], positions[i + 1], positions[i + 2]));
        screen.push([p.x, p.y]);
    }
    const triangles: Triangle[] = [];
    for (let i = 0; i + 2 < indices.length; i += 3) {
        const a = screen[indices[i]];
        const b = screen[indices[i + 1]];
        const c = screen[indices[i + 2]];
        const turn = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        // One winding for all, so a cap's triangles fill as one shape and an open cap keeps its hole.
        triangles.push(turn < 0 ? [a, c, b] : [a, b, c]);
    }
    return triangles;
}

/**
 * A node's border and outer border as the canvas draws them: each ring's triangles, placed by its
 * instance (turned to the camera for a solid in 3D), in its material's color.
 * @param graph - The graph.
 * @param node - The node, or null for a row drawn with no `Node`, which draws no border.
 * @returns The rings, border first.
 */
function nodeRings(graph: Graph, node: Node | null): FigureShape[] {
    if (node === null) {
        return [];
    }
    const { border, outerBorder } = nodeInternals.drawn(node);
    const out: FigureShape[] = [];
    for (const ring of [border, outerBorder]) {
        const material = ring?.material;
        if (
            !(ring instanceof InstancedMesh) ||
            !ring.isEnabled() ||
            !ring.isVisible ||
            !(material instanceof StandardMaterial) ||
            material.alpha <= 0
        ) {
            continue;
        }
        const world = ring.computeWorldMatrix(true);
        const place = (x: number, y: number, z: number): Vector3 =>
            Vector3.TransformCoordinates(new Vector3(x, y, z), world);
        const triangles = meshTriangles(graph, ring.sourceMesh, place);
        const c = material.emissiveColor;
        out.push({ triangles, fill: rgb({ r: c.r * 255, g: c.g * 255, b: c.b * 255 }), opacity: material.alpha });
    }
    return out;
}

/**
 * Reads the picture the last frame drew into a {@link FigureDrawing}.
 * @param graph - The graph.
 * @param options - The figure's options.
 * @returns The drawing.
 */
function figureDrawing(graph: Graph, options: FigureOptions = {}): FigureDrawing {
    const { scene } = graph;
    const camera = scene.activeCamera;
    if (!camera) {
        throw captureError("E_CAPTURE_FAILED", "No active camera in scene", { media: "figure" });
    }
    const engine = scene.getEngine();
    const css = engine.getHardwareScalingLevel();
    const width = engine.getRenderWidth() * css;
    const height = engine.getRenderHeight() * css;
    const view = scene.getViewMatrix();
    const painter = graph.getStylePainter();
    const depthOf = (p: Vector3): number => Vector3.TransformCoordinates(p, view).z;

    const shown = new Map<number, ShownNode>();
    const nodes: { depth: number; shape: FigureShape }[] = [];
    const texts: FigureText[] = [];
    const batches = graph.getNodeBatches();
    // Read off the row tables, so a row drawn with no `Node` gets none built for it (#8204).
    for (const spot of graph.drawnNodeSpots()) {
        const { at, node, column, row } = spot;
        if (!at.visible) {
            continue;
        }
        shown.set(row, { at, centre: spot.centre });
        const color = (node ?? column)?.drawnInstanceColor ??
            painter.nodePaint(row)?.color ?? { r: 255, g: 255, b: 255, a: 1 };
        const opacity = node?.drawnOpacity ?? (column === null ? 1 : (batches?.columnOpacityOf(column) ?? 1));
        const paint = { fill: rgb(color), opacity: color.a * opacity };
        const depth = depthOf(spot.centre);
        nodes.push({ depth, shape: { ...nodeOutline(graph, spot), ...paint } });
        for (const ring of nodeRings(graph, node)) {
            nodes.push({ depth, shape: ring });
        }
        const words = node === null ? undefined : labelText(node.label, graph, camera, css);
        if (words) {
            texts.push(words);
        }
    }
    // Far first, so a nearer node covers a farther one as it does on the canvas; a stable sort,
    // so a node's rings stay over it.
    nodes.sort((a, b) => b.depth - a.depth);

    const caps: FigureShape[] = [];
    const edges = edgeLines(graph, shown, camera, css, texts, caps);

    const { sections, position } = resolveLegend(graph, options.legend);
    const bg = scene.clearColor;
    return {
        width,
        height,
        ...(options.transparentBackground === true || bg.a === 0
            ? {}
            : { background: rgb({ r: bg.r * 255, g: bg.g * 255, b: bg.b * 255 }) }),
        edges,
        caps,
        nodes: nodes.map((n) => n.shape),
        texts,
        ...(sections.length > 0 ? { legend: { sections, position, ...legendSize(sections) } } : {}),
    };
}

/**
 * Draws the graph as it is on the canvas now into a vector figure.
 * @param graph - The graph, its picture final.
 * @param options - What to draw and where it goes.
 * @returns The figure.
 */
export function exportFigure(graph: Graph, options: FigureOptions = {}): FigureResult {
    const format = options.format ?? "svg";
    if (format !== "svg" && format !== "pdf") {
        throw captureError("E_BAD_COMMAND", "Unknown figure format", { field: "format", value: String(format) });
    }
    const drawing = figureDrawing(graph, options);
    const key = legendMarks(drawing.legend, drawing.width, drawing.height);
    const blob =
        format === "pdf"
            ? new Blob([figurePdf(drawing, key)], { type: "application/pdf" })
            : new Blob([figureSvg(drawing, key)], { type: "image/svg+xml" });
    const download = options.download === true;
    if (download) {
        downloadBlob(blob, options.downloadFilename ?? `graph.${format}`);
    }
    return { blob, width: drawing.width, height: drawing.height, downloaded: download };
}
