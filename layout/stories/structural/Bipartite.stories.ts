import { randomBipartiteGraph } from "@graphty/graph-samples/generators";
import { bipartite } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { consumerCode, toSample } from "../utils/graphs.js";
import { show2D } from "../utils/visualization.js";

interface BipartiteArgs {
    nodeCount: number;
    seed: number;
    align: "vertical" | "horizontal";
    aspectRatio: number;
}

const meta: Meta<BipartiteArgs> = {
    title: "Structural/Bipartite",
    // The component id from before the sections, so every story id (and its approved screenshot) stays the same
    id: "layout2d",
    // The section Overview documents this page, so it adds no Docs page of its own.
    tags: ["!autodocs"],
    argTypes: {
        nodeCount: { control: { type: "range", min: 4, max: 30, step: 1 }, description: "Number of nodes" },
        seed: { control: { type: "number" }, description: "Seed of the random bipartite graph" },
        align: {
            control: { type: "inline-radio" },
            options: ["vertical", "horizontal"],
            description: "Side direction",
        },
        aspectRatio: {
            control: { type: "range", min: 0.5, max: 3, step: 0.1 },
            description: "Width over height of the drawing",
        },
    },
    args: { nodeCount: 10, seed: 42, align: "vertical", aspectRatio: 4 / 3 },
    parameters: {
        docs: {
            description: {
                component:
                    "bipartite(graph, { top }) puts the nodes of top in one column and every other node in a second " +
                    'column (in rows with align: "horizontal"). top is an array of node indices, a node mask, or ' +
                    "the name of a boolean node column.",
            },
        },
    },
};

export default meta;

export const Bipartite: StoryObj<BipartiteArgs> = {
    render: ({ nodeCount, seed, align, aspectRatio }) => {
        const n1 = Math.ceil(nodeCount / 2);
        const n2 = nodeCount - n1;
        const g = toSample(
            randomBipartiteGraph({ n1, n2, p: 0.4, seed }),
            `randomBipartiteGraph({ n1: ${n1}, n2: ${n2}, p: 0.4, seed: ${seed} })`,
        );
        const top = Array.from({ length: n1 }, (_, i) => i);
        const call = `bipartite(graph, { top: [0 .. ${n1 - 1}], align: "${align}", aspectRatio: ${aspectRatio.toFixed(2)} })`;
        return show2D(
            g.sample,
            bipartite(g.graph, { top, align, aspectRatio }),
            call,
            `Nodes 0 to ${n1 - 1} on one side and the rest on the other. The drawing is scaled to fill the frame. ` +
                `Graph: ${g.call}.`,
        );
    },
    parameters: consumerCode(
        "bipartite",
        "randomBipartiteGraph",
        "randomBipartiteGraph({ n1: 5, n2: 5, p: 0.4, seed: 42 })",
        'const result = bipartite(graph, { top: [0, 1, 2, 3, 4], align: "vertical", aspectRatio: 4 / 3 });',
    ),
};
