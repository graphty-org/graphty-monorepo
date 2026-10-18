import { shell } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { consumerCode, type GraphArgs, graphArgTypes, makeGraph } from "../utils/graphs.js";
import { show2D } from "../utils/visualization.js";

interface ShellArgs extends GraphArgs {
    shells: number;
}

/** Node 0 alone in the center, then the other nodes split in node order over the remaining shells. */
function shellLists(nodeCount: number, shells: number): number[][] {
    const rest = Array.from({ length: nodeCount - 1 }, (_, i) => i + 1);
    const perShell = Math.ceil(rest.length / Math.max(1, shells - 1));
    const lists = [[0]];
    for (let i = 0; i < rest.length; i += perShell) {
        lists.push(rest.slice(i, i + perShell));
    }
    return lists;
}

const meta: Meta<ShellArgs> = {
    title: "Geometric/Shell",
    // The component id from before the sections, so every story id (and its approved screenshot) stays the same
    id: "layout2d",
    // The section Overview documents this page, so it adds no Docs page of its own.
    tags: ["!autodocs"],
    argTypes: {
        ...graphArgTypes,
        shells: { control: { type: "range", min: 2, max: 6, step: 1 }, description: "Number of shells" },
    },
    args: { graph: "small world", nodeCount: 12, seed: 42, shells: 3 },
    parameters: {
        docs: {
            description: {
                component:
                    "shell(graph, { nlist }) places the nodes on concentric circles, innermost first. nlist lists the " +
                    "shells as arrays of node indices, or names a node column whose equal values form one shell. A " +
                    "shell of one node sits on the center.",
            },
        },
    },
};

export default meta;

export const Shell: StoryObj<ShellArgs> = {
    render: ({ graph, nodeCount, seed, shells }) => {
        const g = makeGraph(graph, nodeCount, seed);
        const nlist = shellLists(g.graph.nodeCount, shells);
        const call = `shell(graph, { nlist: ${JSON.stringify(nlist)} })`;
        return show2D(
            g.sample,
            shell(g.graph, { nlist }),
            call,
            `Node 0 in the center and the others on ${nlist.length - 1} rings around it. The drawing is scaled to ` +
                `fill the frame. Graph: ${g.call}.`,
        );
    },
    parameters: consumerCode(
        "shell",
        "wattsStrogatzGraph",
        "wattsStrogatzGraph({ n: 12, k: 4, beta: 0.3, seed: 42 })",
        "const result = shell(graph, { nlist: [[0], [1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11]] });",
    ),
};
