import { kamadaKawai } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { consumerCode, type GraphArgs, graphArgTypes, makeGraph } from "../utils/graphs.js";
import { show2D } from "../utils/visualization.js";

const meta: Meta<GraphArgs> = {
    title: "Force-directed/Kamada-Kawai",
    // The component id from before the sections, so every story id (and its approved screenshot) stays the same
    id: "layout2d",
    argTypes: {
        ...graphArgTypes,
    },
    args: { graph: "small world", nodeCount: 10, seed: 42 },
    parameters: {
        docs: {
            description: {
                component:
                    "kamadaKawai(graph, options) places the nodes so that their distances on the page match their hop distances in the graph as closely as it can (Kamada and Kawai, 1989). It reads edge weights by default. Its cost grows with the square of the node count.",
            },
        },
    },
};

export default meta;

export const KamadaKawai: StoryObj<GraphArgs> = {
    name: "Kamada-Kawai",
    render: ({ graph, nodeCount, seed }) => {
        const g = makeGraph(graph, nodeCount, seed);
        const call = "kamadaKawai(graph)";
        return show2D(
            g.sample,
            kamadaKawai(g.graph),
            call,
            `Distances on the page follow the hop distances in the graph. The drawing is scaled to fill the frame. Graph: ${g.call}.`,
        );
    },
    parameters: consumerCode(
        "kamadaKawai",
        "wattsStrogatzGraph",
        "wattsStrogatzGraph({ n: 10, k: 4, beta: 0.3, seed: 42 })",
        `const result = kamadaKawai(graph);`,
    ),
};
