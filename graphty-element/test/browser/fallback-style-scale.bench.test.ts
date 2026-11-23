/**
 * @file What a style the node batches cannot draw costs on each render path, at 1,000 to 40,000
 * nodes (a grid, about two edges a node): a border, a glow and an outline, each added to every node of a loaded graph (a restyle) and
 * set before the nodes arrive (a styled load). Under `renderPath: "batched"` such a style gives every
 * row a `Node` of its own; each row used to be painted with its own pass over the scene's lists, so
 * bordering 20,000 nodes took 29-49 s against 1-2 s on objects.
 *
 * Runs in the `browser-bench` project, never under coverage:
 *     npx vitest run --project=browser-bench test/browser/fallback-style-scale.bench.test.ts
 * Each case prints `[fallback-style-scale]` and a `bench-row` (appended to
 * `benchmarks/results/browser-<host>.jsonl`): milliseconds until `waitForPainted()`, and the
 * teardowns made. VITE_BENCH_SIZES and VITE_BENCH_STYLES (comma separated) choose a subset; with
 * GRAPHTY_BROWSER_GPU set the sizes default to 1,000, 10,000, 20,000 and 40,000, else to the first two. Recorded, never
 * asserted, except that each case ends with every row drawn by its own `Node` and makes no more
 * teardowns than a repaint has batches.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { REPAINT_FRAMES } from "../../src/managers/UpdateManager";

const env = import.meta.env as Record<string, string | undefined>;
// On the software renderer CI draws with, 20,000 and 40,000 nodes take minutes a case: those need a GPU.
const SIZES = (
    env.VITE_BENCH_SIZES ?? (env.GRAPHTY_BROWSER_GPU === undefined ? "1000,10000" : "1000,10000,20000,40000")
)
    .split(",")
    .map(Number);
const STYLES: Record<string, Record<string, unknown>> = {
    border: { "node.borderColor": "#000000", "node.borderWidth": 0.1 },
    glow: { "node.glow": "#ff00ff" },
    outline: { "node.outline": "#000000" },
};
const CHOSEN = (env.VITE_BENCH_STYLES ?? Object.keys(STYLES).join(",")).split(",");
const PATHS = ["objects", "batched"] as const;

/**
 * `size` nodes on a square grid, each linked to its right and lower neighbors.
 * @param size - How many.
 * @returns The records.
 */
function grid(size: number): {
    nodes: { id: string; position: { x: number; y: number; z: number } }[];
    edges: { src: string; dst: string }[];
} {
    const side = Math.ceil(Math.sqrt(size));
    const id = (at: number): string => `n${String(at)}`;
    const nodes = Array.from({ length: size }, (_unused, at) => ({
        id: id(at),
        position: { x: (at % side) * 2, y: Math.floor(at / side) * 2, z: 0 },
    }));
    const edges: { src: string; dst: string }[] = [];
    for (let at = 0; at < size; at++) {
        if ((at + 1) % side !== 0 && at + 1 < size) {
            edges.push({ src: id(at), dst: id(at + 1) });
        }

        if (at + side < size) {
            edges.push({ src: id(at), dst: id(at + side) });
        }
    }

    return { nodes, edges };
}

describe("a style the batches cannot draw, on every node", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        (globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setLayout("fixed", { dim: 3 });
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Time `work` until the canvas has its last batch, counting teardowns.
     * @param work - The change.
     * @returns Milliseconds and teardowns.
     */
    async function measure(work: () => Promise<void>): Promise<{ ms: number; teardowns: number }> {
        const { meshes } = graph.scene;
        const splice = meshes.splice.bind(meshes);
        let emptied = 0;
        meshes.splice = (...args: Parameters<typeof splice>): ReturnType<typeof splice> => {
            if (args.length === 1 && args[0] === 0) {
                emptied++;
            }

            return splice(...args);
        };
        const start = performance.now();
        try {
            await work();
            await operationQueueOf(graph).waitForCompletion();
            await graph.waitForPainted();
        } finally {
            delete (meshes as { splice?: unknown }).splice;
        }

        return { ms: performance.now() - start, teardowns: emptied / 2 };
    }

    for (const style of CHOSEN) {
        for (const size of SIZES) {
            for (const path of PATHS) {
                for (const kind of ["restyle", "styled load"] as const) {
                    it(`${kind}, ${style}, ${String(size)} nodes, ${path}`, async () => {
                        graph.setRenderPath(path);
                        const layer = {
                            name: style,
                            target: "node" as const,
                            selector: { match: "everything" as const },
                            set: STYLES[style],
                        };
                        const { nodes, edges } = grid(size);
                        const load = async (): Promise<void> => {
                            await graph.addNodes(nodes);
                            await graph.addEdges(edges);
                        };
                        if (kind === "restyle") {
                            await load();
                            await graph.waitForPainted();
                        } else {
                            await graph.getSession().styles.add(layer);
                            await graph.waitForPainted();
                        }

                        const { ms, teardowns } = await measure(async () => {
                            await (kind === "restyle" ? graph.getSession().styles.add(layer) : load());
                        });
                        const row = {
                            bench: "fallback-style-scale",
                            kind,
                            style,
                            size,
                            path,
                            ms: Math.round(ms),
                            teardowns,
                        };
                        console.log(`[fallback-style-scale] ${JSON.stringify(row)}`);
                        console.log(
                            `bench-row ${JSON.stringify({ date: new Date().toISOString(), runner: "browser", agent: navigator.userAgent, ...row })}`,
                        );
                        assert.equal(graph.rowCounts.objectNodes, size, "every row is drawn by its own Node");
                        assert.isAtMost(teardowns, REPAINT_FRAMES + 1, "one teardown per paint batch, not per row");
                    });
                }
            }
        }
    }
});
