/**
 * ARF Layout Algorithm Story
 *
 * Demonstrates ARF (Attractive and Repulsive Forces) layout algorithm.
 * Shows animation from random initial positions to final optimized positions.
 *
 * IMPORTANT: This story uses the actual arfLayout implementation
 * from @graphty/layout to demonstrate real package behavior.
 */

import { arfLayout } from "@graphty/layout";
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
interface ARFArgs {
    nodeCount: number;
    graphType: GraphType;
    scaling: number;
    springStrength: number;
    iterations: number;
    seed: number;
}

/**
 * Create the ARF layout visualization story.
 */
function createARFStory(args: ARFArgs): HTMLElement {
    const { nodeCount, graphType, scaling, springStrength, iterations, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);
    const layoutGraph = toLayoutGraph(generatedGraph);

    // Generate initial random positions
    const randomPositions = generateRandomPositions(generatedGraph, 500, 500, seed);

    // Compute final ARF layout using actual algorithm
    const finalPositions = arfLayout(
        layoutGraph,
        null, // pos
        scaling, // scaling
        springStrength, // a (spring strength, must be > 1)
        iterations, // maxIter
        seed, // seed
    );

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph with random initial positions
    renderGraph(svg, generatedGraph, randomPositions, 20, 1, 0, 0);

    // Create info panel
    const infoPanel = createInfoPanel("ARF Layout");
    container.appendChild(infoPanel);
    updateInfoPanel(
        infoPanel,
        `Attractive/Repulsive Forces with scaling ${scaling}, spring strength ${springStrength}.`,
    );

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Showing random initial positions. Click 'Apply Layout' to see optimized arrangement.");

    let isApplied = false;

    /**
     * Apply ARF layout with animation.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        // Animate to final positions
        updatePositions(svg, generatedGraph, finalPositions, 200, 250, 250);
        updateStatus(statusPanel, "ARF layout applied! Attractive and repulsive forces balanced.");
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

const meta: Meta<ARFArgs> = {
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
        scaling: {
            control: { type: "range", min: 0.5, max: 3, step: 0.1 },
            description: "Scale factor for positions",
        },
        springStrength: {
            control: { type: "range", min: 1.1, max: 5, step: 0.1 },
            description: "Strength of springs between connected nodes (must be > 1)",
        },
        iterations: {
            control: { type: "range", min: 100, max: 2000, step: 100 },
            description: "Maximum number of iterations",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        nodeCount: 10,
        graphType: "random",
        scaling: 1,
        springStrength: 1.1,
        iterations: 1000,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<ARFArgs>;

/**
 * ARF layout story - attractive and repulsive forces.
 *
 * This story uses the actual `arfLayout()` function from @graphty/layout.
 * The play function animates from random positions to the optimized arrangement.
 */
export const ARF: Story = {
    render: (args) => createARFStory(args),
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
