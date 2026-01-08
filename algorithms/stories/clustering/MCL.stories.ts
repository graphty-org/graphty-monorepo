/**
 * MCL (Markov Clustering) Algorithm Stories
 *
 * Demonstrates Markov Clustering with a before/after visualization.
 * Shows how nodes are colored by their cluster membership.
 *
 * IMPORTANT: This story uses the actual markovClustering implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 *
 * Note: MCL finds natural clusters based on random walk flow patterns.
 */

import { Graph, markovClustering } from "@graphty/algorithms";
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
interface MCLArgs {
    nodeCount: number;
    graphType: GraphType;
    inflation: number;
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
 * Color palette for clusters.
 */
const CLUSTER_COLORS = [
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
 * Create the MCL visualization story.
 */
function createMCLStory(args: MCLArgs): HTMLElement {
    const { nodeCount, graphType, inflation, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);
    const graph = toAlgorithmGraph(generatedGraph);

    // Run MCL using actual algorithm
    const result = markovClustering(graph, { inflation });

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
    legend.innerHTML = `<span style="color: #64748b;">Clusters:</span>`;
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
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">Markov Clustering (inflation: ${inflation})</div>
        <div data-iterations style="margin-bottom: 8px; color: #475569;">Iterations: —</div>
        <div data-clusters style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
    `;
    container.appendChild(infoPanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Click 'Compute Clusters' to run Markov clustering");

    let isApplied = false;

    /**
     * Update legend with cluster colors.
     */
    function updateLegend(): void {
        while (legend.children.length > 1 && legend.lastChild) {
            legend.removeChild(legend.lastChild);
        }

        for (let i = 0; i < result.communities.length; i++) {
            const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
            const item = document.createElement("span");
            item.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 4px;
            `;
            item.innerHTML = `
                <span style="width: 12px; height: 12px; background: ${color}; border-radius: 50%;"></span>
                <span style="color: #475569;">Cluster ${i + 1} (${result.communities[i].length} nodes)</span>
            `;
            legend.appendChild(item);
        }
    }

    /**
     * Update cluster membership display.
     */
    function updateClustersDisplay(): void {
        const iterationsEl = infoPanel.querySelector("[data-iterations]");
        const clustersEl = infoPanel.querySelector("[data-clusters]");

        if (iterationsEl) {
            iterationsEl.textContent = `Iterations: ${result.iterations}`;
        }

        if (!clustersEl) {
            return;
        }

        clustersEl.innerHTML = "";

        for (let clusterIndex = 0; clusterIndex < result.communities.length; clusterIndex++) {
            const color = CLUSTER_COLORS[clusterIndex % CLUSTER_COLORS.length];
            for (const nodeId of result.communities[clusterIndex]) {
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
                clustersEl.appendChild(badge);
            }
        }
    }

    /**
     * Apply cluster coloring.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        // Create node to cluster mapping
        const nodeToCluster = new Map<string, number>();
        for (let i = 0; i < result.communities.length; i++) {
            for (const nodeId of result.communities[i]) {
                nodeToCluster.set(String(nodeId), i);
            }
        }

        // Apply colors to nodes
        const nodes = svg.querySelectorAll("[data-node-id]");
        nodes.forEach((node) => {
            const nodeId = node.getAttribute("data-node-id") ?? "0";
            const clusterIndex = nodeToCluster.get(nodeId) ?? 0;
            const color = CLUSTER_COLORS[clusterIndex % CLUSTER_COLORS.length];
            (node as SVGCircleElement).setAttribute("fill", color);
        });

        // Apply colors to edges
        const edges = svg.querySelectorAll("[data-source]");
        edges.forEach((edge) => {
            const source = edge.getAttribute("data-source") ?? "0";
            const target = edge.getAttribute("data-target") ?? "0";
            const sourceCluster = nodeToCluster.get(source) ?? 0;
            const targetCluster = nodeToCluster.get(target) ?? 0;

            if (sourceCluster === targetCluster) {
                const color = CLUSTER_COLORS[sourceCluster % CLUSTER_COLORS.length];
                (edge as SVGLineElement).setAttribute("stroke", color);
            } else {
                (edge as SVGLineElement).setAttribute("stroke", "#94a3b8");
            }
        });

        updateLegend();
        updateClustersDisplay();
        updateStatus(statusPanel, `Found ${result.communities.length} clusters in ${result.iterations} iterations`);
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

        const iterationsEl = infoPanel.querySelector("[data-iterations]");
        if (iterationsEl) {
            iterationsEl.textContent = "Iterations: —";
        }

        const clustersEl = infoPanel.querySelector("[data-clusters]");
        if (clustersEl) {
            clustersEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Not computed yet</span>';
        }

        updateStatus(statusPanel, "Click 'Compute Clusters' to run Markov clustering");
    }

    // Initialize display
    const clustersEl = infoPanel.querySelector("[data-clusters]");
    if (clustersEl) {
        clustersEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Not computed yet</span>';
    }

    // Add controls
    const controls = createSimpleAnimationControls(apply, reset, "Compute Clusters");
    container.appendChild(controls);

    return container;
}

const meta: Meta<MCLArgs> = {
    title: "Clustering",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 6, max: 15, step: 1 },
            description: "Number of nodes in the graph",
        },
        graphType: {
            control: { type: "select" },
            options: ["clusters", "random", "grid"] as GraphType[],
            description: "Type of graph to generate",
        },
        inflation: {
            control: { type: "range", min: 1.2, max: 4, step: 0.2 },
            description: "Inflation parameter (higher = more clusters)",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        nodeCount: 12,
        graphType: "clusters",
        inflation: 2.0,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<MCLArgs>;

/**
 * MCL (Markov Clustering) story with before/after visualization.
 *
 * This story uses the actual `markovClustering()` function from @graphty/algorithms.
 * Nodes are colored by their cluster membership.
 */
export const MCL: Story = {
    render: (args) => createMCLStory(args),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        const computeButton = canvas.getByRole("button", { name: /compute clusters/i });
        await userEvent.click(computeButton);

        await waitFor(
            async () => {
                const statusText = canvasElement.querySelector("[data-status]")?.textContent ?? "";
                await expect(statusText).toContain("clusters");
            },
            { timeout: 5000 },
        );
    },
};
