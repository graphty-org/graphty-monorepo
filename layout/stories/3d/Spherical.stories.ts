/**
 * Spherical 3D Layout Algorithm Story
 *
 * Demonstrates spherical layout using circular layout algorithm in 3D mode.
 * Nodes are distributed evenly on a sphere surface using Fibonacci spiral.
 * Shows animation from random initial positions to final spherical arrangement.
 *
 * IMPORTANT: This story uses the actual circularLayout implementation
 * from @graphty/layout with dim=3 to demonstrate real package behavior.
 * In 3D mode, circularLayout distributes nodes on a sphere using Fibonacci spiral.
 */

import { circularLayout } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import {
    generateGraph,
    generateRandom3DPositions,
    type GraphType,
    toLayoutGraph,
} from "../utils/graph-generators.js";
import {
    cleanup3DScene,
    create3DControls,
    create3DInfoPanel,
    create3DScene,
    create3DStatusPanel,
    create3DStoryContainer,
    render3DGraph,
    startAnimationLoop,
    update3DInfoPanel,
    update3DPositions,
    update3DStatus,
} from "../utils/visualization-3d.js";

/**
 * Story arguments interface.
 */
interface SphericalArgs {
    nodeCount: number;
    graphType: GraphType;
    radius: number;
    seed: number;
}

/**
 * Create the Spherical 3D layout visualization story.
 */
function createSphericalStory(args: SphericalArgs): HTMLElement {
    const { nodeCount, graphType, radius, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);
    const layoutGraph = toLayoutGraph(generatedGraph);

    // Generate initial random 3D positions
    const randomPositions = generateRandom3DPositions(generatedGraph, 200, seed);

    // Compute final Spherical layout using circularLayout with dim=3
    // circularLayout uses Fibonacci spiral for even distribution on a sphere when dim=3
    const finalPositions = circularLayout(
        layoutGraph,
        radius, // scale (acts as sphere radius)
        [0, 0, 0], // center (3D)
        3, // dim = 3 for spherical layout
    );

    // Create main container
    const container = create3DStoryContainer();

    // Create 3D scene
    const scene3D = create3DScene(500, 500, true);
    container.appendChild(scene3D.container);

    // Render graph with random initial positions
    render3DGraph(scene3D, generatedGraph, randomPositions, 8, 200);

    // Start animation loop for interactive controls
    startAnimationLoop(scene3D);

    // Create info panel
    const infoPanel = create3DInfoPanel("Spherical 3D Layout");
    container.appendChild(infoPanel);
    update3DInfoPanel(
        infoPanel,
        `Spherical layout with radius=${radius}. Nodes distributed using Fibonacci spiral. Drag to rotate, scroll to zoom.`,
    );

    // Create status panel
    const statusPanel = create3DStatusPanel();
    container.appendChild(statusPanel);
    update3DStatus(statusPanel, "Showing random 3D positions. Click 'Apply Layout' to see spherical arrangement.");

    let isApplied = false;

    /**
     * Apply Spherical layout with animation.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        // Animate to final positions
        update3DPositions(scene3D, generatedGraph, finalPositions, 200, 1000, () => {
            update3DStatus(statusPanel, "Spherical layout applied! Nodes evenly distributed on sphere surface.");
        });
    }

    /**
     * Reset to random positions.
     */
    function reset(): void {
        isApplied = false;

        // Reset to random positions
        render3DGraph(scene3D, generatedGraph, randomPositions, 8, 200);
        update3DStatus(statusPanel, "Reset to random 3D positions. Click 'Apply Layout' to see spherical arrangement.");
    }

    // Add controls
    const controls = create3DControls(apply, reset);
    container.appendChild(controls);

    // Cleanup on story unmount
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            const removedNodes = Array.from(mutation.removedNodes);
            for (const removedNode of removedNodes) {
                if (removedNode === container || (removedNode as Element).contains?.(container)) {
                    cleanup3DScene(scene3D);
                    observer.disconnect();
                    return;
                }
            }
        }
    });

    // Start observing parent changes after a tick to allow DOM insertion
    setTimeout(() => {
        if (container.parentElement) {
            observer.observe(container.parentElement, { childList: true, subtree: true });
        }
    }, 0);

    return container;
}

const meta: Meta<SphericalArgs> = {
    title: "Layout3D",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 4, max: 30, step: 1 },
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
        radius: {
            control: { type: "range", min: 50, max: 300, step: 10 },
            description: "Radius of the sphere",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        nodeCount: 20,
        graphType: "complete",
        radius: 200,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<SphericalArgs>;

/**
 * Spherical layout story - nodes evenly distributed on a sphere using Fibonacci spiral.
 *
 * This story uses the actual `circularLayout()` function from @graphty/layout with dim=3.
 * The play function animates from random 3D positions to the spherical arrangement.
 */
export const Spherical: Story = {
    render: (args) => createSphericalStory(args),
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
