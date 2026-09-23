// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { assertEdgesCurved, assertGraphLoaded, drawn } from "./assertions";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup } from "./helpers";

const meta: Meta = {
    title: "Styles/Edge",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator],
    parameters: {
        chromatic: {
            delay: 500,
        },
    },
    args: {
        setup: storySetup({ node: { "node.color": "#5A67D8" } }),
        layout: "fixed",
        layoutConfig: {},
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

export const Bezier: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Edge Bezier");

        await assertGraphLoaded(scene, { nodes: 4, edges: 6 });

        // THE ONE THING THIS STORY IS FOR. Six edges that bow, measured as the furthest each
        // drawn path leaves the straight line between its own two ends -- because a bezier that
        // drew a straight line is a mesh that exists, has vertices and is the wrong picture.
        await assertEdgesCurved(scene, 6);
    },
    args: {
        nodeData: [
            { id: "A", position: { x: -5, y: 0, z: -3 } },
            { id: "B", position: { x: 5, y: 0, z: 3 } },
            { id: "C", position: { x: 0, y: 5, z: 0 } },
            { id: "D", position: { x: 0, y: -5, z: 0 } },
        ],
        edgeData: [
            { src: "A", dst: "B" },
            { src: "B", dst: "C" },
            { src: "C", dst: "D" },
            { src: "D", dst: "A" },
            { src: "A", dst: "C" },
            { src: "B", dst: "D" },
        ],
        setup: storySetup({
            edge: {
                "edge.curvature": true,
                "edge.color": "#48DBFB",
                "edge.arrowHead": "normal",
            },
        }),
    },
};
