import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { Graphty } from "../src/graphty-element";
import { arrowTypes, eventWaitingDecorator, renderFn, type StoryArgs, storySetup } from "./helpers";

const meta: Meta = {
    title: "Styles/Edge",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator],
    argTypes: {
        arrowHead: { control: "select", options: arrowTypes, table: { category: "Head" }, name: "edge.arrowHead" },
        arrowTail: { control: "select", options: arrowTypes, table: { category: "Tail" }, name: "edge.arrowTail" },
        edgeColor: { control: "color", table: { category: "Line" }, name: "edge.color" },
    },
    args: {
        setup: storySetup({}),
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2.json",
        },
        layout: "ngraph",
        layoutConfig: { seed: 42 },
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * An arrow at each end of every edge.
 *
 * WHAT THIS NO LONGER DEMONSTRATES: each arrow's own size and colour, which used to be the four
 * controls on this story. A style layer chooses WHICH arrow is drawn and nothing else about it --
 * there is no `edge.arrowHead.size` or `edge.arrowHead.color` channel -- so an arrow now takes
 * its colour from the line it caps.
 */
export const Bidirectional: Story = {
    args: {
        setup: storySetup({
            edge: {
                "edge.arrowHead": "normal",
                "edge.arrowTail": "tee",
                "edge.color": "darkgrey",
            },
        }),
    },
    parameters: {
        controls: {
            include: ["edge.arrowHead", "edge.arrowTail", "edge.color"],
        },
    },
};
