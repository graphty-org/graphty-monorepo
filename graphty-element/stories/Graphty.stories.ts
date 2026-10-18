import "../index.ts";
// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { assertDrawnColour, assertGraphLoaded, assertLayoutPlaced, drawn } from "./assertions";
import {
    captionDecorator,
    consumerSource,
    edgeData,
    eventWaitingDecorator,
    nodeData,
    renderFn,
    type StoryArgs,
    storySetup,
} from "./helpers";

const meta: Meta = {
    title: "Introduction/First graph",
    // The component id this file had as "Graphty", kept so the story id (graphty--graphty) and its
    // baseline survive the move. docs/guide/getting-started.md and web-component.md link it.
    id: "graphty",
    tags: ["autodocs"],
    component: "graphty-element",
    // The story passes `setup`, which only `renderFn` reads -- see the note in
    // `stories/algorithms/helpers.ts`.
    render: renderFn,
    decorators: [eventWaitingDecorator],
    parameters: {
        controls: { exclude: /^(#|_)/ },
        docs: {
            description: {
                component:
                    "The smallest working graph: six nodes and six edges handed to `<graphty-element>` as " +
                    "two attributes, laid out by the default force layout and drawn in the element's own " +
                    "style. Nothing else is configured. The `seed` in `layout-config` makes the layout " +
                    "land the same way on every load; leave it out and each load settles differently. " +
                    "Getting started shows the whole page around this tag, with and without a build step.",
            },
        },
    },
    args: {
        nodeData,
        edgeData,
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

export const graphty: Story = {
    name: "Default",
    decorators: [
        captionDecorator("Six nodes and six edges, given as node-data and edge-data, in the element's default look."),
    ],
    parameters: consumerSource(`
        <graphty-element
            node-data='[{"id":0},{"id":1},{"id":2},{"id":3},{"id":4},{"id":5}]'
            edge-data='[{"src":0,"dst":1},{"src":0,"dst":2},{"src":2,"dst":3},
                        {"src":3,"dst":0},{"src":3,"dst":4},{"src":3,"dst":5}]'
            layout-config='{"seed":42}'
        ></graphty-element>
    `),
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
