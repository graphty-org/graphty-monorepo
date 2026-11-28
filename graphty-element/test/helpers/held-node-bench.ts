/**
 * @file Mounting and frame timing shared by the held-node benches (test/browser/held-node-draw-order*.bench.test.ts).
 */
import type { Graphty } from "../../index.js";

/** The GPU flag set the run asked for; empty on the software renderer, as in CI. */
export const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";

/**
 * Frames timed per case. `scene.render` only hands the frame to the GPU process; on the software
 * renderer that process then draws every queued frame, about 0.05 s each here and 0.3 s on CI's
 * runner, and the next test's first frame waits for all of them (#9767). So the software renderer
 * times a few frames, whose numbers mean little there anyway.
 */
const FRAMES = ADAPTER === "" ? 3 : 120;

/** The most nodes a case loads on the software renderer, for the same reason. */
export const SOFTWARE_NODES = 2_000;

let element: Graphty | null = null;

/** Remove the element {@link mounted} last mounted, after each test. */
export function unmount(): void {
    element?.remove();
    element = null;
}

/**
 * The value at a fraction of the sorted list.
 * @param values - The values.
 * @param at - 0.5 for the median.
 * @returns The value.
 */
function quantile(values: readonly number[], at: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(at * sorted.length))] ?? Number.NaN;
}

/**
 * Time a run of frames of a scene.
 * @param graph - The graph.
 * @returns The median and 95th percentile, in ms.
 */
export function frameTimes(graph: Graphty["graph"]): string {
    const scene = graph.getScene();
    const renders: number[] = [];
    for (let frame = 0; frame < FRAMES; frame++) {
        const start = performance.now();
        scene.render();
        renders.push(performance.now() - start);
    }

    return `${quantile(renders, 0.5).toFixed(2)}/${quantile(renders, 0.95).toFixed(2)}ms`;
}

/**
 * Mount an element on a path with a grid of 2D nodes.
 * @param size - How many nodes.
 * @param path - The render path.
 * @returns The element.
 */
export async function mounted(size: number, path: "objects" | "batched"): Promise<Graphty> {
    const created = document.createElement("graphty-element");
    created.renderPath = path;
    created.style.width = "1280px";
    created.style.height = "720px";
    created.style.display = "block";
    document.body.appendChild(created);
    element = created;
    await created.updateComplete;
    const side = Math.ceil(Math.sqrt(size));
    await created.session.data.addNodes(
        Array.from({ length: size }, (_, id) => ({
            id,
            position: { x: (id % side) * 0.9, y: Math.floor(id / side) * 0.9, z: 0 },
        })),
    );
    await created.graph.setLayout("fixed", { dim: 3 });
    await created.setViewMode("2d");
    return created;
}
