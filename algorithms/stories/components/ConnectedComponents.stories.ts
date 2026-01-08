/**
 * Connected Components Algorithm Stories
 *
 * Demonstrates connected components detection with a before/after visualization.
 * Shows how nodes are colored by their component membership.
 *
 * IMPORTANT: This story uses the actual connectedComponents implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { connectedComponents, Graph } from "@graphty/algorithms";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import {
    type GeneratedGraph,
    SeededRandom,
} from "../utils/graph-generators.js";
import {
    createSimpleAnimationControls,
    createStatusPanel,
    createStoryContainer,
    renderGraph,
    updateStatus,
} from "../utils/visualization.js";

/**
 * Story arguments interface.
 */
interface ComponentsArgs {
    nodeCount: number;
    componentCount: number;
    seed: number;
}

/**
 * Generate a graph with multiple disconnected components.
 */
function generateDisconnectedGraph(
    nodeCount: number,
    componentCount: number,
    seed: number,
    width: number = 500,
    height: number = 500,
): GeneratedGraph {
    const rng = new SeededRandom(seed);
    const nodes: GeneratedGraph["nodes"] = [];
    const edges: GeneratedGraph["edges"] = [];

    // Distribute nodes among components
    const nodesPerComponent = Math.floor(nodeCount / componentCount);
    let nodeId = 0;

    // Calculate component centers
    const cols = Math.ceil(Math.sqrt(componentCount));
    const rows = Math.ceil(componentCount / cols);
    const cellWidth = width / cols;
    const cellHeight = height / rows;

    for (let comp = 0; comp < componentCount; comp++) {
        const compNodes = comp < componentCount - 1 ? nodesPerComponent : nodeCount - nodeId;
        const col = comp % cols;
        const row = Math.floor(comp / cols);
        const centerX = (col + 0.5) * cellWidth;
        const centerY = (row + 0.5) * cellHeight;
        const radius = Math.min(cellWidth, cellHeight) * 0.35;

        const startId = nodeId;

        // Create nodes for this component
        for (let i = 0; i < compNodes; i++) {
            const angle = (2 * Math.PI * i) / compNodes + rng.next() * 0.3;
            const r = radius * (0.5 + rng.next() * 0.5);
            nodes.push({
                id: nodeId,
                label: String(nodeId),
                x: centerX + r * Math.cos(angle),
                y: centerY + r * Math.sin(angle),
            });
            nodeId++;
        }

        // Create edges within this component (make it connected)
        for (let i = startId + 1; i < startId + compNodes; i++) {
            // Connect to previous node (ensures connectivity)
            const prevNode = startId + Math.floor(rng.next() * (i - startId));
            edges.push({ source: prevNode, target: i });

            // Add some extra edges randomly
            if (rng.next() < 0.3 && i > startId + 1) {
                const randomNode = startId + Math.floor(rng.next() * (i - startId));
                if (randomNode !== prevNode) {
                    edges.push({ source: randomNode, target: i });
                }
            }
        }
    }

    return { nodes, edges };
}

/**
 * Convert GeneratedGraph to @graphty/algorithms Graph.
 */
function toAlgorithmGraph(generatedGraph: GeneratedGraph): Graph {
    const graph = new Graph({ directed: false });

    for (const node of generatedGraph.nodes) {
        graph.addNode(node.id);
    }

    for (const edge of generatedGraph.edges) {
        graph.addEdge(edge.source, edge.target);
    }

    return graph;
}

/**
 * Color palette for components.
 */
const COMPONENT_COLORS = [
    "#ef4444", // red
    "#f59e0b", // amber
    "#22c55e", // green
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
];

/**
 * Create the Connected Components visualization story.
 */
function createComponentsStory(args: ComponentsArgs): HTMLElement {
    const { nodeCount, componentCount, seed } = args;

    // Generate graph with disconnected components
    const generatedGraph = generateDisconnectedGraph(nodeCount, componentCount, seed);
    const graph = toAlgorithmGraph(generatedGraph);

    // Get connected components using actual algorithm
    const components = connectedComponents(graph);

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph (initial state - uniform coloring)
    renderGraph(svg, generatedGraph);

    // Create legend
    const legend = document.createElement("div");
    legend.style.cssText = `
        display: flex;
        align-items: center;
        gap: 16px;
        margin-top: 8px;
        font-family: system-ui, sans-serif;
        font-size: 12px;
        flex-wrap: wrap;
    `;
    legend.innerHTML = `<span style="color: #64748b;">Components:</span>`;
    container.appendChild(legend);

    // Create info panel
    const infoPanel = document.createElement("div");
    infoPanel.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background: #f1f5f9;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
    `;
    infoPanel.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">Component Membership</div>
        <div data-components style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
    `;
    container.appendChild(infoPanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Click 'Find Components' to detect connected components");

    let isApplied = false;

    /**
     * Update legend with component colors.
     */
    function updateLegend(): void {
        // Clear existing legend items (keep first child)
        while (legend.children.length > 1 && legend.lastChild) {
            legend.removeChild(legend.lastChild);
        }

        for (let i = 0; i < components.length; i++) {
            const color = COMPONENT_COLORS[i % COMPONENT_COLORS.length];
            const item = document.createElement("span");
            item.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 4px;
            `;
            item.innerHTML = `
                <span style="width: 12px; height: 12px; background: ${color}; border-radius: 50%;"></span>
                <span style="color: #475569;">Component ${i + 1} (${components[i].length} nodes)</span>
            `;
            legend.appendChild(item);
        }
    }

    /**
     * Update component membership display.
     */
    function updateComponentsDisplay(): void {
        const componentsEl = infoPanel.querySelector("[data-components]");
        if (!componentsEl) {
            return;
        }

        componentsEl.innerHTML = "";

        for (let compIndex = 0; compIndex < components.length; compIndex++) {
            const color = COMPONENT_COLORS[compIndex % COMPONENT_COLORS.length];
            for (const nodeId of components[compIndex]) {
                const badge = document.createElement("span");
                badge.style.cssText = `
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 40px;
                    padding: 4px 8px;
                    background: ${color};
                    color: white;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                `;
                badge.textContent = String(nodeId);
                componentsEl.appendChild(badge);
            }
        }
    }

    /**
     * Apply component coloring.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        // Create node to component mapping
        const nodeToComponent = new Map<number, number>();
        for (let i = 0; i < components.length; i++) {
            for (const nodeId of components[i]) {
                nodeToComponent.set(nodeId as number, i);
            }
        }

        // Apply colors to nodes
        const nodes = svg.querySelectorAll("[data-node-id]");
        nodes.forEach((node) => {
            const nodeId = parseInt(node.getAttribute("data-node-id") ?? "0");
            const compIndex = nodeToComponent.get(nodeId) ?? 0;
            const color = COMPONENT_COLORS[compIndex % COMPONENT_COLORS.length];
            (node as SVGCircleElement).setAttribute("fill", color);
        });

        // Apply colors to edges
        const edges = svg.querySelectorAll("[data-source]");
        edges.forEach((edge) => {
            const source = parseInt(edge.getAttribute("data-source") ?? "0");
            const compIndex = nodeToComponent.get(source) ?? 0;
            const color = COMPONENT_COLORS[compIndex % COMPONENT_COLORS.length];
            (edge as SVGLineElement).setAttribute("stroke", color);
        });

        updateLegend();
        updateComponentsDisplay();
        updateStatus(statusPanel, `Found ${components.length} connected component${components.length !== 1 ? "s" : ""}`);
    }

    /**
     * Reset visualization.
     */
    function reset(): void {
        isApplied = false;

        // Reset node colors
        const nodes = svg.querySelectorAll("[data-node-id]");
        nodes.forEach((node) => {
            (node as SVGCircleElement).setAttribute("fill", "#6366f1");
        });

        // Reset edge colors
        const edges = svg.querySelectorAll("[data-source]");
        edges.forEach((edge) => {
            (edge as SVGLineElement).setAttribute("stroke", "#94a3b8");
        });

        // Clear legend
        while (legend.children.length > 1 && legend.lastChild) {
            legend.removeChild(legend.lastChild);
        }

        // Clear components display
        const componentsEl = infoPanel.querySelector("[data-components]");
        if (componentsEl) {
            componentsEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Not computed yet</span>';
        }

        updateStatus(statusPanel, "Click 'Find Components' to detect connected components");
    }

    // Initialize components display
    const componentsEl = infoPanel.querySelector("[data-components]");
    if (componentsEl) {
        componentsEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Not computed yet</span>';
    }

    // Add controls
    const controls = createSimpleAnimationControls(apply, reset, "Find Components");
    container.appendChild(controls);

    return container;
}

const meta: Meta<ComponentsArgs> = {
    title: "Components",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 6, max: 20, step: 1 },
            description: "Total number of nodes",
        },
        componentCount: {
            control: { type: "range", min: 2, max: 5, step: 1 },
            description: "Number of disconnected components",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        nodeCount: 12,
        componentCount: 3,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<ComponentsArgs>;

/**
 * Connected components detection story with before/after visualization.
 *
 * This story uses the actual `connectedComponents()` function from @graphty/algorithms.
 * Nodes and edges are colored by their component membership.
 */
export const Connected: Story = {
    render: (args) => createComponentsStory(args),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Click find components button
        const findButton = canvas.getByRole("button", { name: /find components/i });
        await userEvent.click(findButton);

        // Wait for status to update
        await waitFor(
            async () => {
                const statusText = canvasElement.querySelector("[data-status]")?.textContent ?? "";
                await expect(statusText).toContain("component");
            },
            { timeout: 5000 },
        );
    },
};
