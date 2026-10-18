import { arf } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { consumerCode, type GraphArgs, graphArgTypes, makeGraph } from "../utils/graphs.js";
import { show2D } from "../utils/visualization.js";

interface ARFArgs extends GraphArgs {
    scaling: number;
    springStrength: number;
    iterations: number;
}

const meta: Meta<ARFArgs> = {
    title: "Force-directed/ARF",
    // The component id from before the sections, so every story id (and its approved screenshot) stays the same
    id: "layout2d",
    argTypes: {
        ...graphArgTypes,
        scaling: { control: { type: "range", min: 0.5, max: 5, step: 0.5 }, description: "Spread of the drawing" },
        springStrength: {
            control: { type: "range", min: 1.1, max: 5, step: 0.1 },
            description: "a: spring strength of an edge, > 1",
        },
        iterations: {
            control: { type: "range", min: 100, max: 2000, step: 100 },
            description: "maxIter: iterations to run",
        },
    },
    args: { graph: "small world", nodeCount: 10, seed: 42, scaling: 1, springStrength: 1.1, iterations: 1000 },
    parameters: {
        docs: {
            description: {
                component:
                    "arf(graph, options) is the attractive and repulsive forces layout (Geipel, 2007): every pair of nodes is joined by a spring, and the spring along an edge is a times stronger (a > 1). scaling spreads the drawing out; unlike most layouts, its result is not rescaled.",
            },
        },
    },
};

export default meta;

export const ARF: StoryObj<ARFArgs> = {
    name: "ARF",
    render: ({ graph, nodeCount, seed, scaling, springStrength, iterations }) => {
        const g = makeGraph(graph, nodeCount, seed);
        const call = `arf(graph, { scaling: ${scaling}, a: ${springStrength}, maxIter: ${iterations}, seed: ${seed} })`;
        return show2D(
            g.sample,
            arf(g.graph, { scaling, a: springStrength, maxIter: iterations, seed }),
            call,
            `Edges pull harder than the springs between unconnected nodes. The drawing is scaled to fill the frame. Graph: ${g.call}.`,
        );
    },
    parameters: consumerCode(
        "arf",
        "wattsStrogatzGraph",
        "wattsStrogatzGraph({ n: 10, k: 4, beta: 0.3, seed: 42 })",
        `const result = arf(graph, { scaling: 1, a: 1.1, maxIter: 1000, seed: 42 });`,
    ),
};
