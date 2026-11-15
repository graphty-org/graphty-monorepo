/**
 * @file A vector figure of the graph as it is drawn now (issue #819): every visible node as a
 * filled shape where the canvas draws it, every visible edge as a line, every shown label as
 * text, and the key a screenshot draws, as an SVG document. It reads the picture the last frame
 * drew -- the same screen positions `nodeScreenPosition` reports -- so the figure lines up with a
 * screenshot taken at the same moment.
 */

import { Camera } from "@babylonjs/core/Cameras/camera.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";

import type { Graph } from "../Graph";
import type { RichTextLabel } from "../meshes/RichTextLabel";
import { pixelsPerUnit } from "../meshes/screenSize";
import { convexHull, flatShapeOutline, isFlatShape, type Point2 } from "../meshes/shapeOutlines";
import { downloadBlob } from "../utils/download";
import { captureError } from "./captureError";
import { LEGEND_METRICS, legendSections, legendSize } from "./drawLegend";
import type { ScreenshotLegendPosition, ScreenshotLegendSection, ScreenshotOptions } from "./types";

/** What {@link Graphty.exportFigure} draws and where it goes. */
export interface FigureOptions {
    /** The file format. Only `"svg"` today. @default "svg" */
    format?: "svg";
    /** The key drawn into the figure, exactly as `ScreenshotOptions.legend` takes it. Absent, no key. */
    legend?: ScreenshotOptions["legend"];
    /** Leave the canvas background out, so the figure has no backdrop. @default false */
    transparentBackground?: boolean;
    /** Also hand the file to the reader as a download. @default false */
    download?: boolean;
    /** The download's file name. @default "graph.svg" */
    downloadFilename?: string;
}

/** A figure {@link Graphty.exportFigure} made. */
export interface FigureResult {
    /** The file, `image/svg+xml`. */
    blob: Blob;
    /** Its width in CSS pixels, the canvas's. */
    width: number;
    /** Its height in CSS pixels, the canvas's. */
    height: number;
    /** Whether a download was started. */
    downloaded: boolean;
}

/** One node, as a circle or a closed outline, in screen pixels. */
type FigureShape = ({ circle: { x: number; y: number; r: number } } | { points: readonly Point2[] }) & {
    fill: string;
    opacity: number;
};

/** One line of text, centred on its point. */
interface FigureText {
    x: number;
    y: number;
    lines: readonly string[];
    size: number;
    font: string;
    weight: string;
    style: string;
    color: string;
}

/** Everything one figure draws, in screen pixels: what {@link figureSvg} writes out. */
interface FigureDrawing {
    width: number;
    height: number;
    background?: string;
    edges: readonly { x1: number; y1: number; x2: number; y2: number; color: string; opacity: number; width: number }[];
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

const FONT = "system-ui, sans-serif";

/**
 * Text made safe inside an SVG element or attribute.
 * @param text - Any text.
 * @returns It, escaped.
 */
function esc(text: string): string {
    return text.replace(/[&<>"']/g, (c) => `&#${String(c.charCodeAt(0))};`);
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
 * The SVG document for a drawing: background, edges, nodes, labels, then the key on top.
 * @param drawing - What to draw.
 * @returns The document.
 */
function figureSvg(drawing: FigureDrawing): string {
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
                `stroke-width="${num(e.width)}"${e.opacity < 1 ? ` stroke-opacity="${num(e.opacity)}"` : ""}/>`,
        );
    }
    out.push(`</g><g>`);
    for (const n of drawing.nodes) {
        const paint = `fill="${esc(n.fill)}"${n.opacity < 1 ? ` fill-opacity="${num(n.opacity)}"` : ""}`;
        if ("circle" in n) {
            out.push(`<circle cx="${num(n.circle.x)}" cy="${num(n.circle.y)}" r="${num(n.circle.r)}" ${paint}/>`);
        } else {
            out.push(`<polygon points="${n.points.map(([x, y]) => `${num(x)},${num(y)}`).join(" ")}" ${paint}/>`);
        }
    }
    out.push(`</g><g text-anchor="middle" dominant-baseline="central">`);
    for (const t of drawing.texts) {
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
    if (drawing.legend !== undefined && drawing.legend.sections.length > 0) {
        out.push(legendSvg(drawing.legend, drawing.width, drawing.height));
    }
    out.push(`</svg>`);
    return out.join("\n");
}

/**
 * The key as SVG, laid out as `drawLegend` lays it out on a screenshot: a light card in its
 * corner holding each section's title, rows, ramp and note.
 * @param legend - The key and its measured size.
 * @param width - The figure's width.
 * @param height - The figure's height.
 * @returns The key's group.
 */
function legendSvg(legend: NonNullable<FigureDrawing["legend"]>, width: number, height: number): string {
    const { PAD, LINE, GAP, CHIP, RAMP_HEIGHT } = LEGEND_METRICS;
    const cardWidth = legend.inner + PAD * 2;
    const cardLeft = legend.position.endsWith("left") ? PAD : width - PAD - cardWidth;
    const cardTop = legend.position.startsWith("top") ? PAD : height - PAD - legend.height;
    const left = cardLeft + PAD;
    const right = left + legend.inner;
    const text = (x: number, y: number, words: string, extra = ""): string =>
        `<text x="${num(x)}" y="${num(y)}"${extra}>${esc(words)}</text>`;
    const out = [
        `<g font-family="${FONT}" font-size="12" dominant-baseline="central" fill="#1a1a1a">`,
        `<rect x="${num(cardLeft)}" y="${num(cardTop)}" width="${num(cardWidth)}" height="${num(legend.height)}" ` +
            `rx="4" fill="#ffffff" fill-opacity="0.92" stroke="#d0d0d0"/>`,
    ];
    let y = cardTop + PAD;
    legend.sections.forEach((section, index) => {
        out.push(text(left, y + LINE / 2, section.title, ` font-weight="600"`));
        y += LINE;
        for (const row of section.rows ?? []) {
            let x = left;
            const mid = y + LINE / 2;
            if (row.color !== undefined) {
                out.push(
                    `<rect x="${num(x)}" y="${num(mid - CHIP / 2)}" width="${String(CHIP)}" height="${String(CHIP)}" ` +
                        `fill="${esc(row.color)}"/>`,
                );
                x += CHIP + GAP;
            }
            out.push(text(x, mid, row.label));
            if (row.value !== undefined) {
                out.push(text(right, mid, row.value, ` text-anchor="end" fill="#666666"`));
            }
            y += LINE;
        }
        if (section.ramp) {
            const colors = section.ramp.colors ?? [];
            if (colors.length > 0) {
                const id = `graphty-ramp-${String(index)}`;
                const stops = colors
                    .map(
                        (c, i) =>
                            `<stop offset="${num(colors.length === 1 ? 0 : i / (colors.length - 1))}" stop-color="${esc(c)}"/>`,
                    )
                    .join("");
                out.push(`<defs><linearGradient id="${id}">${stops}</linearGradient></defs>`);
                out.push(
                    `<rect x="${num(left)}" y="${num(y)}" width="${num(right - left)}" height="${String(RAMP_HEIGHT)}" fill="url(#${id})"/>`,
                );
            } else {
                // A size wedge: thin at the low end, full height at the high end.
                out.push(
                    `<polygon points="${num(left)},${num(y + RAMP_HEIGHT)} ${num(right)},${num(y)} ${num(right)},${num(y + RAMP_HEIGHT)}" fill="#888888"/>`,
                );
            }
            const mid = y + RAMP_HEIGHT + GAP + LINE / 2;
            out.push(text(left, mid, section.ramp.min), text(right, mid, section.ramp.max, ` text-anchor="end"`));
            y += RAMP_HEIGHT + GAP + LINE;
        }
        if (section.note !== undefined) {
            out.push(text(left, y + LINE / 2, section.note, ` fill="#666666"`));
            y += LINE;
        }
        y += GAP;
    });
    out.push(`</g>`);
    return out.join("\n");
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
    return {
        ...at,
        lines,
        size,
        font: first.font,
        weight: first.weight,
        style: first.style,
        color: first.color,
    };
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
    const is2D = graph.getViewMode() === "2d";
    const view = scene.getViewMatrix();
    const painter = graph.getStylePainter();
    const depthOf = (p: Vector3): number => Vector3.TransformCoordinates(p, view).z;

    const shown = new Map<string | number, ReturnType<Graph["nodeScreenPosition"]>>();
    const nodes: { depth: number; shape: FigureShape }[] = [];
    const texts: FigureText[] = [];
    for (const node of graph.getNodes()) {
        const at = graph.nodeScreenPosition(node.id);
        if (!at?.visible) {
            continue;
        }
        shown.set(node.id, at);
        const color = node.drawnInstanceColor ??
            painter.nodePaint(node.index)?.color ?? { r: 255, g: 255, b: 255, a: 1 };
        const paint = { fill: rgb(color), opacity: color.a * node.drawnOpacity };
        const type = node.shapeType ?? "";
        const { left, right, top, bottom } = at.bounds;
        let shape: FigureShape;
        if (node.roundRadius !== null) {
            shape = { circle: { x: at.x, y: at.y, r: at.radius }, ...paint };
        } else if (isFlatShape(type)) {
            // ponytail: fitted to the projected box, so a flat shape turned away from the camera is drawn facing it.
            const outline = flatShapeOutline(type, right - left, bottom - top);
            shape = { points: outline.map(([x, y]): Point2 => [at.x + x, at.y - y]), ...paint };
        } else {
            // A solid seen from the camera: the hull of its box's corners, exact for a box.
            const corners = node.drawnBoundingBox.vectorsWorld.map((c): Point2 => {
                const p = graph.worldToScreen(c);
                return [p.x, p.y];
            });
            shape = { points: convexHull(corners), ...paint };
        }
        nodes.push({ depth: depthOf(node.drawnWorldPosition), shape });
        const words = labelText(node.label, graph, camera, css);
        if (words) {
            texts.push(words);
        }
    }
    // Far first, so a nearer node covers a farther one as it does on the canvas.
    nodes.sort((a, b) => b.depth - a.depth);

    const edges: FigureDrawing["edges"][number][] = [];
    for (const edge of graph.getEdges()) {
        const src = shown.get(edge.srcNode.id);
        const dst = shown.get(edge.dstNode.id);
        const style = painter.edgePaint(edge.index)?.style;
        if (!src || !dst || !edge.isRenderVisible() || !style) {
            continue;
        }
        const line = style.line ?? {};
        const styleWidth = line.width ?? 0.25;
        const mid = Vector3.Center(edge.srcNode.drawnWorldPosition, edge.dstNode.drawnWorldPosition);
        // The width rules of the line renderers: world units of `width / 40` in 2D, `width * 20`
        // screen units over the clip w in 3D (CustomLineRenderer's vertex shader).
        const clipW = camera.mode === Camera.ORTHOGRAPHIC_CAMERA ? 1 : depthOf(mid);
        let px = is2D
            ? (styleWidth / 40) * pixelsPerUnit(camera, mid) * css
            : (styleWidth * 10) / Math.max(clipW, 1e-6);
        px = Math.max(px, line.minScreenWidth ?? 0);
        if (px <= 0) {
            continue;
        }
        edges.push({
            x1: src.x,
            y1: src.y,
            x2: dst.x,
            y2: dst.y,
            color: typeof line.color === "string" ? line.color : "#a9a9a9",
            opacity: line.opacity ?? 1,
            width: px,
        });
        const words = labelText(edge.label, graph, camera, css);
        if (words) {
            texts.push(words);
        }
    }

    const { sections, position } = resolveLegend(graph, options.legend);
    const bg = scene.clearColor;
    return {
        width,
        height,
        ...(options.transparentBackground === true || bg.a === 0
            ? {}
            : { background: rgb({ r: bg.r * 255, g: bg.g * 255, b: bg.b * 255 }) }),
        edges,
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
    if (format !== "svg") {
        throw captureError("E_BAD_COMMAND", "Unknown figure format", { field: "format", value: format });
    }
    const drawing = figureDrawing(graph, options);
    const text = figureSvg(drawing);
    const blob = new Blob([text], { type: "image/svg+xml" });
    const download = options.download === true;
    if (download) {
        downloadBlob(blob, options.downloadFilename ?? "graph.svg");
    }
    return { blob, width: drawing.width, height: drawing.height, downloaded: download };
}
