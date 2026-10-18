import { spiral } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { consumerCode, type GraphArgs, graphArgTypes, makeGraph } from "../utils/graphs.js";
import { show2D } from "../utils/visualization.js";

interface SpiralArgs extends GraphArgs {
    resolution: number;
    equidistant: boolean;
}

const meta: Meta<SpiralArgs> = {
    title: "Geometric/Spiral",
    // The component id from before the sections, so every story id (and its approved screenshot) stays the same
    id: "layout2d",
    // The section Overview documents this page, so it adds no Docs page of its own.
    tags: ["!autodocs"],
    argTypes: {
        ...graphArgTypes,
        resolution: {
            control: { type: "range", min: 0.1, max: 1, step: 0.05 },
            description: "Angle between consecutive nodes, in radians",
        },
        equidistant: { control: { type: "boolean" }, description: "Space consecutive nodes the same distance apart" },
    },
    args: { graph: "path", nodeCount: 12, seed: 42, resolution: 0.35, equidistant: false },
    parameters: {
        docs: {
            description: {
                component:
                    "spiral(graph, options) places the nodes along an Archimedean spiral from the center outward, in node order. resolution is the angle between consecutive nodes in radians; equidistant: true spaces them the same distance apart along the curve instead.",
            },
        },
    },
};

export default meta;

export const Spiral: StoryObj<SpiralArgs> = {
    render: ({ graph, nodeCount, seed, resolution, equidistant }) => {
        const g = makeGraph(graph, nodeCount, seed);
        const call = `spiral(graph, { resolution: ${resolution}, equidistant: ${equidistant} })`;
        return show2D(
            g.sample,
            spiral(g.graph, { resolution, equidistant }),
            call,
            `Nodes along a spiral from the center outward, in node order. The drawing is scaled to fill the frame. Graph: ${g.call}.`,
        );
    },
    parameters: consumerCode(
        "spiral",
        "pathGraph",
        "pathGraph({ n: 12 })",
        `const result = spiral(graph, { resolution: 0.35, equidistant: false });`,
    ),
};
