/**
 * Spiral Layout Algorithm Story
 *
 * Demonstrates spiral layout where nodes are positioned along a spiral path.
 * Shows animation from random initial positions to final spiral positions.
 *
 * IMPORTANT: This story uses the actual spiralLayout implementation
 * from @graphty/layout to demonstrate real package behavior.
 */

import { spiralLayout } from "@graphty/layout";
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
interface SpiralArgs {
    nodeCount: number;
    graphType: GraphType;
    scale: number;
    resolution: number;
    equidistant: boolean;
    seed: number;
}

/**
 * Create the Spiral layout visualization story.
 */
function createSpiralStory(args: SpiralArgs): HTMLElement {
    const { nodeCount, graphType, scale, resolution, equidistant, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);
    const layoutGraph = toLayoutGraph(generatedGraph);

    // Generate initial random positions
    const randomPositions = generateRandomPositions(generatedGraph, 500, 500, seed);

    // Compute final spiral layout using actual algorithm
    const finalPositions = spiralLayout(
        layoutGraph,
        scale,
        [0, 0],
        2,
        resolution,
        equidistant,
    );

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph with random initial positions
    renderGraph(svg, generatedGraph, randomPositions, 20, 1, 0, 0);

    // Create info panel
    const infoPanel = createInfoPanel("Spiral Layout");
    container.appendChild(infoPanel);
    updateInfoPanel(
        infoPanel,
        `Positions nodes along a spiral with resolution ${resolution}, equidistant: ${equidistant}.`,
    );

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Showing random initial positions. Click 'Apply Layout' to see spiral arrangement.");

    let isApplied = false;

    /**
     * Apply spiral layout with animation.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        // Animate to final positions
        updatePositions(svg, generatedGraph, finalPositions, 200, 250, 250);
        updateStatus(statusPanel, "Spiral layout applied! Nodes arranged along a spiral path.");
    }

    /**
     * Reset to random positions.
     */
    function reset(): void {
        isApplied = false;

        // Reset to random positions
        renderGraph(svg, generatedGraph, randomPositions, 20, 1, 0, 0);
        updateStatus(statusPanel, "Reset to random positions. Click 'Apply Layout' to see spiral arrangement.");
    }

    // Add controls
    const controls = createAnimationControls(apply, reset);
    container.appendChild(controls);

    return container;
}

const meta: Meta<SpiralArgs> = {
    title: "Layout2D",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 4, max: 20, step: 1 },
            description: "Number of nodes in the graph",
        },
        graphType: {
            control: { type: "select" },
            options: [
                "tree",
                "random",
                "grid",
                "cycle",
                "complete",
                "star",
                "path",
            ] as GraphType[],
            description: "Type of graph to generate",
        },
        scale: {
            control: { type: "range", min: 0.5, max: 2, step: 0.1 },
            description: "Scale factor for the layout",
        },
        resolution: {
            control: { type: "range", min: 0.1, max: 1, step: 0.05 },
            description: "Controls the spacing between spiral elements",
        },
        equidistant: {
            control: { type: "boolean" },
            description: "Whether to place nodes equidistant from each other",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        nodeCount: 12,
        graphType: "path",
        scale: 1,
        resolution: 0.35,
        equidistant: false,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<SpiralArgs>;

/**
 * Spiral layout story - positions nodes along a spiral path.
 *
 * This story uses the actual `spiralLayout()` function from @graphty/layout.
 * The play function animates from random positions to the spiral arrangement.
 */
export const Spiral: Story = {
    render: (args) => createSpiralStory(args),
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
