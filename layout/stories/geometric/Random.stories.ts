import { random } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { consumerCode, type GraphArgs, graphArgTypes, makeGraph } from "../utils/graphs.js";
import { show2D } from "../utils/visualization.js";

const meta: Meta<GraphArgs> = {
    title: "Geometric/Random",
    // The component id from before the sections, so every story id (and its approved screenshot) stays the same
    id: "layout2d",
    // The section Overview documents this page, so it adds no Docs page of its own.
    tags: ["!autodocs"],
    argTypes: {
        ...graphArgTypes,
    },
    args: { graph: "random", nodeCount: 10, seed: 42 },
    parameters: {
        docs: {
            description: {
                component:
                    "random(graph, options) places each node uniformly at random in the square from center to center + scale (the unit square by default; as in NetworkX, center is its lowest corner). The same seed gives the same positions. It ignores the edges.",
            },
        },
    },
};

export default meta;

export const Random: StoryObj<GraphArgs> = {
    render: ({ graph, nodeCount, seed }) => {
        const g = makeGraph(graph, nodeCount, seed);
        const call = `random(graph, { seed: ${seed} })`;
        return show2D(
            g.sample,
            random(g.graph, { seed }),
            call,
            `Each node at a random point of the unit square; the same seed gives the same drawing. The drawing is scaled to fill the frame. Graph: ${g.call}.`,
        );
    },
    parameters: consumerCode(
        "random",
        "erdosRenyiGraph",
        "erdosRenyiGraph({ n: 10, p: 0.3, seed: 42 })",
        `const result = random(graph, { seed: 42 });`,
    ),
};
