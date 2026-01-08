/**
 * Shell Layout Algorithm Story
 *
 * Demonstrates shell layout where nodes are positioned in concentric circles.
 * Shows animation from random initial positions to final shell positions.
 *
 * IMPORTANT: This story uses the actual shellLayout implementation
 * from @graphty/layout to demonstrate real package behavior.
 */

import { shellLayout } from "@graphty/layout";
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
interface ShellArgs {
    nodeCount: number;
    graphType: GraphType;
    shells: number;
    scale: number;
    seed: number;
}

/**
 * Create shell lists by distributing nodes into multiple shells.
 */
function createShellLists(nodeCount: number, shellCount: number): number[][] {
    const shells: number[][] = [];
    let nodeId = 0;

    // First shell gets 1 node (center)
    if (shellCount > 0 && nodeCount > 0) {
        shells.push([nodeId]);
        nodeId++;
    }

    // Remaining shells get roughly equal nodes
    const remainingNodes = nodeCount - 1;
    const remainingShells = Math.max(1, shellCount - 1);
    const nodesPerShell = Math.max(1, Math.ceil(remainingNodes / remainingShells));

    for (let s = 0; s < remainingShells && nodeId < nodeCount; s++) {
        const shell: number[] = [];
        for (let i = 0; i < nodesPerShell && nodeId < nodeCount; i++) {
            shell.push(nodeId);
            nodeId++;
        }
        if (shell.length > 0) {
            shells.push(shell);
        }
    }

    return shells;
}

/**
 * Create the Shell layout visualization story.
 */
function createShellStory(args: ShellArgs): HTMLElement {
    const { nodeCount, graphType, shells, scale, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);
    const layoutGraph = toLayoutGraph(generatedGraph);

    // Generate initial random positions
    const randomPositions = generateRandomPositions(generatedGraph, 500, 500, seed);

    // Create shell lists for the layout
    const shellLists = createShellLists(nodeCount, shells);

    // Compute final shell layout using actual algorithm
    const finalPositions = shellLayout(layoutGraph, shellLists, scale, [0, 0], 2);

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph with random initial positions
    renderGraph(svg, generatedGraph, randomPositions, 20, 1, 0, 0);

    // Create info panel
    const infoPanel = createInfoPanel("Shell Layout");
    container.appendChild(infoPanel);
    updateInfoPanel(
        infoPanel,
        `Positions ${nodeCount} nodes in ${shells} concentric circles with scale ${scale}.`,
    );

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Showing random initial positions. Click 'Apply Layout' to see shell arrangement.");

    let isApplied = false;

    /**
     * Apply shell layout with animation.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        // Animate to final positions
        updatePositions(svg, generatedGraph, finalPositions, 200, 250, 250);
        updateStatus(statusPanel, "Shell layout applied! Nodes arranged in concentric circles.");
    }

    /**
     * Reset to random positions.
     */
    function reset(): void {
        isApplied = false;

        // Reset to random positions
        renderGraph(svg, generatedGraph, randomPositions, 20, 1, 0, 0);
        updateStatus(statusPanel, "Reset to random positions. Click 'Apply Layout' to see shell arrangement.");
    }

    // Add controls
    const controls = createAnimationControls(apply, reset);
    container.appendChild(controls);

    return container;
}

const meta: Meta<ShellArgs> = {
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
        shells: {
            control: { type: "range", min: 2, max: 5, step: 1 },
            description: "Number of concentric shells",
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
        graphType: "random",
        shells: 3,
        scale: 1,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<ShellArgs>;

/**
 * Shell layout story - positions nodes in concentric circles.
 *
 * This story uses the actual `shellLayout()` function from @graphty/layout.
 * The play function animates from random positions to the final shell arrangement.
 */
export const Shell: Story = {
    render: (args) => createShellStory(args),
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
