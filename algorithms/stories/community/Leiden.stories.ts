/**
 * Leiden Community Detection Algorithm Stories
 *
 * Demonstrates Leiden community detection with a before/after visualization.
 * Shows how nodes are colored by their detected community membership.
 *
 * IMPORTANT: This story uses the actual leiden implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { Graph, leiden } from "@graphty/algorithms";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import {
    type GeneratedGraph,
    generateGraph,
    type GraphType,
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
interface LeidenArgs {
    nodeCount: number;
    graphType: GraphType;
    resolution: number;
    seed: number;
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
        graph.addEdge(edge.source, edge.target, edge.weight ?? 1);
    }

    return graph;
}

/**
 * Color palette for communities.
 */
const COMMUNITY_COLORS = [
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
 * Create the Leiden visualization story.
 */
function createLeidenStory(args: LeidenArgs): HTMLElement {
    const { nodeCount, graphType, resolution, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);
    const graph = toAlgorithmGraph(generatedGraph);

    // Run Leiden algorithm
    const leidenResult = leiden(graph, { resolution });

    // Convert Map<string, number> to array of communities for visualization
    const communitiesArray: string[][] = [];
    const labelToIndex = new Map<number, number>();

    for (const [nodeId, label] of leidenResult.communities) {
        let commIndex = labelToIndex.get(label);
        if (commIndex === undefined) {
            commIndex = communitiesArray.length;
            labelToIndex.set(label, commIndex);
            communitiesArray.push([]);
        }
        communitiesArray[commIndex].push(nodeId);
    }

    // Local result object compatible with the rest of the code
    const result = {
        communities: communitiesArray,
        modularity: leidenResult.modularity,
        iterations: leidenResult.iterations,
    };

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
    legend.innerHTML = `<span style="color: #64748b;">Communities:</span>`;
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
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">Leiden Community Detection</div>
        <div data-modularity style="margin-bottom: 8px; color: #475569;">Modularity: —</div>
        <div data-communities style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
    `;
    container.appendChild(infoPanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Click 'Detect Communities' to run Leiden algorithm");

    let isApplied = false;

    /**
     * Update legend with community colors.
     */
    function updateLegend(): void {
        while (legend.children.length > 1 && legend.lastChild) {
            legend.removeChild(legend.lastChild);
        }

        for (let i = 0; i < result.communities.length; i++) {
            const color = COMMUNITY_COLORS[i % COMMUNITY_COLORS.length];
            const item = document.createElement("span");
            item.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 4px;
            `;
            item.innerHTML = `
                <span style="width: 12px; height: 12px; background: ${color}; border-radius: 50%;"></span>
                <span style="color: #475569;">Community ${i + 1} (${result.communities[i].length} nodes)</span>
            `;
            legend.appendChild(item);
        }
    }

    /**
     * Update community membership display.
     */
    function updateCommunitiesDisplay(): void {
        const modularityEl = infoPanel.querySelector("[data-modularity]");
        const communitiesEl = infoPanel.querySelector("[data-communities]");

        if (modularityEl) {
            modularityEl.textContent = `Modularity: ${result.modularity.toFixed(4)}`;
        }

        if (!communitiesEl) {
            return;
        }

        communitiesEl.innerHTML = "";

        for (let commIndex = 0; commIndex < result.communities.length; commIndex++) {
            const color = COMMUNITY_COLORS[commIndex % COMMUNITY_COLORS.length];
            for (const nodeId of result.communities[commIndex]) {
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
                badge.textContent = nodeId;
                communitiesEl.appendChild(badge);
            }
        }
    }

    /**
     * Apply community coloring.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        // Create node to community mapping
        const nodeToCommunity = new Map<string, number>();
        for (let i = 0; i < result.communities.length; i++) {
            for (const nodeId of result.communities[i]) {
                nodeToCommunity.set(nodeId, i);
            }
        }

        // Apply colors to nodes
        const nodes = svg.querySelectorAll("[data-node-id]");
        nodes.forEach((node) => {
            const nodeId = node.getAttribute("data-node-id") ?? "0";
            const commIndex = nodeToCommunity.get(nodeId) ?? 0;
            const color = COMMUNITY_COLORS[commIndex % COMMUNITY_COLORS.length];
            (node as SVGCircleElement).setAttribute("fill", color);
        });

        // Apply colors to edges
        const edges = svg.querySelectorAll("[data-source]");
        edges.forEach((edge) => {
            const source = edge.getAttribute("data-source") ?? "0";
            const target = edge.getAttribute("data-target") ?? "0";
            const sourceComm = nodeToCommunity.get(source) ?? 0;
            const targetComm = nodeToCommunity.get(target) ?? 0;

            if (sourceComm === targetComm) {
                const color = COMMUNITY_COLORS[sourceComm % COMMUNITY_COLORS.length];
                (edge as SVGLineElement).setAttribute("stroke", color);
            } else {
                (edge as SVGLineElement).setAttribute("stroke", "#94a3b8");
            }
        });

        updateLegend();
        updateCommunitiesDisplay();
        updateStatus(statusPanel, `Found ${result.communities.length} communities (modularity: ${result.modularity.toFixed(4)})`);
    }

    /**
     * Reset visualization.
     */
    function reset(): void {
        isApplied = false;

        const nodes = svg.querySelectorAll("[data-node-id]");
        nodes.forEach((node) => {
            (node as SVGCircleElement).setAttribute("fill", "#6366f1");
        });

        const edges = svg.querySelectorAll("[data-source]");
        edges.forEach((edge) => {
            (edge as SVGLineElement).setAttribute("stroke", "#94a3b8");
        });

        while (legend.children.length > 1 && legend.lastChild) {
            legend.removeChild(legend.lastChild);
        }

        const modularityEl = infoPanel.querySelector("[data-modularity]");
        if (modularityEl) {
            modularityEl.textContent = "Modularity: —";
        }

        const communitiesEl = infoPanel.querySelector("[data-communities]");
        if (communitiesEl) {
            communitiesEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Not computed yet</span>';
        }

        updateStatus(statusPanel, "Click 'Detect Communities' to run Leiden algorithm");
    }

    // Initialize display
    const communitiesEl = infoPanel.querySelector("[data-communities]");
    if (communitiesEl) {
        communitiesEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Not computed yet</span>';
    }

    // Add controls
    const controls = createSimpleAnimationControls(apply, reset, "Detect Communities");
    container.appendChild(controls);

    return container;
}

const meta: Meta<LeidenArgs> = {
    title: "Community",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 6, max: 20, step: 1 },
            description: "Number of nodes in the graph",
        },
        graphType: {
            control: { type: "select" },
            options: ["random", "grid", "complete"] as GraphType[],
            description: "Type of graph to generate",
        },
        resolution: {
            control: { type: "range", min: 0.5, max: 2, step: 0.1 },
            description: "Resolution parameter (higher = more communities)",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        nodeCount: 12,
        graphType: "random",
        resolution: 1.0,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<LeidenArgs>;

/**
 * Leiden community detection story with before/after visualization.
 *
 * This story uses the actual `leiden()` function from @graphty/algorithms.
 * Nodes are colored by their detected community membership.
 */
export const Leiden: Story = {
    render: (args) => createLeidenStory(args),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        const detectButton = canvas.getByRole("button", { name: /detect communities/i });
        await userEvent.click(detectButton);

        await waitFor(
            async () => {
                const statusText = canvasElement.querySelector("[data-status]")?.textContent ?? "";
                await expect(statusText).toContain("communities");
            },
            { timeout: 5000 },
        );
    },
};
