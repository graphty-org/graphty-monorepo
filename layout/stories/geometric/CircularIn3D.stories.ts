import { circular } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { consumerCode, type GraphArgs, graphArgTypes, makeGraph } from "../utils/graphs.js";
import { show3D } from "../utils/visualization-3d.js";

const meta: Meta<GraphArgs> = {
    title: "Geometric/Circular in 3D",
    // The component id from before the sections, so every story id (and its approved screenshot) stays the same
    id: "layout3d",
    argTypes: {
        ...graphArgTypes,
    },
    args: { graph: "complete", nodeCount: 20, seed: 42 },
    parameters: {
        docs: {
            description: {
                component:
                    "circular(graph, { dim: 3 }) spreads the nodes evenly over a sphere (a Fibonacci spiral) instead of around a circle. scale is the sphere's radius.",
            },
        },
    },
};

export default meta;

export const Spherical: StoryObj<GraphArgs> = {
    name: "Circular in 3D",
    render: ({ graph, nodeCount, seed }) => {
        const g = makeGraph(graph, nodeCount, seed);
        const call = "circular(graph, { dim: 3 })";
        return show3D(
            g.sample,
            circular(g.graph, { dim: 3 }),
            call,
            `In 3D, circular spreads the nodes evenly over a sphere. Graph: ${g.call}.`,
        );
    },
    parameters: consumerCode(
        "circular",
        "completeGraph",
        "completeGraph({ n: 20 })",
        `const result = circular(graph, { dim: 3 });`,
    ),
};
