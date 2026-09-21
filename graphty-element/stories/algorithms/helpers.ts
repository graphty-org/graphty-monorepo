// Import algorithms to trigger side-effect registration
import "../../src/algorithms";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { LayerSpec } from "../../src/catalog/types";
import type { Graphty } from "../../src/graphty-element";
import { eventWaitingDecorator, type StoryArgs, storySetup, waitForGraphSettled } from "../helpers";

export type Story = StoryObj<StoryArgs>;

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
        setup: storySetup({
            preSteps: 8000, // Extra preSteps for ngraph physics layout
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
 * ORDER IS EVERYTHING HERE. The reader's layers are added first and the algorithm's suggestion
 * after them, because a layer later in the stack paints over a layer earlier in it -- so a story
 * that dims every edge and then runs a route algorithm shows the route over the dimmed rest,
 * which is the picture it is asking for.
 */
export const createAlgorithmStory = (algorithmId: string, readerLayers?: readonly LayerSpec[]): Story => ({
    args: {
        setup: storySetup({
            algorithms: [algorithmId],
            preSteps: 8000, // Extra preSteps for ngraph physics layout
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
    },
});

// Re-export helpers for convenience
export { storySetup, waitForGraphSettled } from "../helpers";
