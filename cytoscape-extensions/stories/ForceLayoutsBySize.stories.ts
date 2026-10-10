import type { Meta, StoryObj } from "@storybook/html-vite";

import { networkArgs, networkArgTypes, SIZES } from "./demo.js";
import { type LayoutArgs, renderLayout } from "./layout-story.js";

/**
 * Each force simulation at each demo size, on the planted partition network (groups of nodes densely linked inside,
 * sparsely between), with each node colored by its group. Every run goes until the layout settles. Only the 100-node
 * stories are animated; on the larger ones a panel shows what runs, the time so far and how far the nodes still move,
 * until the result is drawn.
 */
const meta: Meta<LayoutArgs> = {
    title: "Demo/Force Layouts By Size",
    render: renderLayout,
    argTypes: {
        ...networkArgTypes,
        iterations: { control: { type: "number", min: 0, step: 10 }, description: "0: until the layout settles" },
        animate: { control: "boolean" },
    },
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
        // animated only at 100 nodes: drawing every frame of 2,000 nodes cost six times the layout itself
        animate: size === "small",
        // the CPU simulations compare every pair of nodes: about 17 s per iteration at 50,000 nodes, hours to settle
        backend: size === "huge" ? "gpu" : "auto",
        options: JSON.stringify(extra),
    };
}

// LinLog attraction (ForceAtlas2's own option) draws each group tight and the groups apart; with the default linear
// attraction the 20 groups of the 10,000-node network overlap in one disc.
const LINLOG = { linlog: true };

/** ForceAtlas2 on 100 nodes in 4 groups. */
export const ForceAtlas2At100: Story = { args: at("forceatlas2", "small") };
/** ForceAtlas2 on 2,000 nodes in 9 groups. */
export const ForceAtlas2At2000: Story = { args: at("forceatlas2", "medium") };
/** ForceAtlas2 with LinLog attraction on 10,000 nodes in 20 groups: the groups come apart. */
export const ForceAtlas2At10000: Story = { args: at("forceatlas2", "large", LINLOG) };
/**
 * ForceAtlas2 with LinLog attraction on 50,000 nodes in 45 groups, on the GPU only: the CPU simulation would take
 * hours. Without WebGPU the story says so and draws nothing.
 */
export const ForceAtlas2At50000: Story = { args: at("forceatlas2", "huge", LINLOG) };

/** Fruchterman-Reingold (adaptive cooling) on 100 nodes in 4 groups. */
export const FruchtermanReingoldAt100: Story = { args: at("fruchterman-reingold", "small") };
/** Fruchterman-Reingold (adaptive cooling) on 2,000 nodes in 9 groups. */
export const FruchtermanReingoldAt2000: Story = { args: at("fruchterman-reingold", "medium") };
/**
 * Fruchterman-Reingold (adaptive cooling) on 10,000 nodes in 20 groups. From a random start it does not untangle a
 * network this size: it settles with the groups still overlapping, which the colors show. ForceAtlas2 with LinLog
 * separates them.
 */
export const FruchtermanReingoldAt10000: Story = { args: at("fruchterman-reingold", "large") };
/**
 * Fruchterman-Reingold (adaptive cooling) on 50,000 nodes in 45 groups, on the GPU only (the CPU would take hours).
 * As at 10,000 nodes, the groups stay tangled.
 */
export const FruchtermanReingoldAt50000: Story = { args: at("fruchterman-reingold", "huge") };

/** Spring-electrical on 100 nodes in 4 groups: GPU only, so without WebGPU the story says why it did not run. */
export const SpringElectricalAt100: Story = { args: at("spring-electrical", "small") };
/** Spring-electrical on 2,000 nodes in 9 groups (GPU only). */
export const SpringElectricalAt2000: Story = { args: at("spring-electrical", "medium") };
/** Spring-electrical on 10,000 nodes in 20 groups (GPU only). */
export const SpringElectricalAt10000: Story = { args: at("spring-electrical", "large") };
/**
 * Spring-electrical on 50,000 nodes in 45 groups (GPU only). It spreads each group wide, so the groups show as faint
 * overlapping patches of color rather than ForceAtlas2's tight clusters.
 */
export const SpringElectricalAt50000: Story = { args: at("spring-electrical", "huge") };
