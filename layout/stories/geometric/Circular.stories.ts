import { circular } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { consumerCode, type GraphArgs, graphArgTypes, makeGraph } from "../utils/graphs.js";
import { show2D } from "../utils/visualization.js";

const meta: Meta<GraphArgs> = {
    title: "Geometric/Circular",
    // The component id from before the sections, so every story id (and its approved screenshot) stays the same
    id: "layout2d",
    argTypes: {
        ...graphArgTypes,
    },
    args: { graph: "cycle", nodeCount: 10, seed: 42 },
    parameters: {
        docs: {
            description: {
                component:
                    "circular(graph, options) places the nodes evenly on a circle, in node order, starting on the positive x axis. scale is the radius and center the middle. It ignores the edges.",
            },
        },
    },
};

export default meta;

export const Circular: StoryObj<GraphArgs> = {
    name: "Circular",
    render: ({ graph, nodeCount, seed }) => {
        const g = makeGraph(graph, nodeCount, seed);
        const call = "circular(graph)";
        return show2D(
            g.sample,
            circular(g.graph),
            call,
            `Nodes evenly spaced on a circle in node order, starting on the positive x axis. The drawing is scaled to fill the frame. Graph: ${g.call}.`,
        );
    },
    parameters: consumerCode(
        "circular",
        "cycleGraph",
        "cycleGraph({ n: 10 })",
        `const result = circular(graph, { scale: 1 });`,
    ),
};
