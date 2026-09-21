import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { Graphty } from "../src/graphty-element";
import {
    eventWaitingDecorator,
    nodeShapes,
    renderFn,
    type StoryArgs,
    storySetup,
    waitForGraphSettled,
} from "./helpers";

const meta: Meta = {
    title: "Styles/Node",
    component: "graphty-element",
    // XXX: https://github.com/storybookjs/storybook/issues/23343
    render: renderFn,
    decorators: [eventWaitingDecorator],
    argTypes: {
        nodeColor: { control: "color", table: { category: "Colour" }, name: "node.color" },
        nodeShape: { control: "select", options: nodeShapes, table: { category: "Shape" }, name: "node.shape" },
        nodeSize: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "Shape" },
            name: "node.size",
        },
        nodeWireframe: { control: "boolean", table: { category: "Effect" }, name: "node.wireframe" },
        nodeLabel: { control: "text", table: { category: "Label" }, name: "node.label" },
        nodeOpacity: {
            control: { type: "range", min: 0.1, max: 1, step: 0.1 },
            table: { category: "Colour" },
            name: "node.opacity",
        },
    },
    parameters: {
        // controls: {exclude: /^(#|_)/},
        controls: {
            include: ["node.color", "node.shape", "node.size", "node.wireframe", "node.label"],
        },
        chromatic: {
            delay: 500, // Allow Babylon.js render frames to complete (30 frames at 60fps)
        },
    },
    args: {
        setup: storySetup({
            preSteps: 8000, // Extra preSteps for ngraph physics layout
        }),
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2.json",
        },
        layout: "ngraph",
        layoutConfig: {
            seed: 42, // Fixed seed for consistent layouts in visual tests
        },
    },
};
export default meta;

// Common play function for all stories
const waitForSettle = async ({ canvasElement }: { canvasElement: HTMLElement }): Promise<void> => {
    await waitForGraphSettled(canvasElement);
};

type Story = StoryObj<StoryArgs>;

export const Default: Story = {
    play: waitForSettle,
};

export const Color: Story = {
    args: {
        setup: storySetup({
            node: { "node.color": "red" },
            preSteps: 8000,
        }),
    },
    parameters: {
        controls: {
            include: ["node.color"],
        },
    },
    play: waitForSettle,
};

export const Shape: Story = {
    args: {
        setup: storySetup({
            node: { "node.shape": "box" },
            preSteps: 8000,
        }),
    },
    parameters: {
        controls: {
            include: ["node.shape"],
        },
    },
    play: waitForSettle,
};

export const Size: Story = {
    args: {
        setup: storySetup({ node: { "node.size": 3 }, preSteps: 8000 }),
    },
    parameters: {
        controls: {
            include: ["node.size"],
        },
    },
    play: waitForSettle,
};

export const Wireframe: Story = {
    args: {
        setup: storySetup({
            node: { "node.wireframe": true },
            preSteps: 8000,
        }),
    },
    parameters: {
        controls: {
            include: ["node.wireframe"],
        },
    },
    play: waitForSettle,
};

/**
 * A label on every node, reading each node's own id.
 *
 * `label: {enabled: true}` used to switch labels on and leave the words to the renderer's
 * default. A layer says what a label SAYS: writing `node.label` is what switches one on, and
 * binding it to a column is how the words come from the data.
 */
export const Label: Story = {
    args: {
        setup: storySetup({
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
            preSteps: 8000,
        }),
    },
    parameters: {
        controls: {
            include: ["node.label"],
        },
    },
    play: waitForSettle,
};

export const Opacity: Story = {
    args: {
        setup: storySetup({
            node: { "node.color": "#0000FF", "node.opacity": 0.5 },
            preSteps: 8000,
        }),
    },
    parameters: {
        controls: {
            include: ["node.color", "node.opacity"],
        },
    },
    play: waitForSettle,
};
