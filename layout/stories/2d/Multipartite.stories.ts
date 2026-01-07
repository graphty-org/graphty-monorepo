/**
 * Multipartite Layout Algorithm Story
 *
 * Demonstrates multipartite layout where nodes are positioned in multiple layers/columns.
 * Shows animation from random initial positions to final multipartite positions.
 *
 * IMPORTANT: This story uses the actual multipartiteLayout implementation
 * from @graphty/layout to demonstrate real package behavior.
 */

import { multipartiteLayout } from "@graphty/layout";
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
interface MultipartiteArgs {
    nodeCount: number;
    layers: number;
    align: "vertical" | "horizontal";
    scale: number;
    seed: number;
}

/**
 * Create layer mappings for the multipartite layout.
 */
function createLayerMappings(nodeCount: number, layerCount: number): Record<number, number[]> {
    const layers: Record<number, number[]> = {};
    const nodesPerLayer = Math.ceil(nodeCount / layerCount);

    for (let i = 0; i < layerCount; i++) {
        layers[i] = [];
    }

    for (let nodeId = 0; nodeId < nodeCount; nodeId++) {
        const layerIdx = Math.floor(nodeId / nodesPerLayer);
        const actualLayer = Math.min(layerIdx, layerCount - 1);
        layers[actualLayer].push(nodeId);
    }

    return layers;
}

/**
 * Create the Multipartite layout visualization story.
 */
function createMultipartiteStory(args: MultipartiteArgs): HTMLElement {
    const { nodeCount, layers, align, scale, seed } = args;

    // Generate multipartite graph
    const generatedGraph = generateGraph("multipartite", nodeCount, seed);
    const layoutGraph = toLayoutGraph(generatedGraph);

    // Generate initial random positions
    const randomPositions = generateRandomPositions(generatedGraph, 500, 500, seed);

    // Create layer mappings
    const layerMappings = createLayerMappings(nodeCount, layers);

    // Compute final multipartite layout using actual algorithm
    const finalPositions = multipartiteLayout(
        layoutGraph,
        layerMappings,
        align,
        scale,
        [0, 0],
    );

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph with random initial positions
    renderGraph(svg, generatedGraph, randomPositions, 20, 1, 0, 0);

    // Create info panel
    const infoPanel = createInfoPanel("Multipartite Layout");
    container.appendChild(infoPanel);
    updateInfoPanel(
        infoPanel,
        `Positions ${nodeCount} nodes in ${layers} ${align} layers.`,
    );

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Showing random initial positions. Click 'Apply Layout' to see multipartite arrangement.");

    let isApplied = false;

    /**
     * Apply multipartite layout with animation.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        // Animate to final positions
        updatePositions(svg, generatedGraph, finalPositions, 200, 250, 250);
        updateStatus(statusPanel, "Multipartite layout applied! Nodes arranged in distinct layers.");
    }

    /**
     * Reset to random positions.
     */
    function reset(): void {
        isApplied = false;

        // Reset to random positions
        renderGraph(svg, generatedGraph, randomPositions, 20, 1, 0, 0);
        updateStatus(statusPanel, "Reset to random positions. Click 'Apply Layout' to see multipartite arrangement.");
    }

    // Add controls
    const controls = createAnimationControls(apply, reset);
    container.appendChild(controls);

    return container;
}

const meta: Meta<MultipartiteArgs> = {
    title: "Layout2D",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 6, max: 20, step: 1 },
            description: "Number of nodes in the graph",
        },
        layers: {
            control: { type: "range", min: 2, max: 5, step: 1 },
            description: "Number of layers/partitions",
        },
        align: {
            control: { type: "select" },
            options: ["vertical", "horizontal"],
            description: "Alignment of the layers",
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
        nodeCount: 12,
        layers: 3,
        align: "vertical",
        scale: 1,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<MultipartiteArgs>;

/**
 * Multipartite layout story - positions nodes in multiple parallel layers.
 *
 * This story uses the actual `multipartiteLayout()` function from @graphty/layout.
 * The play function animates from random positions to the multipartite arrangement.
 */
export const Multipartite: Story = {
    render: (args) => createMultipartiteStory(args),
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
