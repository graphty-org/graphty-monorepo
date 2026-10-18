/**
 * K-Core Decomposition Algorithm Stories
 *
 * Demonstrates K-Core decomposition with a before/after visualization.
 * Shows how nodes are colored by their coreness value.
 *
 * IMPORTANT: This story uses the actual kCoreDecomposition implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { kCoreDecomposition } from "@graphty/algorithms";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import { generateGraph, type GraphType } from "../utils/graph-generators.js";
import { byId, toSnapshot } from "../utils/snapshot.js";
import {
    applyHeatMap,
    callSource,
    createCallPanel,
    createHeatMapLegend,
    createSimpleAnimationControls,
    createStatusPanel,
    createStoryContainer,
    renderGraph,
    updateStatus,
} from "../utils/visualization.js";
import { storyWaitOptions } from "../utils/wait.js";

/**
 * Story arguments interface.
 */
interface KCoreArgs {
    nodeCount: number;
    graphType: GraphType;
    seed: number;
}

/**
 * Create the K-Core visualization story.
 */
function createKCoreStory(args: KCoreArgs): HTMLElement {
    const { nodeCount, graphType, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);
    const graph = toSnapshot(generatedGraph);

    // Run K-Core decomposition using actual algorithm
    const result = kCoreDecomposition(graph);

    // Convert coreness map to scores for heat map
    const scores = byId(graph, result.coreness);

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph (initial state - uniform coloring)
    renderGraph(svg, generatedGraph);

    // Create legend
    const legend = createHeatMapLegend("K-Core Number", "Low", "High");
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
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">K-Core Decomposition</div>
        <div data-max-core style="margin-bottom: 8px; color: #475569;">Max core: —</div>
        <div data-scores style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
    `;
    container.appendChild(infoPanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Click 'Compute K-Cores' to analyze graph structure");

    let isApplied = false;

    /**
     * Update scores display.
     */
    function updateScoresDisplay(): void {
        const maxCoreEl = infoPanel.querySelector("[data-max-core]");
        const scoresEl = infoPanel.querySelector("[data-scores]");

        if (maxCoreEl) {
            maxCoreEl.textContent = `Max core: ${result.maxCore}`;
        }

        if (!scoresEl) {
            return;
        }

        scoresEl.innerHTML = "";

        // Sort nodes by coreness descending
        const sortedNodes = Object.entries(scores).sort((a, b) => b[1] - a[1]);

        for (const [nodeId, coreness] of sortedNodes) {
            const badge = document.createElement("span");
            badge.style.cssText = `
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 50px;
                padding: 4px 8px;
                background: #6366f1;
                color: white;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
            `;
            badge.textContent = `${nodeId}: k=${coreness}`;
            scoresEl.appendChild(badge);
        }
    }

    /**
     * Apply K-Core visualization.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        applyHeatMap(svg, scores);
        updateScoresDisplay();
        updateStatus(statusPanel, `K-Core decomposition complete! Max core: ${result.maxCore}`);
    }

    /**
     * Reset visualization.
     */
    function reset(): void {
        isApplied = false;

        const nodes = svg.querySelectorAll("[data-node-id]");
        nodes.forEach((node) => {
            (node as SVGCircleElement).setAttribute("fill", "#6366f1");
            (node as SVGCircleElement).setAttribute("r", "20");
        });

        const maxCoreEl = infoPanel.querySelector("[data-max-core]");
        if (maxCoreEl) {
            maxCoreEl.textContent = "Max core: —";
        }

        const scoresEl = infoPanel.querySelector("[data-scores]");
        if (scoresEl) {
            scoresEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Not computed yet</span>';
        }

        updateStatus(statusPanel, "Click 'Compute K-Cores' to analyze graph structure");
    }

    // Initialize display
    const scoresEl = infoPanel.querySelector("[data-scores]");
    if (scoresEl) {
        scoresEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Not computed yet</span>';
    }

    // Add controls
    const controls = createSimpleAnimationControls(apply, reset, "Compute K-Cores");
    container.appendChild(controls);

    container.appendChild(createCallPanel(callCode()));

    return container;
}

/**
 * The consumer code this story runs, shown in the call panel and the Code panel.
 * @returns The code
 */
function callCode(): string {
    return `import { kCoreDecomposition } from "@graphty/algorithms";

const { coreness, maxCore } = kCoreDecomposition(snapshot);
// coreness: Uint32Array, coreness[i] is the coreness of node index i
// cores() lists the node indices of each core`;
}

const meta: Meta<KCoreArgs> = {
    title: "Communities",
    // The component id before the move, so every story id (and its baseline) stays the same
    id: "clustering",
    parameters: {
        docs: {
            description: {
                component:
                    "K-core decomposition finds the dense cores of a graph: a node's coreness is the largest k for which it sits in a part of the graph where every node has at least k neighbors. Press Compute k-cores to color and size each node by its coreness. The graph is generated in the story from a seed; the graph type, size and seed are controls.",
            },
        },
    },
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 6, max: 15, step: 1 },
            description: "Number of nodes in the graph",
        },
        graphType: {
            control: { type: "select" },
            options: ["random", "grid", "complete", "star"] as GraphType[],
            description: "Type of graph to generate",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        nodeCount: 10,
        graphType: "random",
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<KCoreArgs>;

/**
 * K-Core decomposition story with before/after visualization.
 *
 * This story uses the actual `kCoreDecomposition()` function from @graphty/algorithms.
 * Nodes are sized and colored by their coreness value.
 */
export const KCore: Story = {
    name: "K-core (dense cores)",
    parameters: callSource(callCode()),
    render: (args) => createKCoreStory(args),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        const computeButton = canvas.getByRole("button", { name: /compute k-cores/i });
        await userEvent.click(computeButton);

        await waitFor(async () => {
            const statusText = canvasElement.querySelector("[data-status]")?.textContent ?? "";
            await expect(statusText).toContain("complete");
        }, storyWaitOptions(5000));
    },
};
