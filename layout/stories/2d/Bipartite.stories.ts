/**
 * Bipartite Layout Algorithm Story
 *
 * Demonstrates bipartite layout where nodes are positioned in two columns/rows.
 * Shows animation from random initial positions to final bipartite positions.
 *
 * IMPORTANT: This story uses the actual bipartiteLayout implementation
 * from @graphty/layout to demonstrate real package behavior.
 */

import { bipartiteLayout } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import {
    generateGraph,
    generateRandomPositions,
    toLayoutGraph,
} from "../utils/graph-generators.js";
import {
    createAnimationControls,
    createInfoPanel,
    createStatusPanel,
    createStoryContainer,
    renderGraph,
    updateInfoPanel,
    updatePositions,
    updateStatus,
} from "../utils/visualization.js";

/**
 * Story arguments interface.
 */
interface BipartiteArgs {
    nodeCount: number;
    align: "vertical" | "horizontal";
    scale: number;
    aspectRatio: number;
    seed: number;
}

/**
 * Create the Bipartite layout visualization story.
 */
function createBipartiteStory(args: BipartiteArgs): HTMLElement {
    const { nodeCount, align, scale, aspectRatio, seed } = args;

    // Generate bipartite graph
    const generatedGraph = generateGraph("bipartite", nodeCount, seed);
    const layoutGraph = toLayoutGraph(generatedGraph);

    // Generate initial random positions
    const randomPositions = generateRandomPositions(generatedGraph, 500, 500, seed);

    // Create left set (first half of nodes)
    const leftSet = generatedGraph.nodes
        .filter((_, i) => i < Math.ceil(nodeCount / 2))
        .map((n) => n.id);

    // Compute final bipartite layout using actual algorithm
    const finalPositions = bipartiteLayout(
        layoutGraph,
        leftSet,
        align,
        scale,
        [0, 0],
        aspectRatio,
    );

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph with random initial positions
    renderGraph(svg, generatedGraph, randomPositions, 20, 1, 0, 0);

    // Create info panel
    const infoPanel = createInfoPanel("Bipartite Layout");
    container.appendChild(infoPanel);
    updateInfoPanel(
        infoPanel,
        `Positions nodes in two ${align} lines with aspect ratio ${aspectRatio}.`,
    );

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Showing random initial positions. Click 'Apply Layout' to see bipartite arrangement.");

    let isApplied = false;

    /**
     * Apply bipartite layout with animation.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        // Animate to final positions
        updatePositions(svg, generatedGraph, finalPositions, 200, 250, 250);
        updateStatus(statusPanel, "Bipartite layout applied! Nodes arranged in two separate groups.");
    }

    /**
     * Reset to random positions.
     */
    function reset(): void {
        isApplied = false;

        // Reset to random positions
        renderGraph(svg, generatedGraph, randomPositions, 20, 1, 0, 0);
        updateStatus(statusPanel, "Reset to random positions. Click 'Apply Layout' to see bipartite arrangement.");
    }

    // Add controls
    const controls = createAnimationControls(apply, reset);
    container.appendChild(controls);

    return container;
}

const meta: Meta<BipartiteArgs> = {
    title: "Layout2D",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 4, max: 20, step: 1 },
            description: "Number of nodes in the graph",
        },
        align: {
            control: { type: "select" },
            options: ["vertical", "horizontal"],
            description: "Alignment of the two node sets",
        },
        scale: {
            control: { type: "range", min: 0.5, max: 2, step: 0.1 },
            description: "Scale factor for the layout",
        },
        aspectRatio: {
            control: { type: "range", min: 0.5, max: 3, step: 0.1 },
            description: "The ratio of the width to the height of the layout",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        nodeCount: 10,
        align: "vertical",
        scale: 1,
        aspectRatio: 1.33,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<BipartiteArgs>;

/**
 * Bipartite layout story - positions nodes in two parallel lines.
 *
 * This story uses the actual `bipartiteLayout()` function from @graphty/layout.
 * The play function animates from random positions to the bipartite arrangement.
 */
export const Bipartite: Story = {
    render: (args) => createBipartiteStory(args),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Click apply button to trigger animation
        const applyButton = canvas.getByRole("button", { name: /apply layout/i });
        await userEvent.click(applyButton);

        // Wait for animation and status update
        await waitFor(
            async () => {
                const statusText = canvasElement.querySelector("[data-status]")?.textContent ?? "";
                await expect(statusText).toContain("applied");
            },
            { timeout: 5000 },
        );
    },
};
