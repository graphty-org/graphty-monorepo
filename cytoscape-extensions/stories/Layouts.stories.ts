import type { Meta, StoryObj } from "@storybook/html-vite";
import type { Core, LayoutOptions, Layouts } from "cytoscape";

import type { Backend } from "../src/index.js";
import { networkArgs, networkArgTypes, type Outcome, renderDemo, type RunArgs } from "./demo.js";

const STATIC = [
    "random",
    "circular",
    "spiral",
    "grid",
    "shell",
    "bipartite",
    "multipartite",
    "bfs",
    "radial",
    "planar",
    "spectral",
    "kamada-kawai",
    "arf",
] as const;
const SIMULATIONS = ["forceatlas2", "fruchterman-reingold", "spring-electrical"] as const;

interface LayoutArgs extends RunArgs {
    layout: string;
    /** Simulations: the fixed number of iterations (maxIter for ForceAtlas2, iterations for the others). */
    iterations: number;
    animate: boolean;
}

/**
 * Runs one "graphty-<layout>" layout and waits for layoutstop.
 * @param cy - the core
 * @param options - the layout options
 * @returns the backend the layout reports, when it reports one
 */
function runLayout(cy: Core, options: Record<string, unknown>): Promise<Backend | undefined> {
    return new Promise((resolve, reject) => {
        const l = cy.layout(options as unknown as LayoutOptions) as Layouts & { backend?: Backend };
        l.one("layouterror", (_e: unknown, err: Error) => reject(err));
        l.one("layoutstop", () => resolve(l.backend));
        l.run();
    });
}

/**
 * Story render: lays the network out with the chosen layout.
 * @param args - the story args
 * @returns the story root
 */
function render(args: LayoutArgs): HTMLElement {
    const simulation = (SIMULATIONS as readonly string[]).includes(args.layout);
    return renderDemo(args, `graphty-${args.layout}`, async ({ cy, gpuMode, extra }): Promise<Outcome> => {
        if (args.layout === "kamada-kawai" && cy.nodes().length > 2_000) {
            throw new Error("kamada-kawai needs memory in the square of the node count; pick 2,000 nodes or fewer");
        }
        const options: Record<string, unknown> = { name: `graphty-${args.layout}`, seed: args.seed };
        if (simulation) {
            Object.assign(options, {
                gpu: gpuMode,
                animate: args.animate,
                [args.layout === "forceatlas2" ? "maxIter" : "iterations"]: args.iterations,
            });
        } else if (args.backend === "gpu") {
            throw new Error(`graphty-${args.layout} has no GPU implementation; only the force simulations do`);
        }
        const backend = await runLayout(cy, { ...options, ...extra });
        if (!backend) {
            return { ran: "cpu", detail: "a static layout: there is no GPU implementation" };
        }
        return { ran: backend.ran, detail: backend.ran === "gpu" ? backend.device : backend.reason };
    });
}

const meta: Meta<LayoutArgs> = {
    title: "Demo/Layouts",
    render,
    argTypes: {
        ...networkArgTypes,
        iterations: { control: { type: "number", min: 1, step: 10 } },
        animate: { control: "boolean" },
    },
};
export default meta;

type Story = StoryObj<LayoutArgs>;

/** The force simulations: the ones that run on the GPU. */
export const ForceSimulations: Story = {
    args: { ...networkArgs, layout: "forceatlas2", iterations: 100, animate: false },
    argTypes: { layout: { control: "select", options: SIMULATIONS } },
};

/** The static layouts: CPU only. The backend control does not apply. */
export const StaticLayouts: Story = {
    args: { ...networkArgs, layout: "circular", iterations: 100, animate: false },
    argTypes: {
        layout: { control: "select", options: STATIC },
        backend: { table: { disable: true } },
        acceptSoftware: { table: { disable: true } },
        iterations: { table: { disable: true } },
    },
};
