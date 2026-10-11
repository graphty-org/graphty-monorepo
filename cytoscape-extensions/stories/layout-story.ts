/**
 * The render of every layout story: one graphty layout on a seeded network, its nodes colored by the generator's
 * community when it has one, so the groups a layout separates show.
 */

import { SIMULATION_LAYOUTS } from "./catalog.js";
import { renderDemo, type RunArgs, showWorking, SIZES } from "./demo.js";
import { colorBy, placeByGroup, plainReason, runLayout } from "./run.js";

export interface LayoutArgs extends RunArgs {
    layout: string;
    /**
     * Simulations: 0 runs until the layout settles (capped generously by the node count); a number fixes the
     * iterations (iterations for Fruchterman-Reingold, maxIter for the others).
     */
    iterations: number;
    animate: boolean;
}

/**
 * Story render: lays the network out with the chosen layout. On 2,000 nodes or more without animation, a CPU
 * simulation still steps one frame at a time under the working overlay (the extension's animated mode), so the page
 * stays live; a GPU run steps asynchronously anyway. A run the runtime cannot do (a GPU-only layout, or gpu: require,
 * without WebGPU) draws the network with each group in its own place and says why.
 * @param args - the story args
 * @returns the story root
 */
export function renderLayout(args: LayoutArgs): HTMLElement {
    // 2,000 nodes and up: a CPU run until settled takes long enough to hold the page past a capture's 30 s render wait
    const large = SIZES[args.size] >= 2_000;
    return renderDemo(args, `graphty-${args.layout}`, async ({ cy, gpuMode, extra }) => {
        colorBy(cy, "community");
        // only where the CPU is sure to run: stepping a GPU run frame by frame waits on a readback and a redraw each
        // frame (137 s instead of 26 s at 10,000 nodes), and without stepping it is asynchronous anyway
        const cpuOnly = gpuMode === "off" || !("gpu" in navigator);
        const simulation = (SIMULATION_LAYOUTS as readonly string[]).includes(args.layout);
        const stepped = simulation && large && !args.animate && cpuOnly;
        // the overlay hides the canvas, so a stepped run need not draw it: unmounted, the core keeps the positions and
        // draws nothing until it is mounted again (drawing 2,000 nodes every frame cost six times the layout itself)
        const container = cy.container();
        if (stepped) {
            cy.unmount();
        }
        // after unmount(), which empties the container
        const hide =
            container && large && !args.animate && simulation
                ? showWorking(container, cy, `graphty-${args.layout} on ${cy.nodes().length.toLocaleString()} nodes`)
                : undefined;
        try {
            return await runLayout(cy, args.layout, {
                gpuMode,
                seed: args.seed,
                iterations: args.iterations,
                animate: args.animate || stepped,
                // about a quarter second of CPU work per frame (the simulations cost about n^2 per iteration: 35 ms
                // at 2,000 nodes), since writing the positions back costs about 90 ms a frame at 2,000 nodes; fit:
                // false, as there is no view to fit
                extra: stepped
                    ? { refresh: Math.max(2, Math.round(3e7 / SIZES[args.size] ** 2)), fit: false, ...extra }
                    : extra,
            });
        } catch (e) {
            const { message } = e as Error;
            if (/no CPU simulation|gpu: "require"/.test(message)) {
                // a browser without a GPU takes longer than a capture waits to draw 160,000 edges: at 50,000 nodes, the
                // nodes only
                const many = SIZES[args.size] >= 50_000;
                const edges = cy.edges().length;
                if (many) {
                    cy.edges().remove();
                }
                // the network stays on the canvas: its groups, each in its own place
                placeByGroup(cy, "community");
                const why =
                    SIZES[args.size] >= 50_000 && gpuMode === "require"
                        ? "; at this size the story needs WebGPU: the CPU simulations compare every pair of nodes and would take hours"
                        : "";
                return {
                    ran: "not run",
                    detail: `${plainReason(message)}${why}. The nodes are drawn by group (colors), each group in its own place: a quick placement, not the layout${many ? `; the ${edges.toLocaleString()} edges are not drawn` : ""}.`,
                    ...(many ? { fit: "nodes" as const } : {}),
                };
            }
            throw e;
        } finally {
            if (stepped && container) {
                cy.mount(container);
            }
            hide?.();
        }
    });
}
