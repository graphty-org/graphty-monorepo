import { forceAtlas2 } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { consumerCode, type GraphArgs, graphArgTypes, makeGraph } from "../utils/graphs.js";
import { show3D } from "../utils/visualization-3d.js";

interface ForceAtlas2_3DArgs extends GraphArgs {
    iterations: number;
    gravity: number;
    scalingRatio: number;
}

const meta: Meta<ForceAtlas2_3DArgs> = {
    title: "Force-directed/ForceAtlas2 in 3D",
    // The component id from before the sections, so every story id (and its approved screenshot) stays the same
    id: "layout3d",
    argTypes: {
        ...graphArgTypes,
        iterations: {
            control: { type: "range", min: 10, max: 500, step: 10 },
            description: "maxIter: iterations to run",
        },
        gravity: { control: { type: "range", min: 0, max: 10, step: 0.5 }, description: "Pull toward the center" },
        scalingRatio: { control: { type: "range", min: 0.5, max: 10, step: 0.5 }, description: "Repulsion strength" },
    },
    args: { graph: "small world", nodeCount: 10, seed: 42, iterations: 100, gravity: 1, scalingRatio: 2 },
    parameters: {
        docs: {
            description: {
                component: "forceAtlas2(graph, { dim: 3 }) runs the same ForceAtlas2 simulation in three dimensions.",
            },
        },
    },
};

export default meta;

export const ForceAtlas2_3D: StoryObj<ForceAtlas2_3DArgs> = {
    name: "ForceAtlas2 in 3D",
    render: ({ graph, nodeCount, seed, iterations, gravity, scalingRatio }) => {
        const g = makeGraph(graph, nodeCount, seed);
        const call = `forceAtlas2(graph, { dim: 3, maxIter: ${iterations}, gravity: ${gravity}, scalingRatio: ${scalingRatio}, seed: ${seed} })`;
        return show3D(
            g.sample,
            forceAtlas2(g.graph, { dim: 3, maxIter: iterations, gravity, scalingRatio, seed }),
            call,
            `ForceAtlas2 in three dimensions. Graph: ${g.call}.`,
        );
    },
    parameters: consumerCode(
        "forceAtlas2",
        "wattsStrogatzGraph",
        "wattsStrogatzGraph({ n: 10, k: 4, beta: 0.3, seed: 42 })",
        `const result = forceAtlas2(graph, { dim: 3, maxIter: 100, gravity: 1, scalingRatio: 2, seed: 42 });`,
    ),
};
