/**
 * Kamada-Kawai 3D Layout Algorithm Story
 *
 * Demonstrates Kamada-Kawai layout in 3D using path-length cost-function optimization.
 * Shows animation from random initial positions to final optimized 3D positions.
 *
 * IMPORTANT: This story uses the actual kamadaKawaiLayout implementation
 * from @graphty/layout with dim=3 to demonstrate real package behavior.
 */

import { kamadaKawaiLayout } from "@graphty/layout";
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
interface KamadaKawai3DArgs {
    nodeCount: number;
    graphType: GraphType;
    scale: number;
    seed: number;
}

/**
 * Create the Kamada-Kawai 3D layout visualization story.
 */
function createKamadaKawai3DStory(args: KamadaKawai3DArgs): HTMLElement {
    const { nodeCount, graphType, scale, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);
    const layoutGraph = toLayoutGraph(generatedGraph);

    // Generate initial random 3D positions
    const randomPositions = generateRandom3DPositions(generatedGraph, 200, seed);

    // Compute final Kamada-Kawai 3D layout using actual algorithm with dim=3
    const finalPositions = kamadaKawaiLayout(
        layoutGraph,
        null, // dist - shortest path distances (auto-computed)
        null, // pos - initial positions
        "weight", // weight attribute
        scale, // scale
        [0, 0, 0], // center (3D)
        3, // dim = 3 for 3D layout
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
    const infoPanel = create3DInfoPanel("Kamada-Kawai 3D Layout");
    container.appendChild(infoPanel);
    update3DInfoPanel(
        infoPanel,
        `Kamada-Kawai 3D layout with scale=${scale}. Optimizes path-length cost function. Drag to rotate, scroll to zoom.`,
    );

    // Create status panel
    const statusPanel = create3DStatusPanel();
    container.appendChild(statusPanel);
    update3DStatus(statusPanel, "Showing random 3D positions. Click 'Apply Layout' to see optimized arrangement.");

    let isApplied = false;

    /**
     * Apply Kamada-Kawai 3D layout with animation.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        // Animate to final positions
        update3DPositions(scene3D, generatedGraph, finalPositions, 200, 1000, () => {
            update3DStatus(statusPanel, "Kamada-Kawai 3D layout applied! Nodes positioned using path-length optimization in 3D space.");
        });
    }

    /**
     * Reset to random positions.
     */
    function reset(): void {
        isApplied = false;

        // Reset to random positions
        render3DGraph(scene3D, generatedGraph, randomPositions, 8, 200);
        update3DStatus(statusPanel, "Reset to random 3D positions. Click 'Apply Layout' to see optimized arrangement.");
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

const meta: Meta<KamadaKawai3DArgs> = {
    title: "Layout3D",
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
            control: { type: "range", min: 0.5, max: 5, step: 0.5 },
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

type Story = StoryObj<KamadaKawai3DArgs>;

/**
 * Kamada-Kawai 3D layout story - path-length optimization algorithm in 3D.
 *
 * This story uses the actual `kamadaKawaiLayout()` function from @graphty/layout with dim=3.
 * The play function animates from random 3D positions to the optimized arrangement.
 */
export const KamadaKawai3D: Story = {
    render: (args) => createKamadaKawai3DStory(args),
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
