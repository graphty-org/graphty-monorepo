import { fruchtermanReingold } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { consumerCode, type GraphArgs, graphArgTypes, makeGraph } from "../utils/graphs.js";
import { show3D } from "../utils/visualization-3d.js";

interface Spring3DArgs extends GraphArgs {
    iterations: number;
}

const meta: Meta<Spring3DArgs> = {
    title: "Force-directed/Spring in 3D",
    // The component id from before the sections, so every story id (and its approved screenshot) stays the same
    id: "layout3d",
    argTypes: {
        ...graphArgTypes,
        iterations: { control: { type: "range", min: 10, max: 200, step: 10 }, description: "Iterations to run" },
    },
    args: { graph: "small world", nodeCount: 10, seed: 42, iterations: 50 },
    parameters: {
        docs: {
            description: {
                component:
                    "fruchtermanReingold(graph, { dim: 3 }) runs the same spring simulation in three dimensions.",
            },
        },
    },
};

export default meta;

export const Spring3D: StoryObj<Spring3DArgs> = {
    name: "Spring in 3D",
    render: ({ graph, nodeCount, seed, iterations }) => {
        const g = makeGraph(graph, nodeCount, seed);
        const call = `fruchtermanReingold(graph, { dim: 3, iterations: ${iterations}, seed: ${seed} })`;
        return show3D(
            g.sample,
            fruchtermanReingold(g.graph, { dim: 3, iterations, seed }),
            call,
            `Fruchterman-Reingold in three dimensions. Graph: ${g.call}.`,
        );
    },
    parameters: consumerCode(
        "fruchtermanReingold",
        "wattsStrogatzGraph",
        "wattsStrogatzGraph({ n: 10, k: 4, beta: 0.3, seed: 42 })",
        `const result = fruchtermanReingold(graph, { dim: 3, iterations: 50, seed: 42 });`,
    ),
};
