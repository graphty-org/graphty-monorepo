/**
 * The SVG drawing and the figure frame of the layout stories: a heading with the call, the drawing,
 * and a caption saying what is shown.
 */

import type { SampleGraph } from "@graphty/graph-samples";

/** A layout's positions: `dim` numbers per node, in node order (a `LayoutResult`, or a simulation's array). */
export interface Positions {
    readonly positions: Float32Array;
    readonly dim: number;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const PADDING = 32;

const COLORS = {
    node: "#4f46e5",
    nodeStroke: "#312e81",
    edge: "#94a3b8",
    label: "#ffffff",
    background: "#f8fafc",
} as const;

/**
 * Creates an empty square SVG drawing area.
 * @param size - its width and height in pixels
 * @returns the SVG element
 */
export function createSvg(size: number = 600): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.setAttribute("role", "img");
    svg.style.cssText = `background: ${COLORS.background}; border-radius: 8px; display: block;`;
    return svg;
}

/**
 * Draws a graph at the given positions, scaled and centered to fill the SVG. Nodes with NaN coordinates
 * (a node a layout leaves out) are not drawn, nor are their edges.
 * @param svg - the drawing area, emptied first
 * @param graph - the graph's edges and node count
 * @param result - x, y (and z, ignored) per node
 * @param label - the accessible name of the drawing
 */
export function drawGraph(svg: SVGSVGElement, graph: SampleGraph, result: Positions, label: string): void {
    svg.replaceChildren();
    svg.setAttribute("aria-label", label);
    const size = Number(svg.getAttribute("width"));
    const { positions, dim } = result;
    const n = graph.nodeCount;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
        const x = positions[i * dim];
        const y = positions[i * dim + 1];
        if (Number.isFinite(x) && Number.isFinite(y)) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
    }
    // Small drawings (the catalog's tiles) get small unlabeled nodes, so neighbors do not cover each other
    const small = size < 400;
    let radius = n > 20 ? 12 : 16;
    if (small) {
        radius = 6;
    }
    const inner = size - 2 * (PADDING + radius);
    const range = Math.max(maxX - minX, maxY - minY) || 1;
    const k = inner / range;
    const offX = (size - (maxX - minX) * k) / 2;
    const offY = (size - (maxY - minY) * k) / 2;
    const at = (i: number): [number, number] => [
        (positions[i * dim] - minX) * k + offX,
        (maxY - positions[i * dim + 1]) * k + offY, // y up, as in the layout's coordinates
    ];

    for (let e = 0; e < graph.src.length; e++) {
        const [x1, y1] = at(graph.src[e]);
        const [x2, y2] = at(graph.dst[e]);
        if ([x1, y1, x2, y2].every(Number.isFinite)) {
            svg.appendChild(svgElement("line", { x1, y1, x2, y2, stroke: COLORS.edge, "stroke-width": 2 }));
        }
    }
    for (let i = 0; i < n; i++) {
        const [cx, cy] = at(i);
        if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
            continue;
        }
        svg.appendChild(
            svgElement("circle", {
                cx,
                cy,
                r: radius,
                fill: COLORS.node,
                stroke: COLORS.nodeStroke,
                "stroke-width": small ? 1 : 2,
            }),
        );
        if (small) {
            continue;
        }
        const text = svgElement("text", {
            x: cx,
            y: cy,
            "text-anchor": "middle",
            "dominant-baseline": "central",
            fill: COLORS.label,
            "font-size": radius > 12 ? 13 : 11,
            "font-weight": "bold",
            "font-family": "system-ui, sans-serif",
        });
        text.textContent = graph.ids?.[i] ?? String(i);
        svg.appendChild(text);
    }
}

function svgElement(tag: string, attributes: Record<string, string | number>): SVGElement {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attributes)) {
        el.setAttribute(name, String(value));
    }
    return el;
}

/**
 * The story frame: the call as a heading, the drawing, and a caption under it.
 * @param call - the layout call, shown in monospace
 * @param view - the drawing (an SVG or a 3D canvas container)
 * @param caption - what the drawing shows and where its graph comes from
 * @returns the story's root element
 */
export function figure(call: string, view: Element, caption: string): HTMLElement {
    const root = document.createElement("figure");
    root.style.cssText =
        "margin: 0; padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 12px;" +
        " font-family: system-ui, sans-serif; color: #1e293b;";
    const heading = document.createElement("code");
    heading.textContent = call;
    heading.style.cssText = "font-size: 16px; font-weight: 600; color: #1e293b;";
    const text = document.createElement("figcaption");
    text.textContent = caption;
    text.style.cssText = "max-width: 600px; font-size: 15px; line-height: 1.5; color: #334155;";
    root.append(heading, view, text);
    return root;
}

/**
 * A 2D story: draws the graph at the layout's positions inside the story frame.
 * @param graph - the graph
 * @param result - the layout's positions
 * @param call - the layout call
 * @param caption - the caption
 * @returns the story's root element
 */
export function show2D(graph: SampleGraph, result: Positions, call: string, caption: string): HTMLElement {
    const svg = createSvg();
    drawGraph(svg, graph, result, `${call}: ${graph.nodeCount} nodes`);
    return figure(call, svg, caption);
}
