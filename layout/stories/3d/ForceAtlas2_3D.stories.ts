/**
 * ForceAtlas2 3D Layout Algorithm Story
 *
 * Demonstrates ForceAtlas2 layout in 3D using the force-directed algorithm.
 * Shows animation from random initial positions to final optimized 3D positions.
 *
 * IMPORTANT: This story uses the actual forceatlas2Layout implementation
 * from @graphty/layout with dim=3 to demonstrate real package behavior.
 */

import { forceatlas2Layout } from "@graphty/layout";
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
interface ForceAtlas23DArgs {
    nodeCount: number;
    graphType: GraphType;
    iterations: number;
    gravity: number;
    scalingRatio: number;
    seed: number;
}

/**
 * Create the ForceAtlas2 3D layout visualization story.
 */
function createForceAtlas23DStory(args: ForceAtlas23DArgs): HTMLElement {
    const { nodeCount, graphType, iterations, gravity, scalingRatio, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);
    const layoutGraph = toLayoutGraph(generatedGraph);

    // Generate initial random 3D positions
    const randomPositions = generateRandom3DPositions(generatedGraph, 200, seed);

    // Compute final ForceAtlas2 3D layout using actual algorithm with dim=3
    const finalPositions = forceatlas2Layout(
        layoutGraph,
        null, // pos - initial positions
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
    const infoPanel = create3DInfoPanel("ForceAtlas2 3D Layout");
    container.appendChild(infoPanel);
    update3DInfoPanel(
        infoPanel,
        `ForceAtlas2 3D layout with ${iterations} iterations, gravity=${gravity}. Drag to rotate, scroll to zoom.`,
    );

    // Create status panel
    const statusPanel = create3DStatusPanel();
    container.appendChild(statusPanel);
    update3DStatus(statusPanel, "Showing random 3D positions. Click 'Apply Layout' to see optimized arrangement.");

    let isApplied = false;

    /**
     * Apply ForceAtlas2 3D layout with animation.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        // Animate to final positions
        update3DPositions(scene3D, generatedGraph, finalPositions, 200, 1000, () => {
            update3DStatus(statusPanel, "ForceAtlas2 3D layout applied! Nodes positioned using force-directed algorithm in 3D space.");
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

const meta: Meta<ForceAtlas23DArgs> = {
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
        iterations: {
            control: { type: "range", min: 10, max: 200, step: 10 },
            description: "Number of iterations for force simulation",
        },
        gravity: {
            control: { type: "range", min: 0.1, max: 5, step: 0.1 },
            description: "Gravity attraction to center",
        },
        scalingRatio: {
            control: { type: "range", min: 0.5, max: 5, step: 0.5 },
            description: "Scaling of attraction and repulsion forces",
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
        gravity: 1.0,
        scalingRatio: 2.0,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<ForceAtlas23DArgs>;

/**
 * ForceAtlas2 3D layout story - force-directed algorithm in 3D.
 *
 * This story uses the actual `forceatlas2Layout()` function from @graphty/layout with dim=3.
 * The play function animates from random 3D positions to the optimized arrangement.
 */
export const ForceAtlas2_3D: Story = {
    render: (args) => createForceAtlas23DStory(args),
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
