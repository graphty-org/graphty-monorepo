/**
 * SVG visualization utilities for algorithm stories.
 * Provides consistent graph rendering and animation controls.
 */

import type { GeneratedGraph, GraphEdge, GraphNode } from "./graph-generators.js";

/**
 * Node state for visualization highlighting.
 */
export type NodeState = "default" | "visited" | "current" | "queued" | "stacked";

/**
 * Edge state for visualization highlighting.
 */
export type EdgeState = "default" | "traversed" | "current";

/**
 * Color palette for consistent styling.
 */
export const COLORS = {
    node: {
        default: "#6366f1",
        visited: "#22c55e",
        current: "#f59e0b",
        queued: "#3b82f6",
        stacked: "#8b5cf6",
    },
    edge: {
        default: "#94a3b8",
        traversed: "#22c55e",
        current: "#f59e0b",
    },
    text: {
        node: "#ffffff",
        edge: "#64748b",
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
export function createSvgContainer(width: number = 500, height: number = 500): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.style.backgroundColor = COLORS.background;
    svg.style.borderRadius = "8px";
    svg.style.display = "block";

    // Add groups for layering
    const defsGroup = document.createElementNS(SVG_NS, "defs");
    const edgeGroup = document.createElementNS(SVG_NS, "g");
    const nodeGroup = document.createElementNS(SVG_NS, "g");
    const labelGroup = document.createElementNS(SVG_NS, "g");

    edgeGroup.setAttribute("class", "edges");
    nodeGroup.setAttribute("class", "nodes");
    labelGroup.setAttribute("class", "labels");

    svg.appendChild(defsGroup);
    svg.appendChild(edgeGroup);
    svg.appendChild(nodeGroup);
    svg.appendChild(labelGroup);

    return svg;
}

/**
 * Render a graph to an SVG element.
 */
export function renderGraph(
    svg: SVGSVGElement,
    graph: GeneratedGraph,
    nodeRadius: number = 20,
): void {
    const edgeGroup = svg.querySelector(".edges") as SVGGElement;
    const nodeGroup = svg.querySelector(".nodes") as SVGGElement;
    const labelGroup = svg.querySelector(".labels") as SVGGElement;

    // Clear existing content
    edgeGroup.innerHTML = "";
    nodeGroup.innerHTML = "";
    labelGroup.innerHTML = "";

    // Render edges first (behind nodes)
    for (const edge of graph.edges) {
        const sourceNode = graph.nodes.find((n) => n.id === edge.source);
        const targetNode = graph.nodes.find((n) => n.id === edge.target);
        if (sourceNode && targetNode) {
            renderEdge(edgeGroup, sourceNode, targetNode, edge);
        }
    }

    // Render nodes
    for (const node of graph.nodes) {
        renderNode(nodeGroup, labelGroup, node, nodeRadius);
    }
}

/**
 * Render a single node.
 */
function renderNode(
    nodeGroup: SVGGElement,
    labelGroup: SVGGElement,
    node: GraphNode,
    radius: number,
): void {
    // Create circle
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", String(node.x));
    circle.setAttribute("cy", String(node.y));
    circle.setAttribute("r", String(radius));
    circle.setAttribute("fill", COLORS.node.default);
    circle.setAttribute("stroke", "#4338ca");
    circle.setAttribute("stroke-width", "2");
    circle.setAttribute("data-node-id", String(node.id));
    circle.style.transition = "fill 0.3s ease";
    nodeGroup.appendChild(circle);

    // Create label
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", String(node.x));
    text.setAttribute("y", String(node.y));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("fill", COLORS.text.node);
    text.setAttribute("font-size", "12");
    text.setAttribute("font-weight", "bold");
    text.setAttribute("font-family", "system-ui, sans-serif");
    text.setAttribute("data-node-label", String(node.id));
    text.textContent = node.label;
    labelGroup.appendChild(text);
}

/**
 * Render a single edge.
 */
function renderEdge(
    edgeGroup: SVGGElement,
    source: GraphNode,
    target: GraphNode,
    edge: GraphEdge,
): void {
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", String(source.x));
    line.setAttribute("y1", String(source.y));
    line.setAttribute("x2", String(target.x));
    line.setAttribute("y2", String(target.y));
    line.setAttribute("stroke", COLORS.edge.default);
    line.setAttribute("stroke-width", "2");
    line.setAttribute("data-source", String(edge.source));
    line.setAttribute("data-target", String(edge.target));
    line.style.transition = "stroke 0.3s ease";
    edgeGroup.appendChild(line);
}

/**
 * Highlight a node with a specific state.
 */
export function highlightNode(svg: SVGSVGElement, nodeId: number, state: NodeState): void {
    const circle = svg.querySelector(`[data-node-id="${nodeId}"]`);
    if (circle) {
        circle.setAttribute("fill", COLORS.node[state]);
    }
}

/**
 * Highlight an edge with a specific state.
 */
export function highlightEdge(
    svg: SVGSVGElement,
    sourceId: number,
    targetId: number,
    state: EdgeState,
): void {
    // Try both directions for undirected edges
    let line = svg.querySelector(`[data-source="${sourceId}"][data-target="${targetId}"]`);
    if (!line) {
        line = svg.querySelector(`[data-source="${targetId}"][data-target="${sourceId}"]`);
    }
    if (line) {
        line.setAttribute("stroke", COLORS.edge[state]);
        line.setAttribute("stroke-width", state === "default" ? "2" : "3");
    }
}

/**
 * Reset all node and edge highlights.
 */
export function resetHighlights(svg: SVGSVGElement): void {
    // Reset nodes
    const nodes = svg.querySelectorAll("[data-node-id]");
    nodes.forEach((node) => {
        (node as SVGCircleElement).setAttribute("fill", COLORS.node.default);
    });

    // Reset edges
    const edges = svg.querySelectorAll("[data-source]");
    edges.forEach((edge) => {
        (edge as SVGLineElement).setAttribute("stroke", COLORS.edge.default);
        (edge as SVGLineElement).setAttribute("stroke-width", "2");
    });
}

/**
 * Animation state for traversal visualization.
 */
export interface AnimationState {
    isPlaying: boolean;
    isPaused: boolean;
    currentStep: number;
    totalSteps: number;
    speed: number;
}

/**
 * Traversal step for animation.
 */
export interface TraversalStep {
    type: "visit" | "queue" | "dequeue" | "push" | "pop" | "complete";
    nodeId: number;
    parentId?: number;
    description: string;
}

/**
 * Create animation control buttons.
 */
export function createAnimationControls(
    onPlay: () => void,
    onPause: () => void,
    onStep: () => void,
    onReset: () => void,
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

    const playBtn = document.createElement("button");
    playBtn.textContent = "Play";
    playBtn.style.cssText = `${buttonStyle}background: #22c55e; color: white;`;
    playBtn.onclick = onPlay;

    const pauseBtn = document.createElement("button");
    pauseBtn.textContent = "Pause";
    pauseBtn.style.cssText = `${buttonStyle}background: #f59e0b; color: white;`;
    pauseBtn.onclick = onPause;

    const stepBtn = document.createElement("button");
    stepBtn.textContent = "Step";
    stepBtn.style.cssText = `${buttonStyle}background: #3b82f6; color: white;`;
    stepBtn.onclick = onStep;

    const resetBtn = document.createElement("button");
    resetBtn.textContent = "Reset";
    resetBtn.style.cssText = `${buttonStyle}background: #ef4444; color: white;`;
    resetBtn.onclick = onReset;

    container.appendChild(playBtn);
    container.appendChild(pauseBtn);
    container.appendChild(stepBtn);
    container.appendChild(resetBtn);

    return container;
}

/**
 * Create a data structure visualization panel (queue or stack).
 */
export function createDataStructurePanel(
    type: "queue" | "stack",
    title: string,
): HTMLDivElement {
    const panel = document.createElement("div");
    panel.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background: #f1f5f9;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
    `;

    const titleEl = document.createElement("div");
    titleEl.textContent = title;
    titleEl.style.cssText = `
        font-weight: 600;
        margin-bottom: 8px;
        color: #1e293b;
    `;

    const contentEl = document.createElement("div");
    contentEl.style.cssText = `
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
        min-height: 32px;
        align-items: center;
    `;
    contentEl.setAttribute("data-structure-content", "");

    panel.appendChild(titleEl);
    panel.appendChild(contentEl);

    return panel;
}

/**
 * Update the data structure visualization.
 */
export function updateDataStructure(panel: HTMLDivElement, items: number[]): void {
    const content = panel.querySelector("[data-structure-content]");
    if (!content) {
        return;
    }

    content.innerHTML = "";

    if (items.length === 0) {
        const empty = document.createElement("span");
        empty.textContent = "(empty)";
        empty.style.cssText = "color: #94a3b8; font-style: italic;";
        content.appendChild(empty);
        return;
    }

    for (const item of items) {
        const badge = document.createElement("span");
        badge.textContent = String(item);
        badge.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            background: #6366f1;
            color: white;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        `;
        content.appendChild(badge);
    }
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
    panel.textContent = "Ready to start traversal";
    return panel;
}

/**
 * Update status message.
 */
export function updateStatus(panel: HTMLDivElement, message: string): void {
    panel.textContent = message;
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
 * Heat map color interpolation (cold blue to hot red gradient).
 * Value should be normalized between 0 and 1.
 */
export function getHeatMapColor(value: number): string {
    // Clamp value between 0 and 1
    const v = Math.max(0, Math.min(1, value));

    // Cold (blue) -> Hot (red) gradient
    // Low values: blue (0, 100, 255)
    // High values: red (255, 50, 50)
    const r = Math.round(v * 255);
    const g = Math.round(100 - v * 50);
    const b = Math.round(255 - v * 205);

    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Apply heat map coloring to nodes based on centrality scores.
 */
export function applyHeatMap(
    svg: SVGSVGElement,
    scores: Record<string, number>,
    options: { minRadius?: number; maxRadius?: number } = {},
): void {
    const { minRadius = 15, maxRadius = 30 } = options;

    // Get min and max scores for normalization
    const values = Object.values(scores).filter((v) => isFinite(v));
    if (values.length === 0) {
        return;
    }

    const minScore = Math.min(...values);
    const maxScore = Math.max(...values);
    const range = maxScore - minScore;

    // Apply colors and sizes to nodes
    const nodes = svg.querySelectorAll("[data-node-id]");
    nodes.forEach((node) => {
        const nodeId = node.getAttribute("data-node-id");
        if (nodeId === null) {
            return;
        }

        const score = scores[nodeId];
        if (score === undefined || !isFinite(score)) {
            return;
        }

        // Normalize score to 0-1 range
        const normalizedScore = range > 0 ? (score - minScore) / range : 0.5;

        // Apply color
        const color = getHeatMapColor(normalizedScore);
        (node as SVGCircleElement).setAttribute("fill", color);

        // Apply size (radius)
        const radius = minRadius + normalizedScore * (maxRadius - minRadius);
        (node as SVGCircleElement).setAttribute("r", String(radius));
    });
}

/**
 * Create a color legend for heat map visualization.
 */
export function createHeatMapLegend(title: string, minLabel: string, maxLabel: string): HTMLDivElement {
    const legend = document.createElement("div");
    legend.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
        font-family: system-ui, sans-serif;
        font-size: 12px;
    `;

    legend.innerHTML = `
        <span style="color: #64748b;">${minLabel}</span>
        <div style="
            width: 120px;
            height: 12px;
            background: linear-gradient(to right,
                rgb(0, 100, 255),
                rgb(255, 50, 50)
            );
            border-radius: 2px;
        "></div>
        <span style="color: #64748b;">${maxLabel}</span>
        <span style="color: #1e293b; font-weight: 500; margin-left: 8px;">${title}</span>
    `;

    return legend;
}

/**
 * Create simple animation controls with just Play button for before/after animations.
 */
export function createSimpleAnimationControls(
    onApply: () => void,
    onReset: () => void,
    applyLabel: string = "Apply",
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
