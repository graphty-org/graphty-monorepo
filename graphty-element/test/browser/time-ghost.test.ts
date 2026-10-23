/**
 * @file Ghosts on a real canvas: with the timeline's `outside: "ghost"`, the elements outside the
 * time window stay drawn in the Ghost row's grey at low opacity, the ones inside keep their own
 * look, and moving the window moves which are which. Every look comes from the Ghost style layer.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { readDrawn } from "../fidelity/drawn-scene";
import { nextFrame } from "../helpers/real-input";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Let the styles repaint and a few frames draw.
 * @param element - The element.
 */
async function settle(element: Graphty): Promise<void> {
    await element.session.styles.settled();
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    for (let frame = 0; frame < 3; frame++) {
        element.graph.scene.render();
        await nextFrame();
    }
}

/**
 * A process trace of five steps on a real element: node s<i> at step i, edge s<i> -> s<i+1> at
 * step i + 1, with the starting rows on and `step` designated.
 * @returns The element.
 */
async function trace(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.config.set({ startingRows: true });
    await element.session.data.addNodes(
        Array.from({ length: 5 }, (_, i) => ({ id: `s${String(i)}`, step: i, position: { x: i * 3 - 6, y: 0, z: 0 } })),
    );
    await element.session.data.addEdges(
        Array.from({ length: 4 }, (_, i) => ({ src: `s${String(i)}`, dst: `s${String(i + 1)}`, step: i + 1 })),
    );
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.session.time.setField({ nodes: { start: "step" }, edges: { start: "step" } });
    await settle(element);
    return element;
}

/**
 * The drawn fill of each node.
 * @param element - The element.
 * @returns Node id to whether it is drawn, its fill and its opacity.
 */
function fills(element: Graphty): Map<string, { shown: boolean; fill: string; opacity: number }> {
    const drawn = readDrawn(element.graph);
    return new Map(
        [...drawn.nodes].map(([id, node]) => [
            id,
            { shown: node.shown, fill: (node.fillDrawn ?? "").toLowerCase(), opacity: node.fillOpacity },
        ]),
    );
}

describe("timeline ghosts on the canvas", () => {
    it("draws out-of-window nodes and edges in the Ghost row's look, and only them", async () => {
        const element = await trace();
        const { time } = element.session;
        await time.window({ from: 1, to: 3 });
        await settle(element);
        // Hidden by default.
        let now = fills(element);
        assert.isFalse(now.get("s0")?.shown);
        assert.isTrue(now.get("s1")?.shown);
        const inWindowFill = now.get("s1")?.fill;

        await time.setSettings({ outside: "ghost" });
        await settle(element);
        now = fills(element);
        for (const id of ["s0", "s3", "s4"]) {
            assert.isTrue(now.get(id)?.shown, `${id} is drawn as a ghost`);
            assert.strictEqual(now.get(id)?.fill, "#9e9e9e", `${id} is grey`);
            assert.closeTo(now.get(id)?.opacity ?? 1, 0.2, 0.01, `${id} is faint`);
        }

        for (const id of ["s1", "s2"]) {
            assert.strictEqual(now.get(id)?.fill, inWindowFill, `${id} keeps its own look`);
            assert.closeTo(now.get(id)?.opacity ?? 0, 1, 0.01);
        }

        const { edges } = readDrawn(element.graph);
        const ghostEdge = [...edges.values()].filter((edge) => edge.shown && edge.color?.toLowerCase() === "#9e9e9e");
        assert.isAbove(ghostEdge.length, 0, "edges outside the window are drawn grey");
        // Ghosts are not visible: counts are the window's.
        assert.strictEqual(element.session.visibility.summary.visibleNodes, 2);

        // Moving the window moves the ghosts.
        await time.stepBy(1);
        await settle(element);
        now = fills(element);
        assert.strictEqual(now.get("s1")?.fill, "#9e9e9e");
        assert.strictEqual(now.get("s3")?.fill, inWindowFill);
    });
});
