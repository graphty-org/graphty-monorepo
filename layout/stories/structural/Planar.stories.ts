import { randomApollonianGraph } from "@graphty/graph-samples/generators";
import { planar } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { consumerCode, toSample } from "../utils/graphs.js";
import { show2D } from "../utils/visualization.js";

interface PlanarArgs {
    nodeCount: number;
    seed: number;
}

const meta: Meta<PlanarArgs> = {
    title: "Structural/Planar",
    // The component id from before the sections, so every story id (and its approved screenshot) stays the same
    id: "layout2d",
    argTypes: {
        nodeCount: { control: { type: "range", min: 4, max: 40, step: 1 }, description: "Number of nodes" },
        seed: { control: { type: "number" }, description: "Seed of the random Apollonian network" },
    },
    args: { nodeCount: 20, seed: 42 },
    parameters: {
        docs: {
            description: {
                component:
                    "planar(graph) draws a planar graph with straight edges and no two edges crossing. It throws " +
                    "E_NOT_PLANAR for a graph that cannot be drawn that way.",
            },
        },
    },
};

export default meta;

export const Planar: StoryObj<PlanarArgs> = {
    name: "Planar",
    render: ({ nodeCount, seed }) => {
        const g = toSample(
            randomApollonianGraph({ n: nodeCount, seed }),
            `randomApollonianGraph({ n: ${nodeCount}, seed: ${seed} })`,
        );
        return show2D(
            g.sample,
            planar(g.graph),
            "planar(graph)",
            `A random Apollonian network (always planar) drawn with no two edges crossing. The drawing is scaled ` +
                `to fill the frame. Graph: ${g.call}.`,
        );
    },
    parameters: consumerCode(
        "planar",
        "randomApollonianGraph",
        "randomApollonianGraph({ n: 20, seed: 42 })",
        "const result = planar(graph);",
    ),
};
