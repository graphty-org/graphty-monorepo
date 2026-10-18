import { fruchtermanReingold } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { consumerCode, type GraphArgs, graphArgTypes, makeGraph } from "../utils/graphs.js";
import { show2D } from "../utils/visualization.js";

interface SpringArgs extends GraphArgs {
    iterations: number;
}

const meta: Meta<SpringArgs> = {
    title: "Force-directed/Spring (Fruchterman-Reingold)",
    // The component id from before the sections, so every story id (and its approved screenshot) stays the same
    id: "layout2d",
    // The section Overview documents this page, so it adds no Docs page of its own.
    tags: ["!autodocs"],
    argTypes: {
        ...graphArgTypes,
        iterations: { control: { type: "range", min: 10, max: 200, step: 10 }, description: "Iterations to run" },
    },
    args: { graph: "small world", nodeCount: 10, seed: 42, iterations: 50 },
    parameters: {
        docs: {
            description: {
                component:
                    "fruchtermanReingold(graph, options) runs the Fruchterman-Reingold spring simulation (1991) for a fixed number of iterations: edges act as springs and every pair of nodes repels. To draw every iteration, see Simulations.",
            },
        },
    },
};

export default meta;

export const Spring: StoryObj<SpringArgs> = {
    name: "Spring (Fruchterman-Reingold)",
    render: ({ graph, nodeCount, seed, iterations }) => {
        const g = makeGraph(graph, nodeCount, seed);
        const call = `fruchtermanReingold(graph, { iterations: ${iterations}, seed: ${seed} })`;
        return show2D(
            g.sample,
            fruchtermanReingold(g.graph, { iterations, seed }),
            call,
            `Edges pull their nodes together and every pair pushes apart. The drawing is scaled to fill the frame. Graph: ${g.call}.`,
        );
    },
    parameters: consumerCode(
        "fruchtermanReingold",
        "wattsStrogatzGraph",
        "wattsStrogatzGraph({ n: 10, k: 4, beta: 0.3, seed: 42 })",
        `const result = fruchtermanReingold(graph, { iterations: 50, seed: 42 });`,
    ),
};
