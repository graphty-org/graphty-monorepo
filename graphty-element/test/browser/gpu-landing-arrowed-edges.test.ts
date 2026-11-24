/**
 * @file Arrowed edges between nodes with no built Node follow their nodes while a GPU layout lands its batches
 * (issue #9858). On batched, such an edge is drawn as an object, and a GPU landing owes the position lane its
 * publish without listing the rows it moved; the edge pass placed the edges of no row, and every arrowed edge stayed
 * where it was first drawn.
 *
 * The fixture keeps batched rows lazy: disjoint pairs, every other edge directed, loaded into an element already
 * drawn, and drawn with WebGL, read in the task that drew each frame. GPU cases run only where the run asked for a GPU (`GRAPHTY_BROWSER_GPU`).
 *
 * Run: GRAPHTY_BROWSER_GPU=swiftshader-unthrottled npx vitest run --project=browser
 * test/browser/gpu-landing-arrowed-edges.test.ts
 */

import "../../src/graphty-element";
import "../../webgpu";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";

const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";
const GPU_CASES = ADAPTER === "" ? describe.skip : describe;

const N = 40;
const ids = Array.from({ length: N }, (_, i) => `n${String(i)}`);
const pairs = Array.from({ length: N / 2 }, (_, i) => [ids[2 * i], ids[2 * i + 1]] as const);
/** The arrowed edges: every other pair. */
const arrowed = pairs.filter((_, i) => i % 2 === 1);
/** Moving frames read. */
const FRAMES = 20;

/**
 * Whether edge magenta lies within a few pixels of the middle of the segment between two points.
 * @param data - The frame, RGBA, top row first.
 * @param width - Its width in pixels.
 * @param from - One end, CSS pixels.
 * @param to - The other end, CSS pixels.
 * @param scale - Pixels per CSS pixel.
 * @returns True when the edge is drawn there.
 */
function magentaNear(
    data: Uint8ClampedArray,
    width: number,
    from: { x: number; y: number },
    to: { x: number; y: number },
    scale: number,
): boolean {
    const cx = Math.round(((from.x + to.x) / 2) * scale);
    const cy = Math.round(((from.y + to.y) / 2) * scale);
    for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
            const i = ((cy + dy) * width + cx + dx) * 4;
            const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
            // magenta by hue, against the gray background, so a faint antialiased line counts
            if (r - g > 30 && b - g > 30) {
                return true;
            }
        }
    }

    return false;
}

const cleanups: (() => void)[] = [];
afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

GPU_CASES.each(["batched", "objects"] as const)("GPU layout landings on %s", (path) => {
    it("keep arrowed edges on their nodes", async () => {
        const element: Graphty = document.createElement("graphty-element");
        element.renderPath = path;
        element.renderer = "webgl";
        element.setAttribute("acceleration", "required");
        element.style.display = "block";
        element.style.width = "480px";
        element.style.height = "360px";
        document.body.appendChild(element);
        cleanups.push(() => {
            element.remove();
        });
        await element.updateComplete;
        await element.setViewMode("2d");
        // small nodes, so the ink in the middle of an edge is clear of both
        await element.session.styles.add({
            name: "Node ink",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#2040ff", "node.shape": "box", "node.size": 1 },
        });
        await element.session.styles.add({
            name: "Edge ink",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.color": "#ff00ff", "edge.width": 6 },
        });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        await element.session.data.addNodes(
            ids.map((id, i) => ({ id, position: { x: (i % 8) * 10 - 40, y: Math.floor(i / 8) * 10 - 25, z: 0 } })),
        );
        await element.session.data.addEdges(
            pairs.map(([source, target], i) =>
                i % 2 === 0 ? { source, target, directed: false } : { source, target },
            ),
        );
        await element.graph.setLayout("fixed", { dim: 2 });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        if (path === "batched") {
            assert.isBelow(dataManagerInternals.nodesBuilt(element.graph.getDataManager()), N, "rows with no Node");
        }

        // Every edge is read in each of the first moving frames, in the task that drew it, against where
        // nodeScreenPosition says its nodes are in that frame: at rest a settle publishes the rows and hides this.
        const scene = element.graph.getScene();
        const canvas = element.graph.engine.getRenderingCanvas();
        assert.isNotNull(canvas);
        const copy = document.createElement("canvas");
        const context = copy.getContext("2d", { willReadFrequently: true });
        assert.isNotNull(context);
        const off: string[] = [];
        let frames = 0;
        const read = new Promise<void>((resolve) => {
            const observer = scene.onAfterRenderObservable.add(() => {
                frames++;
                if (frames > FRAMES) {
                    scene.onAfterRenderObservable.remove(observer);
                    resolve();
                    return;
                }

                copy.width = canvas.width;
                copy.height = canvas.height;
                context.drawImage(canvas, 0, 0);
                const { data } = context.getImageData(0, 0, copy.width, copy.height);
                const scale = canvas.width / canvas.clientWidth;
                for (const [a, b] of arrowed) {
                    const from = element.nodeScreenPosition(a);
                    const to = element.nodeScreenPosition(b);
                    if (from === undefined || to === undefined) {
                        off.push(`frame ${String(frames)}: ${a}-${b} unplaced`);
                        continue;
                    }

                    // the middle of a pair drawn this close is under its nodes and arrowhead
                    const apart = Math.hypot(to.x - from.x, to.y - from.y);
                    if (apart > from.radius + to.radius + 12 && !magentaNear(data, copy.width, from, to, scale)) {
                        off.push(`frame ${String(frames)}: ${a}-${b} ${JSON.stringify([from, to])}`);
                    }
                }
            });
        });
        await element.setLayout("forceatlas2", { seed: 7, maxIter: 1_000_000, settleThreshold: 1e-12 });
        await read;
        assert.deepEqual(off.slice(0, 5), [], `arrowed edges drawn between their nodes (${String(off.length)} off)`);
    });
});
