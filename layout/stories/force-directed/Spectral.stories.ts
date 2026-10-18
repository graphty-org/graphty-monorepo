import { spectral } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { consumerCode, type GraphArgs, graphArgTypes, makeGraph } from "../utils/graphs.js";
import { show2D } from "../utils/visualization.js";

const meta: Meta<GraphArgs> = {
    title: "Force-directed/Spectral",
    // The component id from before the sections, so every story id (and its approved screenshot) stays the same
    id: "layout2d",
    // The section Overview documents this page, so it adds no Docs page of its own.
    tags: ["!autodocs"],
    argTypes: {
        ...graphArgTypes,
    },
    args: { graph: "small world", nodeCount: 10, seed: 42 },
    parameters: {
        docs: {
            description: {
                component:
                    "spectral(graph, options) places each node by the eigenvectors of the graph Laplacian: closely connected nodes land close together. It is fast and has no iterations to tune.",
            },
        },
    },
};

export default meta;

export const Spectral: StoryObj<GraphArgs> = {
    render: ({ graph, nodeCount, seed }) => {
        const g = makeGraph(graph, nodeCount, seed);
        const call = `spectral(graph, { seed: ${seed} })`;
        return show2D(
            g.sample,
            spectral(g.graph, { seed }),
            call,
            `Positions from the Laplacian's eigenvectors. The drawing is scaled to fill the frame. Graph: ${g.call}.`,
        );
    },
    parameters: consumerCode(
        "spectral",
        "wattsStrogatzGraph",
        "wattsStrogatzGraph({ n: 10, k: 4, beta: 0.3, seed: 42 })",
        `const result = spectral(graph, { seed: 42 });`,
    ),
};
