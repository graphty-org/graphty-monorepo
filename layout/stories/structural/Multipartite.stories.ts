import { completeMultipartiteGraph } from "@graphty/graph-samples/generators";
import { multipartite } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { consumerCode, toSample } from "../utils/graphs.js";
import { show2D } from "../utils/visualization.js";

interface MultipartiteArgs {
    nodeCount: number;
    layers: number;
    align: "vertical" | "horizontal";
}

const meta: Meta<MultipartiteArgs> = {
    title: "Structural/Multipartite",
    // The component id from before the sections, so every story id (and its approved screenshot) stays the same
    id: "layout2d",
    argTypes: {
        nodeCount: { control: { type: "range", min: 4, max: 30, step: 1 }, description: "Number of nodes" },
        layers: { control: { type: "range", min: 2, max: 6, step: 1 }, description: "Number of layers" },
        align: {
            control: { type: "inline-radio" },
            options: ["vertical", "horizontal"],
            description: "Layer direction",
        },
    },
    args: { nodeCount: 12, layers: 3, align: "vertical" },
    parameters: {
        docs: {
            description: {
                component:
                    "multipartite(graph, { subsets }) puts each subset of nodes in its own layer, in the order given. " +
                    "subsets is required: arrays of node indices, or the name of a node column whose equal values " +
                    "form one layer.",
            },
        },
    },
};

export default meta;

export const Multipartite: StoryObj<MultipartiteArgs> = {
    name: "Multipartite",
    render: ({ nodeCount, layers, align }) => {
        const size = Math.ceil(nodeCount / layers);
        const sizes = Array.from({ length: layers }, (_, i) => Math.max(0, Math.min(size, nodeCount - i * size)));
        const g = toSample(
            completeMultipartiteGraph({ sizes }),
            `completeMultipartiteGraph({ sizes: ${JSON.stringify(sizes)} })`,
        );
        let next = 0;
        const subsets = sizes.map((s) => Array.from({ length: s }, () => next++));
        const call = `multipartite(graph, { subsets: ${JSON.stringify(subsets)}, align: "${align}" })`;
        return show2D(
            g.sample,
            multipartite(g.graph, { subsets, align }),
            call,
            `${layers} layers; every node is joined to every node of the other layers. The drawing is scaled to ` +
                `fill the frame. Graph: ${g.call}.`,
        );
    },
    parameters: consumerCode(
        "multipartite",
        "completeMultipartiteGraph",
        "completeMultipartiteGraph({ sizes: [4, 4, 4] })",
        'const result = multipartite(graph, { subsets: [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11]], align: "vertical" });',
    ),
};
