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
        layout: "fixed",
        layoutConfig: {},
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

export const Bezier: Story = {
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
