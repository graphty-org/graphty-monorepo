import type { Meta, StoryObj } from "@storybook/html-vite";

import { SIMULATION_LAYOUTS, STATIC_LAYOUTS } from "./catalog.js";
import { networkArgs, networkArgTypes, renderDemo, type RunArgs } from "./demo.js";
import { runLayout } from "./run.js";

interface LayoutArgs extends RunArgs {
    layout: string;
    /** Simulations: the fixed number of iterations (maxIter for ForceAtlas2, iterations for the others). */
    iterations: number;
    animate: boolean;
}

/**
 * Story render: lays the network out with the chosen layout.
 * @param args - the story args
 * @returns the story root
 */
function render(args: LayoutArgs): HTMLElement {
    return renderDemo(args, `graphty-${args.layout}`, ({ cy, gpuMode, extra }) =>
        runLayout(cy, args.layout, {
            gpuMode,
            seed: args.seed,
            iterations: args.iterations,
            animate: args.animate,
            extra,
        }),
    );
}

const meta: Meta<LayoutArgs> = {
    title: "Demo/Layouts",
    render,
    argTypes: {
        ...networkArgTypes,
        iterations: { control: { type: "number", min: 1, step: 10 } },
        animate: { control: "boolean" },
    },
};
export default meta;

type Story = StoryObj<LayoutArgs>;

/** The force simulations: the ones that run on the GPU. */
export const ForceSimulations: Story = {
    args: { ...networkArgs, layout: "forceatlas2", iterations: 100, animate: false },
    argTypes: { layout: { control: "select", options: SIMULATION_LAYOUTS } },
};

/** The one-shot layouts: CPU only. The backend control does not apply. */
export const StaticLayouts: Story = {
    args: { ...networkArgs, layout: "circular", iterations: 100, animate: false },
    argTypes: {
        layout: { control: "select", options: STATIC_LAYOUTS },
        backend: { table: { disable: true } },
        acceptSoftware: { table: { disable: true } },
        iterations: { table: { disable: true } },
        animate: { table: { disable: true } },
    },
};
