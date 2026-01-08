/**
 * Spectral Layout Algorithm Story
 *
 * Demonstrates spectral layout using eigenvectors of the graph Laplacian.
 * Shows animation from random initial positions to final spectral positions.
 *
 * IMPORTANT: This story uses the actual spectralLayout implementation
 * from @graphty/layout to demonstrate real package behavior.
 */

import { spectralLayout } from "@graphty/layout";
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
interface SpectralArgs {
    nodeCount: number;
    graphType: GraphType;
    scale: number;
    seed: number;
}

/**
 * Create the Spectral layout visualization story.
 */
function createSpectralStory(args: SpectralArgs): HTMLElement {
    const { nodeCount, graphType, scale, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);
    const layoutGraph = toLayoutGraph(generatedGraph);

    // Generate initial random positions
    const randomPositions = generateRandomPositions(generatedGraph, 500, 500, seed);

    // Compute final spectral layout using actual algorithm
    const finalPositions = spectralLayout(layoutGraph, scale, [0, 0], 2, seed);

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph with random initial positions
    renderGraph(svg, generatedGraph, randomPositions, 20, 1, 0, 0);

    // Create info panel
    const infoPanel = createInfoPanel("Spectral Layout");
    container.appendChild(infoPanel);
    updateInfoPanel(
        infoPanel,
        `Uses eigenvectors of the graph Laplacian with scale ${scale}.`,
    );

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Showing random initial positions. Click 'Apply Layout' to see spectral arrangement.");

    let isApplied = false;

    /**
     * Apply spectral layout with animation.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        // Animate to final positions
        updatePositions(svg, generatedGraph, finalPositions, 200, 250, 250);
        updateStatus(statusPanel, "Spectral layout applied! Nodes positioned using graph Laplacian eigenvectors.");
    }

    /**
     * Reset to random positions.
     */
    function reset(): void {
        isApplied = false;

        // Reset to random positions
        renderGraph(svg, generatedGraph, randomPositions, 20, 1, 0, 0);
        updateStatus(statusPanel, "Reset to random positions. Click 'Apply Layout' to see spectral arrangement.");
    }

    // Add controls
    const controls = createAnimationControls(apply, reset);
    container.appendChild(controls);

    return container;
}

const meta: Meta<SpectralArgs> = {
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
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        nodeCount: 10,
        graphType: "random",
        scale: 1,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<SpectralArgs>;

/**
 * Spectral layout story - positions nodes using eigenvectors of the Laplacian.
 *
 * This story uses the actual `spectralLayout()` function from @graphty/layout.
 * The play function animates from random positions to the spectral arrangement.
 */
export const Spectral: Story = {
    render: (args) => createSpectralStory(args),
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
