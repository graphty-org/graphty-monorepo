import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { Graphty } from "../src/graphty-element";
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
        nodeData: [
            { id: "A", position: { x: -3, y: 0, z: 0 } },
            { id: "B", position: { x: 3, y: 0, z: 0 } },
        ],
        edgeData: [{ src: "A", dst: "B" }],
        layout: "fixed",
        layoutConfig: {},
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * An edge carrying a label, with an arrow at each end.
 *
 * WHAT THIS NO LONGER DEMONSTRATES: the captions that used to sit beside the arrow head and the
 * arrow tail. A style layer can say WHICH arrow is drawn (`edge.arrowHead`, `edge.arrowTail`) and
 * nothing about what is written next to it -- there is no channel for an arrow's own text, its
 * colour or its size -- so the two arrow captions are gone and the edge's own label is what is
 * left. The renderer still draws arrow captions; nothing can ask it to.
 */
export const ArrowText: Story = {
    args: {
        setup: storySetup({
            edge: {
                "edge.arrowHead": "normal",
                "edge.arrowTail": "normal",
                "edge.style": "solid",
                "edge.color": "darkgrey",
                "edge.label": "edge label",
                "edge.labelStyle": { sizePx: 14, color: "#000000" },
            },
        }),
    },
};
