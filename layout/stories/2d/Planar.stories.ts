/**
 * Planar Layout Algorithm Story
 *
 * Demonstrates planar layout where nodes are positioned without edge crossings.
 * Shows animation from random initial positions to final planar positions.
 *
 * IMPORTANT: This story uses the actual planarLayout implementation
 * from @graphty/layout to demonstrate real package behavior.
 */

import { planarLayout } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import {
    generateGraph,
    generateRandomPositions,
    type GraphType,
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
interface PlanarArgs {
    nodeCount: number;
    graphType: GraphType;
    scale: number;
    seed: number;
}

/**
 * Create the Planar layout visualization story.
 */
function createPlanarStory(args: PlanarArgs): HTMLElement {
    const { nodeCount, graphType, scale, seed } = args;

    // Generate graph - use tree or path for planar graphs
    // Complete graphs with >4 nodes are not planar
    const safeGraphType =
        graphType === "complete" && nodeCount > 4 ? "tree" : graphType;
    const generatedGraph = generateGraph(safeGraphType, nodeCount, seed);
    const layoutGraph = toLayoutGraph(generatedGraph);

    // Generate initial random positions
    const randomPositions = generateRandomPositions(generatedGraph, 500, 500, seed);

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph with random initial positions
    renderGraph(svg, generatedGraph, randomPositions, 20, 1, 0, 0);

    // Create info panel
    const infoPanel = createInfoPanel("Planar Layout");
    container.appendChild(infoPanel);
    updateInfoPanel(
        infoPanel,
        `Positions nodes to avoid edge crossings with scale ${scale}.`,
    );

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Showing random initial positions. Click 'Apply Layout' to see planar arrangement.");

    let isApplied = false;
    let finalPositions: ReturnType<typeof planarLayout> | null = null;

    // Try to compute the planar layout
    try {
        finalPositions = planarLayout(layoutGraph, scale, [0, 0], 2, seed);
    } catch {
        updateStatus(statusPanel, "Graph is not planar - cannot apply planar layout.");
    }

    /**
     * Apply planar layout with animation.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }

        if (!finalPositions) {
            updateStatus(statusPanel, "Graph is not planar - cannot apply planar layout.");
            return;
        }

        isApplied = true;

        // Animate to final positions
        updatePositions(svg, generatedGraph, finalPositions, 200, 250, 250);
        updateStatus(statusPanel, "Planar layout applied! No edge crossings in this arrangement.");
    }

    /**
     * Reset to random positions.
     */
    function reset(): void {
        isApplied = false;

        // Reset to random positions
        renderGraph(svg, generatedGraph, randomPositions, 20, 1, 0, 0);
        updateStatus(statusPanel, "Reset to random positions. Click 'Apply Layout' to see planar arrangement.");
    }

    // Add controls
    const controls = createAnimationControls(apply, reset);
    container.appendChild(controls);

    return container;
}

const meta: Meta<PlanarArgs> = {
    title: "Layout2D",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 4, max: 15, step: 1 },
            description: "Number of nodes in the graph",
        },
        graphType: {
            control: { type: "select" },
            // Using planar-safe graph types - complete graphs >4 nodes are not planar
            options: ["tree", "grid", "cycle", "path", "star"] as GraphType[],
            description: "Type of graph to generate (must be planar)",
        },
        scale: {
            control: { type: "range", min: 0.5, max: 2, step: 0.1 },
            description: "Scale factor for the layout",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        nodeCount: 8,
        graphType: "tree",
        scale: 1,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<PlanarArgs>;

/**
 * Planar layout story - positions nodes without edge crossings.
 *
 * This story uses the actual `planarLayout()` function from @graphty/layout.
 * The play function animates from random positions to the planar arrangement.
 */
export const Planar: Story = {
    render: (args) => createPlanarStory(args),
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
