// Import algorithms to trigger side-effect registration
import "../../src/algorithms";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { LayerSpec } from "../../src/catalog/types";
import type { Graphty } from "../../src/graphty-element";
import { eventWaitingDecorator, templateCreator, waitForGraphSettled } from "../helpers";

export type Story = StoryObj<Graphty>;

/**
 * Base meta configuration for algorithm stories (without title)
 * Each story file should spread this and add the title property
 */
export const algorithmMetaBase: Omit<Meta, "title"> = {
    component: "graphty-element",
    decorators: [eventWaitingDecorator],
    parameters: {
        controls: { exclude: /^(#|_)/ },
        chromatic: {
            delay: 500, // Allow Babylon.js render frames to complete
        },
    },
    args: {
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2.json",
        },
        layout: "ngraph",
        layoutConfig: {
            seed: 42, // Fixed seed for consistent layouts in visual tests
        },
        styleTemplate: templateCreator({
            behavior: {
                layout: {
                    preSteps: 8000, // Extra preSteps for ngraph physics layout
                },
            },
        }),
    },
};

/**
 * Helper function for algorithm stories
 * Creates a story that runs an algorithm and applies its suggested styles
 *
 * `readerLayers` are the story's OWN layers, sitting beneath the algorithm's. Muting what an
 * algorithm did not select is a reader's choice and must not ship in suggestedStyles -- see
 * CLAUDE.md "### Algorithm Styles" -- so a story that wants the rest dimmed asks for it here.
 *
 * THEY GO IN THE SESSION'S STACK, NOT IN THE STYLE TEMPLATE, and the difference is not cosmetic.
 * A template layer is a 1.x layer, and one of those in the stack hands the whole graph back to
 * the 1.x painter -- at which point the algorithm's own layer, which lives in the session, paints
 * nothing at all. A reader layer written the old way therefore deleted the very picture it was
 * meant to sit under.
 */
export const createAlgorithmStory = (algorithmId: string, readerLayers?: readonly LayerSpec[]): Story => ({
    args: {
        styleTemplate: templateCreator({
            algorithms: [algorithmId],
            behavior: {
                layout: {
                    preSteps: 8000, // Extra preSteps for ngraph physics layout
                },
            },
        }),
        runAlgorithmsOnLoad: true,
    },
    play: async ({ canvasElement }) => {
        // Wait for the graph to fully settle before applying algorithm styles
        await waitForGraphSettled(canvasElement);

        // Get the graphty-element
        const element = canvasElement.querySelector("graphty-element");
        if (!element) {
            return;
        }

        const graphtyElement = element as Graphty;
        const { graph, session } = graphtyElement;

        // The reader's layers go in first, so the algorithm's layer paints over them.
        for (const layer of readerLayers ?? []) {
            await session.styles.add(layer);
        }

        // Apply suggested styles from the algorithm
        graph.applySuggestedStyles(algorithmId);

        // Re-apply styles to existing nodes and edges so they pick up the new style layers
        graph.getDataManager().applyStylesToExistingNodes();
        graph.getDataManager().applyStylesToExistingEdges();
    },
});

// Re-export helpers for convenience
export { templateCreator, waitForGraphSettled } from "../helpers";
