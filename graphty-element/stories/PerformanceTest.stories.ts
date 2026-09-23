import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { Graphty } from "../src/graphty-element";
import { storyGraph } from "../test/helpers/story-graph";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup } from "./helpers";

// The same 150 / 250 graph the real-GPU browser test lays out, so what a reader watches here and
// what the accelerator is measured on are one graph rather than two that look alike.
const { nodes: nodes150, edges: edges250 } = storyGraph(150, 250);

const meta: Meta = {
    title: "Performance/Large Graph",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator],
    parameters: {
        chromatic: {
            disableSnapshot: true,
        },
    },
    args: {
        layout: "ngraph",
        layoutConfig: { seed: 42 },
        setup: storySetup({
            edge: { "edge.color": "#666666", "edge.arrowHead": "normal" },
            node: { "node.color": "#5A67D8", "node.shape": "sphere", "node.size": 0.5 },
        }),
        nodeData: nodes150,
        edgeData: edges250,
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * 250 edges with 150 nodes - ngraph physics layout with normal arrowheads
 * Every node has at least one edge.
 */
export const Physics250: Story = {};
