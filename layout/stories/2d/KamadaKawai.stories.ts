/**
 * Kamada-Kawai Layout Algorithm Story
 *
 * Demonstrates Kamada-Kawai layout using path-length cost-function optimization, on a 10 x 10 grid: drawn
 * distances match hop distances, so the grid unfolds into a square mesh.
 * Shows animation from random initial positions to final optimized positions.
 *
 * IMPORTANT: This story uses the actual kamadaKawai implementation
 * from @graphty/layout to demonstrate real package behavior.
 */

import { kamadaKawai, toPositionMap } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import { generateRandomPositions, grid, toSnapshot } from "../utils/graph-generators.js";
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
interface KamadaKawaiArgs {
    scale: number;
    seed: number;
}

/**
 * Create the Kamada-Kawai layout visualization story.
 */
function createKamadaKawaiStory(args: KamadaKawaiArgs): HTMLElement {
    const { scale, seed } = args;

    // Generate graph
    const generatedGraph = grid(10, 10);
    const snapshot = toSnapshot(generatedGraph);

    // Generate initial random positions
    const randomPositions = generateRandomPositions(generatedGraph, 500, 500, seed);

    // Compute final Kamada-Kawai layout using actual algorithm
    const finalPositions = toPositionMap(kamadaKawai(snapshot, { scale, center: [0, 0], dim: 2, seed }), snapshot.ids);

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph with random initial positions
    renderGraph(svg, generatedGraph, randomPositions, 6, 1, 0, 0);

    // Create info panel
    const infoPanel = createInfoPanel("Kamada-Kawai Layout");
    container.appendChild(infoPanel);
    updateInfoPanel(
        infoPanel,
        "A 10 x 10 grid. Look for: it unfolds into a square mesh, since drawn distances match hop distances.",
    );

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Showing random initial positions. Click 'Apply Layout' to see optimized arrangement.");

    let isApplied = false;

    /**
     * Apply Kamada-Kawai layout with animation.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        // Animate to final positions
        // The status says "applied" once the last frame is drawn; the play function waits on it
        void updatePositions(svg, generatedGraph, finalPositions, 200, 250, 250).then(() =>
            updateStatus(statusPanel, "Kamada-Kawai layout applied! Distances match graph-theoretic distances."),
        );
    }

    /**
     * Reset to random positions.
     */
    function reset(): void {
        isApplied = false;

        // Reset to random positions
        renderGraph(svg, generatedGraph, randomPositions, 6, 1, 0, 0);
        updateStatus(statusPanel, "Reset to random positions. Click 'Apply Layout' to see optimized arrangement.");
    }

    // Add controls
    const controls = createAnimationControls(apply, reset);
    container.appendChild(controls);

    return container;
}

const meta: Meta<KamadaKawaiArgs> = {
    title: "Layout2D",
    argTypes: {
        scale: {
            control: { type: "range", min: 0.5, max: 2, step: 0.1 },
            description: "Scale factor for the layout",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for the starting positions",
        },
    },
    args: {
        scale: 1,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<KamadaKawaiArgs>;

/**
 * Kamada-Kawai layout story - path-length cost-function optimization.
 *
 * This story uses the actual `kamadaKawai()` function from @graphty/layout.
 * The play function animates from random positions to the optimized arrangement.
 */
export const KamadaKawai: Story = {
    render: (args) => createKamadaKawaiStory(args),
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
