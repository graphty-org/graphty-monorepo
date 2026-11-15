/**
 * @file What a preview-style repaint costs on 50,000 nodes and 200,000 edges: the selection
 * workspace's paint, everything faint and one group in its color at full strength, then that
 * paint taken away (design/ui/studio/tier5/ws-polish-3-scale.md).
 *
 * Runs in the `browser-bench` project (npx vitest run --project=browser-bench
 * test/browser/style-repaint-50k.bench.test.ts), never under coverage. Each step prints, as
 * `[style-repaint-50k]`: how long until `styles.settled()` and until `waitForPainted()`, the frames
 * drawn in between, the longest of them, and the longest task the page reported.
 *
 * WHAT IS ASSERTED IS COUNTED WORK: the repaint ends with nothing pending, and no frame makes more
 * than one teardown (a pass over every scene list) however many nodes it rebuilt.
 *
 * Run it on a real GPU (GRAPHTY_BROWSER_GPU=nvidia): on the software renderer a frame of this
 * graph takes about 9 s and the run takes minutes. Measured on the development machine (i9-14900,
 * RTX 4070), 2026-11-02, until waitForPainted(): preview on 22.4 s and 86 frames before the
 * one-batch-a-frame repaint, 7.5 s and 36 frames after; preview off 30.1 s, then 6.8 s. See
 * design/ui/studio/tier5/decided.md, "Speed on 50,000 nodes, round 2".
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

const NODES = 50_000;
const EDGES = 200_000;
const GROUPS = 30;

/** What one step cost. */
interface Step {
    settledMs: number;
    paintedMs: number;
    frames: number;
    longestFrameMs: number;
    longestTaskMs: number;
    mostTeardownsInAFrame: number;
}

describe("a preview repaint on 50,000 nodes and 200,000 edges", () => {
    let container: HTMLElement;
    let graph: Graph;
    /** The layers the preview added, which the second step takes away. */
    const added: string[] = [];

    beforeAll(async () => {
        (globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setLayout("random");
        // A fixed pseudo-random graph: node i links to four others, spread over the whole graph.
        const data = JSON.stringify({
            nodes: Array.from({ length: NODES }, (_unused, at) => ({
                id: `v${String(at)}`,
                team: `T${String(at % GROUPS)}`,
            })),
            edges: Array.from({ length: EDGES }, (_unused, at) => ({
                src: `v${String(at % NODES)}`,
                dst: `v${String((at * 7919 + 13) % NODES)}`,
            })),
        });
        await graph.getSession().data.import({ type: "json", config: { data } });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForPainted();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Run a style change and measure it until the canvas has its last batch.
     * @param change - The change.
     * @returns What it cost.
     */
    async function measure(change: () => Promise<unknown>): Promise<Step> {
        const { meshes } = graph.scene;
        const splice = meshes.splice.bind(meshes);
        let emptied = 0;
        let mostTeardownsInAFrame = 0;
        meshes.splice = (...args: Parameters<typeof splice>): ReturnType<typeof splice> => {
            if (args.length === 1 && args[0] === 0) {
                emptied++;
            }

            return splice(...args);
        };
        let frames = 0;
        let longestFrameMs = 0;
        let last = performance.now();
        const observer = graph.scene.onAfterRenderObservable.add(() => {
            const now = performance.now();
            frames++;
            longestFrameMs = Math.max(longestFrameMs, now - last);
            last = now;
            mostTeardownsInAFrame = Math.max(mostTeardownsInAFrame, emptied / 2);
            emptied = 0;
        });
        let longestTaskMs = 0;
        const tasks = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                longestTaskMs = Math.max(longestTaskMs, entry.duration);
            }
        });
        tasks.observe({ type: "longtask" });

        const start = performance.now();
        last = start;
        try {
            await change();
            await graph.getSession().styles.settled();
            const settledMs = performance.now() - start;
            await graph.waitForPainted();
            const paintedMs = performance.now() - start;
            return { settledMs, paintedMs, frames, longestFrameMs, longestTaskMs, mostTeardownsInAFrame };
        } finally {
            tasks.disconnect();
            graph.scene.onAfterRenderObservable.remove(observer);
            delete (meshes as { splice?: unknown }).splice;
        }
    }

    /**
     * Print a step.
     * @param what - The step.
     * @param step - What it cost.
     */
    function report(what: string, step: Step): void {
        const ms = (value: number): string => `${value.toFixed(0)} ms`;
        console.log(
            `[style-repaint-50k] ${what}: settled ${ms(step.settledMs)}, painted ${ms(step.paintedMs)}, ` +
                `${String(step.frames)} frames, longest frame ${ms(step.longestFrameMs)}, ` +
                `longest task ${ms(step.longestTaskMs)}, most teardowns in a frame ${String(step.mostTeardownsInAFrame)}`,
        );
    }

    it("paints everything faint and one group in its color", async () => {
        const session = graph.getSession();
        const step = await measure(async () => {
            const rest = await session.styles.add({
                name: "rest faint",
                target: "node",
                selector: { match: "everything" },
                set: { "node.opacity": 0.2 },
            });
            const edges = await session.styles.add({
                name: "edges faint",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.opacity": 0.15 },
            });
            const group = await session.styles.add({
                name: "group",
                target: "node",
                selector: {
                    match: "rule",
                    where: {
                        kind: "union",
                        side: "nodes",
                        within: "visible",
                        branches: [
                            {
                                id: "b1",
                                start: "all",
                                steps: [
                                    {
                                        id: "s1",
                                        op: "keep",
                                        rule: { kind: "categories", attribute: "data.team", values: ["T7"] },
                                    },
                                ],
                            },
                        ],
                    },
                },
                set: { "node.color": "#d55e00", "node.opacity": 1 },
            });
            added.push(rest.id, edges.id, group.id);
        });
        report("preview on", step);
        assert.isFalse(graph.getStylePainter().hasPending, "every batch was applied");
        assert.isAtMost(step.mostTeardownsInAFrame, 1, "at most one teardown a frame");
    });

    it("takes the preview away again", async () => {
        const session = graph.getSession();
        const step = await measure(async () => {
            for (const id of added) {
                await session.styles.remove(id);
            }
        });
        report("preview off", step);
        assert.isFalse(graph.getStylePainter().hasPending, "every batch was applied");
        assert.isAtMost(step.mostTeardownsInAFrame, 1, "at most one teardown a frame");
    });
});
