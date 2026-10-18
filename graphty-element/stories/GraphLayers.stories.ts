// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { assertDistinctPicture, assertDrawnColour, assertGraphLoaded, assertLayerPainted, drawn } from "./assertions";
import { catSocialNetwork2Url } from "./datasets";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup, waitForGraphSettled } from "./helpers";
import { captionDecorator, renderFnSource } from "./styling/story-docs";

/**
 * The first story under Styling/Layers. It keeps the component id of Styling/Graph, where it used
 * to live, so its id and its approved screenshot are unchanged; the Layers page's description
 * comes from LayeredStyles.stories.ts, which is why this file declares no Docs page.
 */
const meta: Meta = {
    title: "Styling/Layers",
    id: "styles-graph",
    tags: ["!autodocs"],
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator, captionDecorator],
    parameters: {
        chromatic: {
            delay: 500, // Allow Babylon.js render frames to complete (30 frames at 60fps)
        },
        docs: {
            description: {
                component:
                    "Style layers, each selecting nodes by a column of the data and setting their color. Layers stack bottom to top, and a node no layer selects keeps the element's own color.",
            },
            source: { transform: renderFnSource, language: "html" },
        },
    },
    args: {
        dataSource: "json",
        dataSourceConfig: {
            data: catSocialNetwork2Url,
        },
        layout: "ngraph",
        layoutConfig: {
            seed: 42, // Fixed seed for consistent layouts in visual tests
        },
        setup: storySetup({
            preSteps: 8000, // Extra preSteps for more stable physics layouts
        }),
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * Three layers, each colouring the nodes one of its own selector matches.
 *
 * SELECTED BY AN ATTRIBUTE, NOT BY A PREFIX OF THE ID. The element's selector language admits no
 * functions at all -- it is a declared subset of JMESPath, refused at its edge rather than
 * narrowed in silence -- so `starts_with(id, 'Mlle')`, which these three layers used to say, is
 * rejected by name with the offset it went wrong at. Equality against a field the data already
 * carries says the same thing and costs one column read per node.
 */
export const Layers: Story = {
    name: "Three layers by attribute",
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "Indoor cats are black",
                    target: "node",
                    selector: { match: "expression", where: "data.indoor_outdoor == 'indoor'" },
                    set: { "node.color": "black" },
                },
                {
                    name: "Outdoor cats are yellow",
                    target: "node",
                    selector: { match: "expression", where: "data.indoor_outdoor == 'outdoor'" },
                    set: { "node.color": "yellow" },
                },
                {
                    name: "Strays are red",
                    target: "node",
                    selector: { match: "expression", where: "data.indoor_outdoor == 'stray'" },
                    set: { "node.color": "red" },
                },
            ],
            preSteps: 8000,
        }),
    },
    parameters: {
        caption: {
            text: "Three layers, each selecting cats by the indoor_outdoor column of the data.",
            legend: [
                ["black", "indoor"],
                ["yellow", "outdoor"],
                ["red", "stray"],
                ["#6366f1", "matched by no layer"],
            ],
        },
        controls: {
            include: [],
        },
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);

        const scene = await drawn(canvasElement, "Styles/Graph Layers");

        await assertGraphLoaded(scene, { nodes: 20, edges: 29 });

        // The cat network carries `indoor_outdoor` on every node: seven indoor, five outdoor,
        // four strays, and four -- a clinic, a human, a kitten and a working cat -- that none of
        // the three layers names and that are deliberately left to the element's own colour.
        await assertLayerPainted(scene, "Indoor cats are black", { nodes: 7 });
        await assertLayerPainted(scene, "Outdoor cats are yellow", { nodes: 5 });
        await assertLayerPainted(scene, "Strays are red", { nodes: 4 });

        const untouched = scene.nodes.filter((node) => node.hex === "#6366f1");

        await assertDrawnColour(scene, Object.fromEntries(untouched.map((node) => [node.id, "#6366f1"])));
        await assertDistinctPicture(scene, "Styles/Graph");
    },
};
