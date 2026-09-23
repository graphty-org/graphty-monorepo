import "../index.ts";
// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { assertDrawnColour, assertGraphLoaded, assertLayoutPlaced, drawn } from "./assertions";
import { edgeData, eventWaitingDecorator, nodeData, renderFn, type StoryArgs, storySetup } from "./helpers";

const meta: Meta = {
    title: "Graphty",
    tags: ["autodocs"],
    component: "graphty-element",
    // The story passes `setup`, which only `renderFn` reads -- see the note in
    // `stories/algorithms/helpers.ts`.
    render: renderFn,
    decorators: [eventWaitingDecorator],
    parameters: {
        controls: { exclude: /^(#|_)/ },
    },
    args: {
        nodeData,
        edgeData,
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

export const graphty: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Graphty");

        // The package's front page: six nodes, six edges, a seeded layout, and the element's own
        // appearance with no layer of anybody's on top of it.
        await assertGraphLoaded(scene, { nodes: 6, edges: 6 });
        await assertLayoutPlaced(scene, {});
        await assertDrawnColour(scene, "#6366f1");
    },
    args: {
        layoutConfig: {
            seed: 42, // Fixed seed for deterministic layout
        },
        setup: storySetup({ preSteps: 2000 }), // more steps for a more stable layout
    },
};
