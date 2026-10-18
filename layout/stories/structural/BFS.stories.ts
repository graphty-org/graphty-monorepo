import { bfs } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { consumerCode, type GraphArgs, graphArgTypes, makeGraph } from "../utils/graphs.js";
import { show2D } from "../utils/visualization.js";

interface BFSArgs extends GraphArgs {
    start: number;
    align: "vertical" | "horizontal";
}

const meta: Meta<BFSArgs> = {
    title: "Structural/BFS",
    // The component id from before the sections, so every story id (and its approved screenshot) stays the same
    id: "layout2d",
    // The section Overview documents this page, so it adds no Docs page of its own.
    tags: ["!autodocs"],
    argTypes: {
        ...graphArgTypes,
        start: { control: { type: "number", min: 0 }, description: "Index of the node in the first layer" },
        align: {
            control: { type: "inline-radio" },
            options: ["vertical", "horizontal"],
            description: "Layer direction",
        },
    },
    args: { graph: "tree", nodeCount: 10, seed: 42, start: 0, align: "vertical" },
    parameters: {
        docs: {
            description: {
                component:
                    'bfs(graph, options) puts the start node in the first layer, its neighbors in the next, and so on by hop distance. align: "vertical" stacks the layers left to right, "horizontal" top to bottom.',
            },
        },
    },
};

export default meta;

export const BFS: StoryObj<BFSArgs> = {
    render: ({ graph, nodeCount, seed, start, align }) => {
        const g = makeGraph(graph, nodeCount, seed);
        const first = Math.min(start, g.graph.nodeCount - 1);
        const call = `bfs(graph, { start: ${first}, align: "${align}" })`;
        return show2D(
            g.sample,
            bfs(g.graph, { start: first, align }),
            call,
            `Layers by hop distance from node ${first}. The drawing is scaled to fill the frame. Graph: ${g.call}.`,
        );
    },
    parameters: consumerCode(
        "bfs",
        "randomTreeGraph",
        "randomTreeGraph({ n: 10, seed: 42 })",
        `const result = bfs(graph, { start: 0, align: "vertical" });`,
    ),
};
