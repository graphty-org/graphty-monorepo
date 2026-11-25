/**
 * @file Every frame drawn after a switch between 2D and 3D shows every node, on both render paths.
 * The batched path paints its rows with no `Node` again after a switch, in batches when a frame's
 * work is split (the "minimum-work" project); a frame drawn part way showed every edge and a few
 * nodes (issue #9866). Each frame is read inside the frame, with the node centers the element
 * reports for that same frame.
 *
 * Run (from graphty-element):
 *   ../tools/with-browser.sh ../tools/low-priority.sh npx vitest run --project=minimum-work \
 *     test/browser/view-switch-draws-every-node.test.ts
 * and the same with --project=browser. The file sets each case's render path itself.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";

const SIZE = 400;
/** Twelve pairs: 24 nodes, each pair joined by one edge. */
const PAIRS = Array.from({ length: 12 }, (_, i) => [`p${String(i)}a`, `p${String(i)}b`] as const);
const IDS = PAIRS.flat();
/** How far from a node's center its ink is looked for, in CSS pixels. */
const REACH = 2;

const cleanups: (() => void)[] = [];
afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * An element showing the pairs, added after the first frame so the batched path keeps rows with no
 * `Node`, as the graphty app's does.
 * @param path - The render path.
 * @param view - The view it starts in.
 * @returns The element, at rest.
 */
async function mounted(path: "objects" | "batched", view: "2d" | "3d"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = `${String(SIZE)}px`;
    element.style.height = `${String(SIZE)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(view);
    await element.session.styles.add({
        name: "Node ink",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#2040ff", "node.size": 1 },
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
        IDS.map((id, i) => ({ id, position: { x: (i % 6) * 4 - 10, y: Math.floor(i / 6) * 4 - 6, z: 0 } })),
    );
    await element.session.data.addEdges(PAIRS.map(([source, target]) => ({ source, target })));
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Read every frame the element draws while `during` runs, inside the frame, and list the nodes
 * with no node ink at the center the element reports for them in that frame.
 * @param element - The element.
 * @param during - What to do while frames are read.
 * @returns How many frames were read, and what each one missed.
 */
async function framesWhile(
    element: Graphty,
    during: () => Promise<void>,
): Promise<{ frames: number; misses: string[] }> {
    const { engine } = element.graph;
    const scene = element.graph.getScene();
    let frames = 0;
    const misses: string[] = [];
    const observer = scene.onAfterRenderObservable.add(
        () => {
            frames++;
            const width = engine.getRenderWidth();
            const height = engine.getRenderHeight();
            const pixels = new Uint8Array(width * height * 4);
            // Fills `pixels` before it returns on WebGL.
            void engine.readPixels(0, 0, width, height, true, true, pixels);
            const css = engine.getRenderingCanvas()?.clientWidth ?? width;
            const scale = css === 0 ? 1 : width / css;
            const pixel = (x: number, y: number): readonly number[] | undefined => {
                const px = Math.round(x * scale);
                const py = height - Math.round(y * scale) - 1;
                if (px < 0 || py < 0 || px >= width || py >= height) {
                    return undefined;
                }

                const i = (py * width + px) * 4;
                return [pixels[i], pixels[i + 1], pixels[i + 2]];
            };
            const bg = pixel(0, 0) ?? [0, 0, 0];
            // Neither background nor the edges' magenta: a capless edge ends on an undrawn node's center.
            const ink = (p: readonly number[]): boolean =>
                !(p[0] > p[1] + 60 && p[2] > p[1] + 60) &&
                Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 60;
            for (const id of IDS) {
                const at = element.nodeScreenPosition(id);
                let drawn = false;
                for (let dy = -REACH; dy <= REACH && !drawn && at !== undefined; dy++) {
                    for (let dx = -REACH; dx <= REACH && !drawn; dx++) {
                        const p = pixel(at.x + dx, at.y + dy);
                        drawn = p !== undefined && ink(p);
                    }
                }

                if (!drawn) {
                    misses.push(`frame ${String(frames)}: node ${id} not drawn`);
                }
            }
        },
        undefined,
        true,
    );
    try {
        await during();
    } finally {
        scene.onAfterRenderObservable.remove(observer);
    }

    return { frames, misses };
}

describe.each(["objects", "batched"] as const)("a switch between 2D and 3D on the %s path", (path) => {
    it.each([
        ["2d", "3d"],
        ["3d", "2d"],
    ] as const)("draws every node in every frame from %s to %s", async (from, to) => {
        const element = await mounted(path, from);
        if (path === "batched") {
            // Rows with no `Node` are what the switch paints again; one that built them all tests nothing.
            assert.isBelow(dataManagerInternals.nodesBuilt(element.graph.getDataManager()), IDS.length);
        }

        const { frames, misses } = await framesWhile(element, async () => {
            await element.setViewMode(to);
            await element.waitForStableFrame();
        });
        assert.isAbove(frames, 0, "frames were drawn after the switch");
        assert.strictEqual(
            misses.slice(0, 5).join("\n"),
            "",
            `${String(misses.length)} misses over ${String(frames)} frames`,
        );
    });
});
