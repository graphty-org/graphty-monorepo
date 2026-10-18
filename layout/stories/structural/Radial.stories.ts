import { radial } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { consumerCode, type GraphArgs, graphArgTypes, makeGraph } from "../utils/graphs.js";
import { show2D } from "../utils/visualization.js";

interface RadialArgs extends GraphArgs {
    root: number;
    arrangement: "rings" | "sectors";
}

const meta: Meta<RadialArgs> = {
    title: "Structural/Radial",
    // The component id from before the sections, so every story id (and its approved screenshot) stays the same
    id: "layout2d",
    // The section Overview documents this page, so it adds no Docs page of its own.
    tags: ["!autodocs"],
    argTypes: {
        ...graphArgTypes,
        root: {
            control: { type: "number", min: -1 },
            description: "Index of the center node; -1 leaves it out (most neighbors)",
        },
        arrangement: {
            control: { type: "inline-radio" },
            options: ["rings", "sectors"],
            description: "Spread each ring evenly, or keep each node in its parent's sector",
        },
    },
    args: { graph: "tree", nodeCount: 20, seed: 42, root: 0, arrangement: "rings" },
    parameters: {
        docs: {
            description: {
                component:
                    'radial(graph, options) puts root in the center, its neighbors on the first ring, and so on by hop distance. The default root is the node with the most neighbors. arrangement: "sectors" keeps each node inside its parent\'s slice of the circle, so the edges of the breadth-first tree never cross.',
            },
        },
    },
};

export default meta;

export const Radial: StoryObj<RadialArgs> = {
    render: ({ graph, nodeCount, seed, root, arrangement }) => {
        const g = makeGraph(graph, nodeCount, seed);
        const center = root < 0 ? null : Math.min(root, g.graph.nodeCount - 1);
        const call =
            center === null
                ? `radial(graph, { arrangement: "${arrangement}" })`
                : `radial(graph, { root: ${center}, arrangement: "${arrangement}" })`;
        return show2D(
            g.sample,
            radial(g.graph, { root: center, arrangement }),
            call,
            `Rings by hop distance from the center node. The drawing is scaled to fill the frame. Graph: ${g.call}.`,
        );
    },
    parameters: consumerCode(
        "radial",
        "randomTreeGraph",
        "randomTreeGraph({ n: 20, seed: 42 })",
        `const result = radial(graph, { root: 0, arrangement: "rings" });`,
    ),
};
