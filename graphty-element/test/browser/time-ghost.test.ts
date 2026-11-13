/**
 * @file Ghosts on a real canvas: what lies outside the time window is hidden by style, never taken
 * out of the graph, and with the timeline's `outside: "ghost"` it is drawn in the Ghost row's grey
 * at low opacity, the elements inside keeping their own look; moving the window moves which are
 * which, and moves no node and no camera. Every look comes from a style layer.
 */

import "../../src/graphty-element";

import { afterEach, assert, beforeAll, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { setDefaultFeatures } from "../../src/features/resolve";
import { operationQueueOf } from "../../src/Graph";
import type { ElementSession } from "../../src/session/types";
import { readDrawn } from "../fidelity/drawn-scene";
import { nextFrame } from "../helpers/real-input";

// The timeline is an experiment: this file's sessions switch it on.
beforeAll(() => {
    setDefaultFeatures(["timeline"]);
});

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
 * step i + 1, with `step` designated.
 * @param startingRows - Whether the project draws the starting rows.
 * @returns The element.
 */
async function trace(startingRows = true): Promise<Graphty> {
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
    if (startingRows) {
        await element.session.config.set({ startingRows: true });
    }

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
        // Hidden by default, by style: still in the drawn masks.
        let now = fills(element);
        assert.isFalse(now.get("s0")?.shown);
        assert.isTrue(now.get("s1")?.shown);
        const s0 = element.session.data.snapshot().ids.requireIndex("s0");
        const { visibility } = element.session as ElementSession;
        assert.isTrue(visibility.drawnMasks.nodes().has(s0), "s0 is hidden by style");
        const inWindowFill = now.get("s1")?.fill;
        const camera = JSON.stringify(element.graph.getCameraState());

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

        // The Ghost row counts what it draws.
        const ghostNode = element.session.styles
            .list()
            .find((layer) => layer.name === "Ghost" && layer.target === "node");
        assert.strictEqual(element.session.styles.counts(ghostNode?.id ?? "").matched, 3);

        // Moving the window moves the ghosts, and nothing else.
        const positions = JSON.stringify(
            [...readDrawn(element.graph).nodes].map(([id, node]) => [id, Math.round(node.x), Math.round(node.y)]),
        );
        await time.stepBy(1);
        await settle(element);
        now = fills(element);
        assert.strictEqual(now.get("s1")?.fill, "#9e9e9e");
        assert.strictEqual(now.get("s3")?.fill, inWindowFill);
        assert.strictEqual(
            JSON.stringify(
                [...readDrawn(element.graph).nodes].map(([id, node]) => [id, Math.round(node.x), Math.round(node.y)]),
            ),
            positions,
        );
        assert.strictEqual(JSON.stringify(element.graph.getCameraState()), camera);

        // Back to hiding: not drawn.
        await time.setSettings({ outside: "hide" });
        await settle(element);
        assert.isFalse(fills(element).get("s0")?.shown);
    });

    it("hides what lies outside the window with no starting rows, and ghosts it when asked", async () => {
        const element = await trace(false);
        const { time } = element.session;
        await time.window({ from: 1, to: 3 });
        await settle(element);
        assert.isFalse(fills(element).get("s0")?.shown);
        assert.isTrue(fills(element).get("s1")?.shown);

        await time.setSettings({ outside: "ghost" });
        await settle(element);
        assert.isTrue(fills(element).get("s0")?.shown);
    });
});
