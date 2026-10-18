import { forceAtlas2 } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { consumerCode, type GraphArgs, graphArgTypes, makeGraph } from "../utils/graphs.js";
import { show2D } from "../utils/visualization.js";

interface ForceAtlas2Args extends GraphArgs {
    iterations: number;
    gravity: number;
    scalingRatio: number;
}

const meta: Meta<ForceAtlas2Args> = {
    title: "Force-directed/ForceAtlas2",
    // The component id from before the sections, so every story id (and its approved screenshot) stays the same
    id: "layout2d",
    // The section Overview documents this page, so it adds no Docs page of its own.
    tags: ["!autodocs"],
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
                component:
                    "forceAtlas2(graph, options) runs the ForceAtlas2 force simulation (Jacomy et al., 2014) for maxIter iterations and returns the final drawing. gravity pulls nodes toward the center; scalingRatio sets how strongly they repel. To draw every iteration, see Simulations.",
            },
        },
    },
};

export default meta;

export const ForceAtlas2: StoryObj<ForceAtlas2Args> = {
    name: "ForceAtlas2",
    render: ({ graph, nodeCount, seed, iterations, gravity, scalingRatio }) => {
        const g = makeGraph(graph, nodeCount, seed);
        const call = `forceAtlas2(graph, { maxIter: ${iterations}, gravity: ${gravity}, scalingRatio: ${scalingRatio}, seed: ${seed} })`;
        return show2D(
            g.sample,
            forceAtlas2(g.graph, { maxIter: iterations, gravity, scalingRatio, seed }),
            call,
            `Connected nodes pull together and every pair pushes apart until the drawing settles. The drawing is scaled to fill the frame. Graph: ${g.call}.`,
        );
    },
    parameters: consumerCode(
        "forceAtlas2",
        "wattsStrogatzGraph",
        "wattsStrogatzGraph({ n: 10, k: 4, beta: 0.3, seed: 42 })",
        `const result = forceAtlas2(graph, { maxIter: 100, gravity: 1, scalingRatio: 2, seed: 42 });`,
    ),
};
