/**
 * Degree Centrality Algorithm Stories
 *
 * Demonstrates degree centrality with a before/after heat map visualization.
 * Shows how node importance is determined by the number of connections.
 *
 * IMPORTANT: This story uses the actual degreeCentrality implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { degreeCentrality, Graph } from "@graphty/algorithms";
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
interface DegreeArgs {
    nodeCount: number;
    graphType: GraphType;
    normalized: boolean;
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
 * Create the Degree centrality visualization story.
 */
function createDegreeStory(args: DegreeArgs): HTMLElement {
    const { nodeCount, graphType, normalized, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);
    const graph = toAlgorithmGraph(generatedGraph);

    // Calculate degree centrality using actual algorithm
    const scores = degreeCentrality(graph, { normalized });

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph (initial state - uniform coloring)
    renderGraph(svg, generatedGraph);

    // Create legend
    const legend = createHeatMapLegend("Degree Centrality", "Low", "High");
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
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">Degree Centrality Scores</div>
        <div data-scores style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
    `;
    container.appendChild(scoresPanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Click 'Calculate' to compute degree centrality");

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
            badge.textContent = `${nodeId}: ${score.toFixed(2)}`;
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
        updateStatus(statusPanel, "Degree centrality computed! Node size and color show importance.");
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

        updateStatus(statusPanel, "Click 'Calculate' to compute degree centrality");
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

const meta: Meta<DegreeArgs> = {
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
        normalized: {
            control: { type: "boolean" },
            description: "Normalize centrality values",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        nodeCount: 8,
        graphType: "random",
        normalized: true,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<DegreeArgs>;

/**
 * Degree centrality story with before/after visualization.
 *
 * This story uses the actual `degreeCentrality()` function from @graphty/algorithms.
 * Nodes are colored and sized based on their degree (number of connections).
 */
export const Degree: Story = {
    render: (args) => createDegreeStory(args),
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
