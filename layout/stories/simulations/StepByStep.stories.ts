import { createSimulation } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { type GraphArgs, graphArgTypes, makeGraph } from "../utils/graphs.js";
import { createSvg, drawGraph, figure } from "../utils/visualization.js";

interface StepArgs extends GraphArgs {
    steps: number;
    animate: boolean;
}

type SimulationName = "forceatlas2" | "fruchtermanReingold";

/** The option that sets each simulation's iteration budget. */
const BUDGET: Record<SimulationName, string> = { forceatlas2: "maxIter", fruchtermanReingold: "iterations" };

function source(type: SimulationName): { docs: { source: { code: string; language: string } } } {
    const code = `import { fromEdgeArrays } from "@graphty/graph-format";
import { wattsStrogatzGraph } from "@graphty/graph-samples/generators";
import { createSimulation } from "@graphty/layout";

const graph = fromEdgeArrays(wattsStrogatzGraph({ n: 20, k: 4, beta: 0.3, seed: 42 }));
const positions = new Float32Array(3 * graph.nodeCount).fill(NaN); // x, y, z per node

const sim = createSimulation("${type}", { ${BUDGET[type]}: 100, seed: 42 });
sim.load(graph, positions); // fills every NaN row from the seed

function frame() {
    sim.step(); // one iteration; positions now holds the new coordinates
    draw(positions); // your renderer
    if (sim.settled) {
        sim.dispose();
    } else {
        requestAnimationFrame(frame);
    }
}
requestAnimationFrame(frame);
`;
    return { docs: { source: { code, language: "ts" } } };
}

/**
 * Runs the simulation: with `animate` off, `steps` iterations at once and one drawing; with it on, one
 * iteration per animation frame, redrawn each time, until `steps` or the simulation settles.
 */
function render(type: SimulationName, { graph, nodeCount, seed, steps, animate }: StepArgs): HTMLElement {
    const g = makeGraph(graph, nodeCount, seed);
    const positions = new Float32Array(3 * g.graph.nodeCount).fill(NaN);
    const sim = createSimulation(type, { [BUDGET[type]]: steps, seed });
    sim.load(g.graph, positions);

    const call = `createSimulation("${type}", { ${BUDGET[type]}: ${steps}, seed: ${seed} })`;
    const svg = createSvg();
    const root = figure(call, svg, "");
    const caption = root.querySelector("figcaption") as HTMLElement;
    let done = 0;
    const redraw = (): void => {
        drawGraph(svg, g.sample, { positions, dim: 3 }, `${call}: ${g.graph.nodeCount} nodes`);
        caption.textContent =
            `After ${done} of at most ${steps} iterations${sim.settled ? ", settled" : ""}. Each step() moves the ` +
            `nodes in the position array you own; the drawing is scaled to fill the frame. Graph: ${g.call}.`;
    };

    if (!animate) {
        void sim.step(steps);
        done = steps;
        redraw();
        sim.dispose();
        return root;
    }
    redraw();
    const frame = (): void => {
        if (!root.isConnected) {
            sim.dispose(); // the story was closed
            return;
        }
        void sim.step();
        done++;
        redraw();
        if (sim.settled || done >= steps) {
            sim.dispose();
        } else {
            requestAnimationFrame(frame);
        }
    };
    requestAnimationFrame(frame);
    return root;
}

const meta: Meta<StepArgs> = {
    title: "Simulations/Step by step",
    argTypes: {
        ...graphArgTypes,
        steps: {
            control: { type: "range", min: 1, max: 300, step: 1 },
            description: "Iteration budget; with animate off, how many iterations to run before drawing",
        },
        animate: { control: { type: "boolean" }, description: "Run one iteration per animation frame and redraw each" },
    },
    args: { graph: "small world", nodeCount: 20, seed: 42, steps: 100, animate: false },
    parameters: {
        docs: {
            description: {
                component:
                    "createSimulation(type, options) returns a force simulation you advance yourself: load(graph, " +
                    "positions) hands it the graph and a Float32Array you own, every step() runs one iteration and " +
                    "writes the new coordinates into that array, and settled turns true at the budget or once the " +
                    "drawing stops moving. Drag the steps control to see the drawing after that many iterations, or " +
                    "turn on animate to watch it run frame by frame.",
            },
        },
    },
};

export default meta;

type Story = StoryObj<StepArgs>;

export const ForceAtlas2: Story = {
    name: "ForceAtlas2",
    render: (args) => render("forceatlas2", args),
    parameters: source("forceatlas2"),
};

export const FruchtermanReingold: Story = {
    name: "Fruchterman-Reingold",
    render: (args) => render("fruchtermanReingold", args),
    parameters: source("fruchtermanReingold"),
};
