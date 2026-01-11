/**
 * SVG visualization utilities for layout stories.
 * Provides consistent graph rendering and animation support.
 */

import type { PositionMap } from "@graphty/layout";
import type { GeneratedGraph, GraphEdge, GraphNode } from "./graph-generators.js";

/**
 * Calculate the bounding box of positions.
 */
function getPositionBounds(positions: PositionMap): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
} {
    const posValues = Object.values(positions);
    if (posValues.length === 0) {
        return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const pos of posValues) {
        if (pos[0] < minX) minX = pos[0];
        if (pos[0] > maxX) maxX = pos[0];
        if (pos[1] < minY) minY = pos[1];
        if (pos[1] > maxY) maxY = pos[1];
    }

    // Handle case where all positions are the same
    if (minX === maxX) {
        minX -= 0.5;
        maxX += 0.5;
    }
    if (minY === maxY) {
        minY -= 0.5;
        maxY += 0.5;
    }

    return { minX, maxX, minY, maxY };
}

/**
 * Normalize positions to fit within a target area with padding.
 * Returns screen coordinates centered in the target area.
 */
function normalizePositionsToScreen(
    positions: PositionMap,
    graph: { nodes: Array<{ id: number }> },
    targetWidth: number = 500,
    targetHeight: number = 500,
    padding: number = 40,
): Record<number, { x: number; y: number }> {
    const bounds = getPositionBounds(positions);
    const rangeX = bounds.maxX - bounds.minX;
    const rangeY = bounds.maxY - bounds.minY;

    // Calculate scale to fit within target area with padding
    const availableWidth = targetWidth - 2 * padding;
    const availableHeight = targetHeight - 2 * padding;
    const scaleX = availableWidth / rangeX;
    const scaleY = availableHeight / rangeY;
    const scale = Math.min(scaleX, scaleY);

    // Calculate offsets to center the graph
    const scaledWidth = rangeX * scale;
    const scaledHeight = rangeY * scale;
    const offsetX = (targetWidth - scaledWidth) / 2;
    const offsetY = (targetHeight - scaledHeight) / 2;

    const screenPositions: Record<number, { x: number; y: number }> = {};
    for (const node of graph.nodes) {
        const pos = positions[node.id];
        if (pos) {
            screenPositions[node.id] = {
                x: (pos[0] - bounds.minX) * scale + offsetX,
                y: (pos[1] - bounds.minY) * scale + offsetY,
            };
        }
    }

    return screenPositions;
}

/**
 * Color palette for consistent styling.
 */
const COLORS = {
    node: {
        default: "#6366f1",
        highlighted: "#22c55e",
    },
    edge: {
        default: "#94a3b8",
        highlighted: "#22c55e",
    },
    text: {
        node: "#ffffff",
    },
    background: "#f8fafc",
} as const;

/**
 * SVG namespace for creating SVG elements.
 */
const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Create an SVG container element with standard styling.
 */
function createSvgContainer(width: number = 500, height: number = 500): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.style.backgroundColor = COLORS.background;
    svg.style.borderRadius = "8px";
    svg.style.display = "block";

    // Add groups for layering
    const edgeGroup = document.createElementNS(SVG_NS, "g");
    const nodeGroup = document.createElementNS(SVG_NS, "g");
    const labelGroup = document.createElementNS(SVG_NS, "g");

    edgeGroup.setAttribute("class", "edges");
    nodeGroup.setAttribute("class", "nodes");
    labelGroup.setAttribute("class", "labels");

    svg.appendChild(edgeGroup);
    svg.appendChild(nodeGroup);
    svg.appendChild(labelGroup);

    return svg;
}

/**
 * Render a graph to an SVG element with node positions.
 */
export function renderGraph(
    svg: SVGSVGElement,
    graph: GeneratedGraph,
    positions: PositionMap,
    nodeRadius: number = 20,
    scale: number = 200,
    offsetX: number = 250,
    offsetY: number = 250,
): void {
    const edgeGroup = svg.querySelector(".edges") as SVGGElement;
    const nodeGroup = svg.querySelector(".nodes") as SVGGElement;
    const labelGroup = svg.querySelector(".labels") as SVGGElement;

    // Clear existing content
    edgeGroup.innerHTML = "";
    nodeGroup.innerHTML = "";
    labelGroup.innerHTML = "";

    // Convert positions to screen coordinates
    const screenPositions: Record<number, { x: number; y: number }> = {};
    for (const node of graph.nodes) {
        const pos = positions[node.id];
        if (pos) {
            screenPositions[node.id] = {
                x: pos[0] * scale + offsetX,
                y: pos[1] * scale + offsetY,
            };
        }
    }

    // Render edges first (behind nodes)
    for (const edge of graph.edges) {
        const sourcePos = screenPositions[edge.source];
        const targetPos = screenPositions[edge.target];
        if (sourcePos && targetPos) {
            renderEdge(edgeGroup, sourcePos, targetPos, edge);
        }
    }

    // Render nodes
    for (const node of graph.nodes) {
        const pos = screenPositions[node.id];
        if (pos) {
            renderNode(nodeGroup, labelGroup, node, pos.x, pos.y, nodeRadius);
        }
    }
}

/**
 * Render a single node.
 */
function renderNode(
    nodeGroup: SVGGElement,
    labelGroup: SVGGElement,
    node: GraphNode,
    x: number,
    y: number,
    radius: number,
): void {
    // Create circle
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", String(x));
    circle.setAttribute("cy", String(y));
    circle.setAttribute("r", String(radius));
    circle.setAttribute("fill", COLORS.node.default);
    circle.setAttribute("stroke", "#4338ca");
    circle.setAttribute("stroke-width", "2");
    circle.setAttribute("data-node-id", String(node.id));
    circle.style.transition = "cx 0.5s ease, cy 0.5s ease";
    nodeGroup.appendChild(circle);

    // Create label
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", String(x));
    text.setAttribute("y", String(y));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("fill", COLORS.text.node);
    text.setAttribute("font-size", "12");
    text.setAttribute("font-weight", "bold");
    text.setAttribute("font-family", "system-ui, sans-serif");
    text.setAttribute("data-node-label", String(node.id));
    text.style.transition = "x 0.5s ease, y 0.5s ease";
    text.textContent = node.label;
    labelGroup.appendChild(text);
}

/**
 * Render a single edge.
 */
function renderEdge(
    edgeGroup: SVGGElement,
    sourcePos: { x: number; y: number },
    targetPos: { x: number; y: number },
    edge: GraphEdge,
): void {
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", String(sourcePos.x));
    line.setAttribute("y1", String(sourcePos.y));
    line.setAttribute("x2", String(targetPos.x));
    line.setAttribute("y2", String(targetPos.y));
    line.setAttribute("stroke", COLORS.edge.default);
    line.setAttribute("stroke-width", "2");
    line.setAttribute("data-source", String(edge.source));
    line.setAttribute("data-target", String(edge.target));
    line.style.transition =
        "x1 0.5s ease, y1 0.5s ease, x2 0.5s ease, y2 0.5s ease";
    edgeGroup.appendChild(line);
}

/**
 * Update node and edge positions with animation.
 * Uses auto-scaling to fit positions within the SVG viewport.
 */
export function updatePositions(
    svg: SVGSVGElement,
    graph: GeneratedGraph,
    positions: PositionMap,
    _scale: number = 200,
    _offsetX: number = 250,
    _offsetY: number = 250,
): void {
    // Get SVG dimensions
    const width = parseInt(svg.getAttribute("width") ?? "500", 10);
    const height = parseInt(svg.getAttribute("height") ?? "500", 10);

    // Use auto-scaling to normalize positions to fit the viewport
    const screenPositions = normalizePositionsToScreen(positions, graph, width, height, 40);

    // Update node positions
    for (const node of graph.nodes) {
        const pos = screenPositions[node.id];
        if (pos) {
            const circle = svg.querySelector(`[data-node-id="${node.id}"]`);
            const text = svg.querySelector(`[data-node-label="${node.id}"]`);
            if (circle) {
                circle.setAttribute("cx", String(pos.x));
                circle.setAttribute("cy", String(pos.y));
            }
            if (text) {
                text.setAttribute("x", String(pos.x));
                text.setAttribute("y", String(pos.y));
            }
        }
    }

    // Update edge positions
    for (const edge of graph.edges) {
        const sourcePos = screenPositions[edge.source];
        const targetPos = screenPositions[edge.target];
        const line = svg.querySelector(
            `[data-source="${edge.source}"][data-target="${edge.target}"]`,
        );
        if (line && sourcePos && targetPos) {
            line.setAttribute("x1", String(sourcePos.x));
            line.setAttribute("y1", String(sourcePos.y));
            line.setAttribute("x2", String(targetPos.x));
            line.setAttribute("y2", String(targetPos.y));
        }
    }
}

/**
 * Create the main story container with all visualization components.
 */
export function createStoryContainer(width: number = 500, height: number = 500): {
    container: HTMLDivElement;
    svg: SVGSVGElement;
} {
    const container = document.createElement("div");
    container.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 24px;
        font-family: system-ui, sans-serif;
    `;

    const svg = createSvgContainer(width, height);
    container.appendChild(svg);

    return { container, svg };
}

/**
 * Create animation controls with Apply Layout and Reset buttons.
 */
export function createAnimationControls(
    onApply: () => void,
    onReset: () => void,
    applyLabel: string = "Apply Layout",
): HTMLDivElement {
    const container = document.createElement("div");
    container.style.cssText = `
        display: flex;
        gap: 8px;
        margin-top: 16px;
        justify-content: center;
    `;

    const buttonStyle = `
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        font-weight: 500;
        transition: opacity 0.2s;
    `;

    const applyBtn = document.createElement("button");
    applyBtn.textContent = applyLabel;
    applyBtn.style.cssText = `${buttonStyle}background: #22c55e; color: white;`;
    applyBtn.onclick = onApply;

    const resetBtn = document.createElement("button");
    resetBtn.textContent = "Reset";
    resetBtn.style.cssText = `${buttonStyle}background: #ef4444; color: white;`;
    resetBtn.onclick = onReset;

    container.appendChild(applyBtn);
    container.appendChild(resetBtn);

    return container;
}

/**
 * Create a status message panel.
 */
export function createStatusPanel(): HTMLDivElement {
    const panel = document.createElement("div");
    panel.style.cssText = `
        margin-top: 8px;
        padding: 8px 12px;
        background: #e2e8f0;
        border-radius: 4px;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        color: #475569;
        min-height: 24px;
    `;
    panel.setAttribute("data-status", "");
    panel.textContent = "Click 'Apply Layout' to see the transformation";
    return panel;
}

/**
 * Update status message.
 */
export function updateStatus(panel: HTMLDivElement, message: string): void {
    panel.textContent = message;
}

/**
 * Create a layout info panel showing current positions.
 */
export function createInfoPanel(title: string): HTMLDivElement {
    const panel = document.createElement("div");
    panel.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background: #f1f5f9;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
        max-width: 500px;
        width: 100%;
    `;
    panel.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">${title}</div>
        <div data-info style="font-size: 12px; color: #64748b;"></div>
    `;
    return panel;
}

/**
 * Update info panel content.
 */
export function updateInfoPanel(panel: HTMLDivElement, content: string): void {
    const infoEl = panel.querySelector("[data-info]");
    if (infoEl) {
        infoEl.textContent = content;
    }
}
