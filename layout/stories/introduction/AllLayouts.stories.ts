import type { GraphSnapshot } from "@graphty/graph-format";
import { type LayoutEntry, type LayoutResult, LAYOUTS } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { type GraphArgs, graphArgTypes, makeGraph } from "../utils/graphs.js";
import { createSvg, drawGraph, figure } from "../utils/visualization.js";

const CODE = `import { fromEdgeArrays } from "@graphty/graph-format";
import { randomTreeGraph } from "@graphty/graph-samples/generators";
import { LAYOUTS, type LayoutResult } from "@graphty/layout";

const graph = fromEdgeArrays(randomTreeGraph({ n: 16, seed: 42 }));

// every layout that runs as one call and needs no options
for (const entry of Object.values(LAYOUTS)) {
    if (entry.fn !== null && entry.requiredOptions.length === 0) {
        const run = entry.fn as (g: typeof graph) => LayoutResult;
        const result = run(graph);
        console.log(entry.name, result.n);
    }
}
`;

/** One line of facts from the catalog entry. */
function facts(entry: LayoutEntry): string {
    const parts = [];
    if (entry.weights !== "never") {
        parts.push(`weights: ${entry.weights}`);
    }
    if (entry.simulation !== null) {
        parts.push(`steppable: "${entry.simulation}"`);
    }
    if (entry.accelerator !== null) {
        parts.push("GPU");
    }
    return parts.join(" | ");
}

/** The tile of one catalog entry: its drawing, or why it cannot be drawn with no options. */
function tile(entry: LayoutEntry, g: ReturnType<typeof makeGraph>): HTMLElement {
    const box = document.createElement("div");
    box.style.cssText = "display: flex; flex-direction: column; gap: 4px; font-family: system-ui, sans-serif;";
    const name = document.createElement("code");
    name.textContent = entry.name;
    name.style.cssText = "font-size: 14px; font-weight: 600; color: #1e293b;";
    const note = document.createElement("div");
    note.style.cssText = "font-size: 13px; color: #334155; min-height: 18px;";
    note.textContent = facts(entry);

    let reason: string | null = null;
    if (entry.fn === null) {
        reason = entry.requiresAccelerator
            ? "Runs only as a simulation on an accelerator (WebGPU)."
            : "Runs only as a simulation.";
    } else if (entry.requiredOptions.length > 0) {
        reason = `Needs the ${entry.requiredOptions.join(", ")} option.`;
    }
    const svg = createSvg(220);
    if (reason === null && entry.fn !== null) {
        try {
            const run = entry.fn as (graph: GraphSnapshot) => LayoutResult;
            drawGraph(svg, g.sample, run(g.graph), `${entry.name} of ${g.call}`);
        } catch (error) {
            const { code } = error as { code?: string };
            reason = `Throws ${code ?? String(error)} on this graph.`;
        }
    }
    if (reason !== null) {
        const empty = document.createElement("div");
        empty.textContent = reason;
        empty.style.cssText =
            "width: 220px; height: 220px; box-sizing: border-box; padding: 16px; display: flex; align-items: center;" +
            " text-align: center; background: #f1f5f9; border-radius: 8px; font-size: 14px; color: #334155;";
        box.append(name, empty, note);
    } else {
        box.append(name, svg, note);
    }
    return box;
}

const meta: Meta<GraphArgs> = {
    title: "Introduction/All layouts",
    // The section Overview documents this page, so it adds no Docs page of its own.
    tags: ["!autodocs"],
    argTypes: graphArgTypes,
    args: { graph: "tree", nodeCount: 16, seed: 42 },
    parameters: {
        docs: {
            description: {
                component:
                    "LAYOUTS is the machine-readable catalog of every layout in @graphty/layout: for each one, its " +
                    "one-shot function (fn), the simulation type that runs it step by step, whether it reads edge " +
                    "weights, the options it cannot do without, and whether a GPU accelerator can run it. An " +
                    "integration registers its layouts from LAYOUTS instead of keeping its own list.",
            },
        },
    },
};

export default meta;

export const AllLayouts: StoryObj<GraphArgs> = {
    name: "All layouts",
    render: ({ graph, nodeCount, seed }) => {
        const g = makeGraph(graph, nodeCount, seed);
        const grid = document.createElement("div");
        grid.style.cssText = "display: grid; grid-template-columns: repeat(4, 220px); gap: 20px;";
        for (const entry of Object.values(LAYOUTS) as LayoutEntry[]) {
            grid.appendChild(tile(entry, g));
        }
        return figure(
            "Object.values(LAYOUTS)",
            grid,
            `Every entry of the LAYOUTS catalog, each run with no options on the same graph. Under each drawing: ` +
                `whether it reads edge weights, the simulation type that runs it step by step, and whether a GPU ` +
                `can run it. Graph: ${g.call}.`,
        );
    },
    parameters: { docs: { source: { code: CODE, language: "ts" } } },
};
