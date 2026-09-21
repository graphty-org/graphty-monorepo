import "../index.ts";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { Graphty } from "../src/graphty-element";
import { edgeData, eventWaitingDecorator, nodeData, type StoryArgs, storySetup } from "./helpers";

const meta: Meta = {
    title: "Graphty",
    tags: ["autodocs"],
    component: "graphty-element",
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
    args: {
        layoutConfig: {
            seed: 42, // Fixed seed for deterministic layout
        },
        setup: storySetup({ preSteps: 2000 }), // more steps for a more stable layout
    },
};
