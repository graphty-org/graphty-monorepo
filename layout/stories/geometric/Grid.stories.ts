import { grid } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { consumerCode, type GraphArgs, graphArgTypes, makeGraph } from "../utils/graphs.js";
import { show2D } from "../utils/visualization.js";

interface GridArgs extends GraphArgs {
    columns: number;
}

const meta: Meta<GridArgs> = {
    title: "Geometric/Grid",
    // The component id from before the sections, so every story id (and its approved screenshot) stays the same
    id: "layout2d",
    // The section Overview documents this page, so it adds no Docs page of its own.
    tags: ["!autodocs"],
    argTypes: {
        ...graphArgTypes,
        columns: {
            control: { type: "range", min: 0, max: 10, step: 1 },
            description: "Nodes per row; 0 leaves it out (a square grid)",
        },
    },
    args: { graph: "grid", nodeCount: 16, seed: 42, columns: 0 },
    parameters: {
        docs: {
            description: {
                component:
                    "grid(graph, options) places the nodes row by row on an evenly spaced lattice, in node order. columns sets the row length; the default is the smallest square that holds every node. It ignores the edges.",
            },
        },
    },
};

export default meta;

export const Grid: StoryObj<GridArgs> = {
    render: ({ graph, nodeCount, seed, columns }) => {
        const g = makeGraph(graph, nodeCount, seed);
        const call = columns > 0 ? `grid(graph, { columns: ${columns} })` : "grid(graph)";
        return show2D(
            g.sample,
            grid(g.graph, columns > 0 ? { columns } : {}),
            call,
            `Nodes row by row on a lattice, in node order. The drawing is scaled to fill the frame. Graph: ${g.call}.`,
        );
    },
    parameters: consumerCode("grid", "gridGraph", "gridGraph({ rows: 4, cols: 4 })", `const result = grid(graph);`),
};
