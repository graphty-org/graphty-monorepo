/**
 * Random Layout Algorithm Story
 *
 * Demonstrates random layout where nodes are placed uniformly at random.
 * Unlike other layout stories, this one does not have a before/after animation
 * since the result is already random.
 *
 * IMPORTANT: This story uses the actual randomLayout implementation
 * from @graphty/layout to demonstrate real package behavior.
 */

import { randomLayout } from "@graphty/layout";
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
    updateStatus,
} from "../utils/visualization.js";

/**
 * Story arguments interface.
 */
interface RandomArgs {
    nodeCount: number;
    graphType: GraphType;
    seed: number;
}

/**
 * Create the Random layout visualization story.
 */
function createRandomStory(args: RandomArgs): HTMLElement {
    const { nodeCount, graphType, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);
    const layoutGraph = toLayoutGraph(generatedGraph);

    // Generate initial random positions
    const initialPositions = generateRandomPositions(generatedGraph, 500, 500, seed);

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph with initial positions
    renderGraph(svg, generatedGraph, initialPositions, 20, 1, 0, 0);

    // Create info panel
    const infoPanel = createInfoPanel("Layout Algorithm");
    container.appendChild(infoPanel);
    updateInfoPanel(infoPanel, "Random layout places nodes uniformly at random.");

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Showing random layout. Click 'Randomize' for new positions.");

    /**
     * Apply new random layout.
     */
    function apply(): void {
        // Use the actual randomLayout function from @graphty/layout
        const newSeed = Math.floor(Math.random() * 100000);
        const positions = randomLayout(layoutGraph, [0, 0], 2, newSeed);

        // Update visualization
        renderGraph(svg, generatedGraph, positions, 20, 200, 250, 250);
        updateStatus(statusPanel, `Random layout applied with seed ${newSeed}`);
    }

    /**
     * Reset to initial layout.
     */
    function reset(): void {
        // Re-apply the original random layout with the story seed
        const positions = randomLayout(layoutGraph, [0, 0], 2, seed);
        renderGraph(svg, generatedGraph, positions, 20, 200, 250, 250);
        updateStatus(statusPanel, "Reset to initial random layout");
    }

    // Apply initial layout using the actual algorithm
    const positions = randomLayout(layoutGraph, [0, 0], 2, seed);
    renderGraph(svg, generatedGraph, positions, 20, 200, 250, 250);

    // Add controls
    const controls = createAnimationControls(apply, reset, "Randomize");
    container.appendChild(controls);

    return container;
}

const meta: Meta<RandomArgs> = {
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

type Story = StoryObj<RandomArgs>;

/**
 * Random layout story - places nodes uniformly at random.
 *
 * This story uses the actual `randomLayout()` function from @graphty/layout.
 * Unlike other layout stories, this shows random positions directly.
 */
export const Random: Story = {
    render: (args) => createRandomStory(args),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Click randomize button to apply new random layout
        const randomizeButton = canvas.getByRole("button", { name: /randomize/i });
        await userEvent.click(randomizeButton);

        // Wait for status to update
        await waitFor(
            async () => {
                const statusText = canvasElement.querySelector("[data-status]")?.textContent ?? "";
                await expect(statusText).toContain("applied");
            },
            { timeout: 5000 },
        );
    },
};
