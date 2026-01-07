/**
 * Katz Centrality Algorithm Stories
 *
 * Demonstrates Katz centrality with a before/after heat map visualization.
 * Shows how node importance is determined by neighbors plus a base centrality.
 *
 * IMPORTANT: This story uses the actual katzCentrality implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { Graph, katzCentrality } from "@graphty/algorithms";
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
interface KatzArgs {
    nodeCount: number;
    graphType: GraphType;
    alpha: number;
    beta: number;
    maxIterations: number;
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
        graph.addEdge(edge.source, edge.target);
    }

    return graph;
}

/**
 * Create the Katz centrality visualization story.
 */
function createKatzStory(args: KatzArgs): HTMLElement {
    const { nodeCount, graphType, alpha, beta, maxIterations, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);
    const graph = toAlgorithmGraph(generatedGraph);

    // Calculate Katz centrality using actual algorithm
    const scores = katzCentrality(graph, { alpha, beta, maxIterations, normalized: true });

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph (initial state - uniform coloring)
    renderGraph(svg, generatedGraph);

    // Create legend
    const legend = createHeatMapLegend("Katz Centrality", "Low", "High");
    container.appendChild(legend);

    // Create scores panel
    const scoresPanel = document.createElement("div");
    scoresPanel.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background: #f1f5f9;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
    `;
    scoresPanel.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">Katz Centrality Scores (α=${alpha}, β=${beta})</div>
        <div data-scores style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
    `;
    container.appendChild(scoresPanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Click 'Calculate' to compute Katz centrality");

    let isApplied = false;

    /**
     * Update scores display.
     */
    function updateScoresDisplay(): void {
        const scoresEl = scoresPanel.querySelector("[data-scores]");
        if (!scoresEl) {return;}

        scoresEl.innerHTML = "";

        // Sort nodes by score descending
        const sortedNodes = Object.entries(scores).sort((a, b) => b[1] - a[1]);

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
        applyHeatMap(svg, scores);
        updateScoresDisplay();
        updateStatus(statusPanel, "Katz centrality computed! Combines neighbor influence with base centrality.");
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
        const scoresEl = scoresPanel.querySelector("[data-scores]");
        if (scoresEl) {
            scoresEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Not computed yet</span>';
        }

        updateStatus(statusPanel, "Click 'Calculate' to compute Katz centrality");
    }

    // Initialize scores display
    const scoresEl = scoresPanel.querySelector("[data-scores]");
    if (scoresEl) {
        scoresEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Not computed yet</span>';
    }

    // Add controls
    const controls = createSimpleAnimationControls(apply, reset, "Calculate");
    container.appendChild(controls);

    return container;
}

const meta: Meta<KatzArgs> = {
    title: "Centrality",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 4, max: 15, step: 1 },
            description: "Number of nodes in the graph",
        },
        graphType: {
            control: { type: "select" },
            options: ["tree", "random", "grid", "cycle", "complete", "star", "path"] as GraphType[],
            description: "Type of graph to generate",
        },
        alpha: {
            control: { type: "range", min: 0.01, max: 0.5, step: 0.01 },
            description: "Attenuation factor (controls neighbor influence)",
        },
        beta: {
            control: { type: "range", min: 0.1, max: 2.0, step: 0.1 },
            description: "Base centrality weight",
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
        alpha: 0.1,
        beta: 1.0,
        maxIterations: 100,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<KatzArgs>;

/**
 * Katz centrality story with before/after visualization.
 *
 * This story uses the actual `katzCentrality()` function from @graphty/algorithms.
 * Nodes are colored and sized based on neighbor influence plus base centrality.
 */
export const Katz: Story = {
    render: (args) => createKatzStory(args),
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
