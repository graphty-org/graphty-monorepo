import type { Meta, StoryObj } from "@storybook/html-vite";

import { SIMULATION_LAYOUTS, STATIC_LAYOUTS } from "./catalog.js";
import { networkArgs, networkArgTypes } from "./demo.js";
import { type LayoutArgs, renderLayout as render } from "./layout-story.js";

const meta: Meta<LayoutArgs> = {
    title: "Demo/Layouts",
    render,
    argTypes: {
        ...networkArgTypes,
        iterations: { control: { type: "number", min: 0, step: 10 }, description: "0: until the layout settles" },
        animate: { control: "boolean" },
    },
};
export default meta;

type Story = StoryObj<LayoutArgs>;

/** The force simulations: the ones that run on the GPU. */
export const ForceSimulations: Story = {
    args: { ...networkArgs, layout: "forceatlas2", iterations: 0, animate: true },
    argTypes: { layout: { control: "select", options: SIMULATION_LAYOUTS } },
};

/** The one-shot layouts: CPU only. The backend control does not apply. "animate" glides the nodes to the result. */
export const StaticLayouts: Story = {
    args: { ...networkArgs, layout: "circular", iterations: 0, animate: false },
    argTypes: {
        layout: { control: "select", options: STATIC_LAYOUTS },
        backend: { table: { disable: true } },
        acceptSoftware: { table: { disable: true } },
        iterations: { table: { disable: true } },
    },
};

// Fixed variations, so a capture shows more than the defaults (a capture takes each story at its default args).

/** ForceAtlas2 on 2,000 nodes, drawn once at the end (no animation). */
export const ForceAtlas2At2000Nodes: Story = {
    ...ForceSimulations,
    args: { ...networkArgs, size: "medium", layout: "forceatlas2", iterations: 0, animate: false },
};

/** Fruchterman-Reingold on 100 nodes, drawn once at the end. */
export const FruchtermanReingold: Story = {
    ...ForceSimulations,
    args: { ...networkArgs, layout: "fruchterman-reingold", iterations: 0, animate: false },
};

/** The circular layout of a 2,000-node Watts-Strogatz ring: the ring, with its few rewired shortcuts across it. */
export const CircularWattsStrogatz2000Nodes: Story = {
    ...StaticLayouts,
    args: {
        ...networkArgs,
        network: "watts-strogatz",
        size: "medium",
        layout: "circular",
        iterations: 0,
        animate: false,
    },
};
