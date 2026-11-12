import type { Meta, StoryObj } from "@storybook/html-vite";

import { networkArgs, networkArgTypes, SIZES } from "./demo.js";
import { type LayoutArgs, renderLayout } from "./layout-story.js";

/**
 * Each force simulation on 2,000, 10,000 and 50,000 nodes of the planted partition network (groups of nodes densely
 * linked inside, sparsely between), with each node colored by its group. Every run goes until the layout settles, on
 * WebGPU (gpu: "require"): a panel shows what runs, the time so far and how far the nodes still move, until the
 * result is drawn. Without WebGPU a story says so and draws each group in its own place instead. The backend control
 * runs the layout on the CPU, which at these sizes takes minutes to hours.
 */
const meta: Meta<LayoutArgs> = {
    title: "Gallery/Large graphs",
    render: renderLayout,
    argTypes: {
        ...networkArgTypes,
        iterations: { control: { type: "number", min: 0, step: 10 }, description: "0: until the layout settles" },
        animate: { control: "boolean" },
    },
    // Not captured by visual review: its capture browser has no WebGPU, so these stories would only show the
    // "no WebGPU" placeholder. Their real images are checked against approved references by the GPU screenshot
    // check (scripts/gpu-screenshots.mjs) at push and on the release train.
    parameters: { chromatic: { disableSnapshot: true } },
};
export default meta;

type Story = StoryObj<LayoutArgs>;

/**
 * One story's args.
 * @param layout - the simulation
 * @param size - the network size
 * @param extra - layout options, as the options control takes them
 * @returns the args
 */
function at(layout: string, size: keyof typeof SIZES, extra: Record<string, unknown> = {}): LayoutArgs {
    return {
        ...networkArgs,
        network: "planted-partition",
        size,
        layout,
        iterations: 0,
        // not animated: drawing every frame of 2,000 nodes cost six times the layout itself
        animate: false,
        // on WebGPU only: the CPU simulations compare every pair of nodes (about 17 s per iteration at 50,000 nodes)
        backend: "gpu",
        options: JSON.stringify(extra),
    };
}

// LinLog attraction (ForceAtlas2's own option) draws each group tight and the groups apart; with the default linear
// attraction the 20 groups of the 10,000-node network overlap in one disc.
const LINLOG = { linlog: true };

/** ForceAtlas2 on 2,000 nodes in 9 groups. */
export const ForceAtlas2At2000: Story = { args: at("forceatlas2", "medium") };
/** ForceAtlas2 with LinLog attraction on 10,000 nodes in 20 groups: the groups come apart. */
export const ForceAtlas2At10000: Story = { args: at("forceatlas2", "large", LINLOG) };
/**
 * ForceAtlas2 with LinLog attraction on 50,000 nodes in 45 groups: the CPU simulation would take hours.
 */
export const ForceAtlas2At50000: Story = { args: at("forceatlas2", "huge", LINLOG) };

/** Fruchterman-Reingold (adaptive cooling) on 2,000 nodes in 9 groups. */
export const FruchtermanReingoldAt2000: Story = { args: at("fruchterman-reingold", "medium") };
/**
 * Fruchterman-Reingold (adaptive cooling) on 10,000 nodes in 20 groups. From a random start it does not untangle a
 * network this size: it settles with the groups still overlapping, which the colors show. ForceAtlas2 with LinLog
 * separates them.
 */
export const FruchtermanReingoldAt10000: Story = { args: at("fruchterman-reingold", "large") };
/**
 * Fruchterman-Reingold (adaptive cooling) on 50,000 nodes in 45 groups. As at 10,000 nodes, the groups stay tangled.
 */
export const FruchtermanReingoldAt50000: Story = { args: at("fruchterman-reingold", "huge") };

/** Spring-electrical on 2,000 nodes in 9 groups (GPU only). */
export const SpringElectricalAt2000: Story = { args: at("spring-electrical", "medium") };
/** Spring-electrical on 10,000 nodes in 20 groups (GPU only). */
export const SpringElectricalAt10000: Story = { args: at("spring-electrical", "large") };
/**
 * Spring-electrical on 50,000 nodes in 45 groups (GPU only). It spreads each group wide, so the groups show as faint
 * overlapping patches of color rather than ForceAtlas2's tight clusters.
 */
export const SpringElectricalAt50000: Story = { args: at("spring-electrical", "huge") };
