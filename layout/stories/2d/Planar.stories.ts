/**
 * Planar Layout Algorithm Story
 *
 * Demonstrates planar layout on a seeded random Apollonian network (a planar triangulation, which general-purpose
 * layouts tangle): every node on a grid point, every edge straight, and no two edges crossing.
 * Shows animation from random initial positions to final planar positions.
 *
 * IMPORTANT: This story uses the actual planar implementation
 * from @graphty/layout to demonstrate real package behavior.
 */

import { randomApollonianGraph } from "@graphty/graph-samples/generators";
import { planar, toPositionMap } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import { type GeneratedGraph, generateRandomPositions, toSnapshot } from "../utils/graph-generators.js";
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
    scale: number;
    seed: number;
}

/**
 * A seeded random Apollonian network in the shape the story renderer draws.
 * @param nodeCount - the node count, >= 3
 * @param seed - the seed
 * @returns its nodes and edges
 */
function apollonianGraph(nodeCount: number, seed: number): GeneratedGraph {
    const g = randomApollonianGraph({ n: nodeCount, seed });
    return {
        nodes: Array.from({ length: g.nodeCount }, (_, i) => ({ id: i, label: String(i), x: 0, y: 0 })),
        edges: Array.from(g.src, (s, e) => ({ source: s, target: g.dst[e] })),
    };
}

/**
 * Create the Planar layout visualization story.
 */
function createPlanarStory(args: PlanarArgs): HTMLElement {
    const { nodeCount, scale, seed } = args;

    // Generate graph
    const generatedGraph = apollonianGraph(nodeCount, seed);
    const snapshot = toSnapshot(generatedGraph);

    // Generate initial random positions
    const randomPositions = generateRandomPositions(generatedGraph, 500, 500, seed);

    // Compute final planar layout using actual algorithm
    const finalPositions = toPositionMap(planar(snapshot, { scale, center: [0, 0] }), snapshot.ids);

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph with random initial positions
    renderGraph(svg, generatedGraph, randomPositions, 10, 1, 0, 0);

    // Create info panel
    const infoPanel = createInfoPanel("Planar Layout");
    container.appendChild(infoPanel);
    updateInfoPanel(
        infoPanel,
        `Draws a ${nodeCount}-node random Apollonian network with no two edges crossing: straight edges, nodes on ` +
            "grid points, uneven spacing.",
    );

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Showing random initial positions. Click 'Apply Layout' to see planar arrangement.");

    let isApplied = false;

    /**
     * Apply planar layout with animation.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        // Animate to final positions
        // The status says "applied" once the last frame is drawn; the play function waits on it
        void updatePositions(svg, generatedGraph, finalPositions, 200, 250, 250).then(() =>
            updateStatus(statusPanel, "Planar layout applied! No two edges cross."),
        );
    }

    /**
     * Reset to random positions.
     */
    function reset(): void {
        isApplied = false;

        // Reset to random positions
        renderGraph(svg, generatedGraph, randomPositions, 10, 1, 0, 0);
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
            control: { type: "range", min: 4, max: 40, step: 1 },
            description: "Number of nodes in the random Apollonian network",
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
        nodeCount: 20,
        scale: 1,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<PlanarArgs>;

/**
 * Planar layout story - positions nodes so that no two edges cross.
 *
 * This story uses the actual `planar()` function from @graphty/layout.
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
        await waitFor(async () => {
            const statusText = canvasElement.querySelector("[data-status]")?.textContent ?? "";
            await expect(statusText).toContain("applied");
        });
    },
};
