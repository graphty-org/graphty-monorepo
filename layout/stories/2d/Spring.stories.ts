/**
 * Spring Layout Algorithm Story (Fruchterman-Reingold)
 *
 * Demonstrates spring layout using force-directed Fruchterman-Reingold algorithm.
 * Shows animation from random initial positions to final optimized positions.
 *
 * IMPORTANT: This story uses the actual springLayout implementation
 * from @graphty/layout to demonstrate real package behavior.
 */

import { springLayout } from "@graphty/layout";
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
interface SpringArgs {
    nodeCount: number;
    graphType: GraphType;
    iterations: number;
    scale: number;
    seed: number;
}

/**
 * Create the Spring layout visualization story.
 */
function createSpringStory(args: SpringArgs): HTMLElement {
    const { nodeCount, graphType, iterations, scale, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);
    const layoutGraph = toLayoutGraph(generatedGraph);

    // Generate initial random positions
    const randomPositions = generateRandomPositions(generatedGraph, 500, 500, seed);

    // Compute final spring layout using actual algorithm
    const finalPositions = springLayout(
        layoutGraph,
        null, // k - optimal distance (auto-calculated)
        null, // pos - initial positions
        null, // fixed nodes
        iterations, // iterations
        scale, // scale
        [0, 0], // center
        2, // dim
        seed, // seed
    );

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph with random initial positions
    renderGraph(svg, generatedGraph, randomPositions, 20, 1, 0, 0);

    // Create info panel
    const infoPanel = createInfoPanel("Spring Layout (Fruchterman-Reingold)");
    container.appendChild(infoPanel);
    updateInfoPanel(
        infoPanel,
        `Force-directed layout with ${iterations} iterations and scale ${scale}.`,
    );

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Showing random initial positions. Click 'Apply Layout' to see optimized arrangement.");

    let isApplied = false;

    /**
     * Apply spring layout with animation.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        // Animate to final positions
        updatePositions(svg, generatedGraph, finalPositions, 200, 250, 250);
        updateStatus(statusPanel, "Spring layout applied! Nodes positioned using force-directed algorithm.");
    }

    /**
     * Reset to random positions.
     */
    function reset(): void {
        isApplied = false;

        // Reset to random positions
        renderGraph(svg, generatedGraph, randomPositions, 20, 1, 0, 0);
        updateStatus(statusPanel, "Reset to random positions. Click 'Apply Layout' to see optimized arrangement.");
    }

    // Add controls
    const controls = createAnimationControls(apply, reset);
    container.appendChild(controls);

    return container;
}

const meta: Meta<SpringArgs> = {
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
        iterations: {
            control: { type: "range", min: 10, max: 200, step: 10 },
            description: "Number of iterations for force simulation",
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
        nodeCount: 10,
        graphType: "random",
        iterations: 50,
        scale: 1,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<SpringArgs>;

/**
 * Spring layout story - force-directed Fruchterman-Reingold algorithm.
 *
 * This story uses the actual `springLayout()` function from @graphty/layout.
 * The play function animates from random positions to the optimized arrangement.
 */
export const Spring: Story = {
    render: (args) => createSpringStory(args),
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
