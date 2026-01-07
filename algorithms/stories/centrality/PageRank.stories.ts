/**
 * PageRank Algorithm Stories
 *
 * Demonstrates PageRank centrality with a before/after heat map visualization.
 * Shows how node importance is determined by the structure of incoming links.
 *
 * IMPORTANT: This story uses the actual pageRank implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { Graph, pageRank } from "@graphty/algorithms";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import {
    type GeneratedGraph,
    generateGraph,
    type GraphType,
} from "../utils/graph-generators.js";
import {
    applyHeatMap,
    createHeatMapLegend,
    createSimpleAnimationControls,
    createStatusPanel,
    createStoryContainer,
    renderGraph,
    updateStatus,
} from "../utils/visualization.js";

/**
 * Story arguments interface.
 */
interface PageRankArgs {
    nodeCount: number;
    graphType: GraphType;
    dampingFactor: number;
    maxIterations: number;
    seed: number;
}

/**
 * Convert GeneratedGraph to @graphty/algorithms directed Graph.
 * PageRank requires a directed graph.
 */
function toDirectedGraph(generatedGraph: GeneratedGraph): Graph {
    const graph = new Graph({ directed: true });

    for (const node of generatedGraph.nodes) {
        graph.addNode(node.id);
    }

    // Create directed edges (use original edge direction and add reverse for some)
    for (const edge of generatedGraph.edges) {
        graph.addEdge(edge.source, edge.target);
        // Add some reverse edges based on source < target to create asymmetry
        if (edge.source > edge.target) {
            graph.addEdge(edge.target, edge.source);
        }
    }

    return graph;
}

/**
 * Create the PageRank visualization story.
 */
function createPageRankStory(args: PageRankArgs): HTMLElement {
    const { nodeCount, graphType, dampingFactor, maxIterations, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);
    const graph = toDirectedGraph(generatedGraph);

    // Calculate PageRank using actual algorithm
    const result = pageRank(graph, {
        dampingFactor,
        maxIterations,
        useDelta: false, // Use standard algorithm for smaller graphs
    });

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph (initial state - uniform coloring)
    renderGraph(svg, generatedGraph);

    // Create legend
    const legend = createHeatMapLegend("PageRank Score", "Low", "High");
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
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">
            PageRank Scores (damping: ${dampingFactor}, iterations: ${result.iterations})
        </div>
        <div data-scores style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
    `;
    container.appendChild(infoPanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Click 'Calculate' to compute PageRank");

    let isApplied = false;

    /**
     * Update scores display.
     */
    function updateScoresDisplay(): void {
        const scoresEl = infoPanel.querySelector("[data-scores]");
        if (!scoresEl) {return;}

        scoresEl.innerHTML = "";

        // Sort nodes by score descending
        const sortedNodes = Object.entries(result.ranks).sort((a, b) => b[1] - a[1]);

        for (const [nodeId, score] of sortedNodes) {
            const badge = document.createElement("span");
            badge.style.cssText = `
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 60px;
                padding: 4px 8px;
                background: #6366f1;
                color: white;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
            `;
            badge.textContent = `${nodeId}: ${score.toFixed(3)}`;
            scoresEl.appendChild(badge);
        }
    }

    /**
     * Apply centrality visualization.
     */
    function apply(): void {
        if (isApplied) {return;}
        isApplied = true;

        // Apply heat map coloring
        applyHeatMap(svg, result.ranks);
        updateScoresDisplay();
        updateStatus(
            statusPanel,
            `PageRank computed in ${result.iterations} iterations. ${result.converged ? "Converged!" : "Did not converge."}`,
        );
    }

    /**
     * Reset visualization.
     */
    function reset(): void {
        isApplied = false;

        // Reset node colors and sizes
        const nodes = svg.querySelectorAll("[data-node-id]");
        nodes.forEach((node) => {
            (node as SVGCircleElement).setAttribute("fill", "#6366f1");
            (node as SVGCircleElement).setAttribute("r", "20");
        });

        // Clear scores display
        const scoresEl = infoPanel.querySelector("[data-scores]");
        if (scoresEl) {
            scoresEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Not computed yet</span>';
        }

        updateStatus(statusPanel, "Click 'Calculate' to compute PageRank");
    }

    // Initialize scores display
    const scoresEl = infoPanel.querySelector("[data-scores]");
    if (scoresEl) {
        scoresEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Not computed yet</span>';
    }

    // Add controls
    const controls = createSimpleAnimationControls(apply, reset, "Calculate");
    container.appendChild(controls);

    return container;
}

const meta: Meta<PageRankArgs> = {
    title: "Centrality",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 4, max: 15, step: 1 },
            description: "Number of nodes in the graph",
        },
        graphType: {
            control: { type: "select" },
            options: ["tree", "random", "grid", "cycle", "star", "path"] as GraphType[],
            description: "Type of graph to generate",
        },
        dampingFactor: {
            control: { type: "range", min: 0.1, max: 0.99, step: 0.05 },
            description: "Damping factor (probability of following a link)",
        },
        maxIterations: {
            control: { type: "range", min: 10, max: 200, step: 10 },
            description: "Maximum iterations for convergence",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        nodeCount: 8,
        graphType: "random",
        dampingFactor: 0.85,
        maxIterations: 100,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<PageRankArgs>;

/**
 * PageRank story with before/after visualization.
 *
 * This story uses the actual `pageRank()` function from @graphty/algorithms.
 * Nodes are colored and sized based on their PageRank score.
 */
export const PageRank: Story = {
    render: (args) => createPageRankStory(args),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Click calculate button to apply centrality
        const calcButton = canvas.getByRole("button", { name: /calculate/i });
        await userEvent.click(calcButton);

        // Wait for status to update
        await waitFor(
            async () => {
                const statusText = canvasElement.querySelector("[data-status]")?.textContent ?? "";
                await expect(statusText).toContain("computed");
            },
            { timeout: 5000 },
        );
    },
};
