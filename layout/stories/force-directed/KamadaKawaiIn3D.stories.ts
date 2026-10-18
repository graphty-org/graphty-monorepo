import { kamadaKawai } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { consumerCode, type GraphArgs, graphArgTypes, makeGraph } from "../utils/graphs.js";
import { show3D } from "../utils/visualization-3d.js";

const meta: Meta<GraphArgs> = {
    title: "Force-directed/Kamada-Kawai in 3D",
    // The component id from before the sections, so every story id (and its approved screenshot) stays the same
    id: "layout3d",
    // The section Overview documents this page, so it adds no Docs page of its own.
    tags: ["!autodocs"],
    argTypes: {
        ...graphArgTypes,
    },
    args: { graph: "small world", nodeCount: 10, seed: 42 },
    parameters: {
        docs: {
            description: {
                component: "kamadaKawai(graph, { dim: 3 }) matches hop distances in three dimensions.",
            },
        },
    },
};

export default meta;

export const KamadaKawai3D: StoryObj<GraphArgs> = {
    name: "Kamada-Kawai in 3D",
    render: ({ graph, nodeCount, seed }) => {
        const g = makeGraph(graph, nodeCount, seed);
        const call = "kamadaKawai(graph, { dim: 3 })";
        return show3D(
            g.sample,
            kamadaKawai(g.graph, { dim: 3 }),
            call,
            `Kamada-Kawai in three dimensions. Graph: ${g.call}.`,
        );
    },
    parameters: consumerCode(
        "kamadaKawai",
        "wattsStrogatzGraph",
        "wattsStrogatzGraph({ n: 10, k: 4, beta: 0.3, seed: 42 })",
        `const result = kamadaKawai(graph, { dim: 3 });`,
    ),
};
