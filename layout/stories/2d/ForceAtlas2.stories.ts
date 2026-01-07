/**
 * ForceAtlas2 Layout Algorithm Story
 *
 * Demonstrates ForceAtlas2 force-directed layout algorithm.
 * Shows animation from random initial positions to final optimized positions.
 *
 * IMPORTANT: This story uses the actual forceatlas2Layout implementation
 * from @graphty/layout to demonstrate real package behavior.
 */

import { forceatlas2Layout } from "@graphty/layout";
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
interface ForceAtlas2Args {
    nodeCount: number;
    graphType: GraphType;
    iterations: number;
    gravity: number;
    scalingRatio: number;
    seed: number;
}

/**
 * Create the ForceAtlas2 layout visualization story.
 */
function createForceAtlas2Story(args: ForceAtlas2Args): HTMLElement {
    const { nodeCount, graphType, iterations, gravity, scalingRatio, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);
    const layoutGraph = toLayoutGraph(generatedGraph);

    // Generate initial random positions
    const randomPositions = generateRandomPositions(generatedGraph, 500, 500, seed);

    // Compute final ForceAtlas2 layout using actual algorithm
    const finalPositions = forceatlas2Layout(
        layoutGraph,
        null, // pos
        iterations, // maxIter
        1.0, // jitterTolerance
        scalingRatio, // scalingRatio
        gravity, // gravity
        false, // distributedAction
        false, // strongGravity
        null, // nodeMass
        null, // nodeSize
        null, // weight
        false, // dissuadeHubs
        false, // linlog
        seed, // seed
        2, // dim
    );

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph with random initial positions
    renderGraph(svg, generatedGraph, randomPositions, 20, 1, 0, 0);

    // Create info panel
    const infoPanel = createInfoPanel("ForceAtlas2 Layout");
    container.appendChild(infoPanel);
    updateInfoPanel(
        infoPanel,
        `${iterations} iterations, gravity ${gravity}, scaling ${scalingRatio}.`,
    );

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Showing random initial positions. Click 'Apply Layout' to see optimized arrangement.");

    let isApplied = false;

    /**
     * Apply ForceAtlas2 layout with animation.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        // Animate to final positions
        updatePositions(svg, generatedGraph, finalPositions, 200, 250, 250);
        updateStatus(statusPanel, "ForceAtlas2 layout applied! Continuous graph layout algorithm.");
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

const meta: Meta<ForceAtlas2Args> = {
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
            description: "Maximum number of iterations",
        },
        gravity: {
            control: { type: "range", min: 0.1, max: 5, step: 0.1 },
            description: "Gravity strength",
        },
        scalingRatio: {
            control: { type: "range", min: 0.5, max: 5, step: 0.1 },
            description: "Scaling of forces",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        nodeCount: 10,
        graphType: "random",
        iterations: 100,
        gravity: 1,
        scalingRatio: 2,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<ForceAtlas2Args>;

/**
 * ForceAtlas2 layout story - continuous graph layout algorithm.
 *
 * This story uses the actual `forceatlas2Layout()` function from @graphty/layout.
 * The play function animates from random positions to the optimized arrangement.
 */
export const ForceAtlas2: Story = {
    render: (args) => createForceAtlas2Story(args),
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
