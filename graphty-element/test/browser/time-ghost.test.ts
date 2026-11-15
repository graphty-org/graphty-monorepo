/**
 * @file Ghosts on a real canvas: what lies outside the time window stays in the graph and visible,
 * and only the style layers selecting the state "outsideWindow" change how it looks: the Timeline
 * Hidden row hides it, or in its ghost look draws it grey at low opacity, the elements inside
 * keeping their own look; with no such layer it looks as any other. Moving the window moves which
 * are which, and moves no node and no camera.
 */

import "../../src/graphty-element";

import type { AbstractMesh } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { ElementSession } from "../../src/session/types";
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
 * step i + 1, with `step` designated.
 * @param startingRows - Whether the project draws the starting rows.
 * @param look - The Timeline Hidden row's look, when set.
 * @returns The element.
 */
async function trace(startingRows = true, look?: "hidden" | "ghost"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    // Ghosts are drawn with the working graph off; on, nothing outside the window is drawn.
    element.workingGraph = false;
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
        await element.session.config.set({
            startingRows: true,
            ...(look === undefined ? {} : { timelineHiddenLook: look }),
        });
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

/**
 * Whether a node draws its halo ring now (the mesh one, which a node not drawn by a shader batch uses).
 * @param element - The element.
 * @param id - The node.
 * @returns True while the ring is on.
 */
function haloOn(element: Graphty, id: string): boolean {
    const node = element.graph.getDataManager().nodes.get(id);
    assert.isDefined(node, `node ${id}`);
    const { halo } = node as unknown as { halo: AbstractMesh | null };
    return halo?.isEnabled() === true;
}

describe("timeline ghosts on the canvas", () => {
    it("draws out-of-window nodes and edges in the ghost look, and only them", async () => {
        const element = await trace(true, "ghost");
        const { time } = element.session;
        await time.window({ from: 1, to: 3 });
        await time.setSettings({ outside: "hide" });
        await settle(element);
        // Hidden by style: still in the drawn masks.
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
        // The window narrows no count.
        assert.strictEqual(element.session.visibility.summary.visibleNodes, 5);

        // The Timeline Hidden row counts what it draws.
        const ghostNode = element.session.styles
            .list()
            .find((layer) => layer.name === "Timeline Hidden" && layer.target === "node");
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

    it("takes a selected node's halo away with it outside the window, and draws it again as a ghost", async () => {
        // No starting rows: the selection draws a halo.
        const element = await trace(false);
        const { time } = element.session;
        await element.session.selection.apply({ nodes: ["s0"] });
        await settle(element);
        assert.isTrue(haloOn(element, "s0"), "the selection rings s0");

        await time.window({ from: 1, to: 3 });
        await time.setSettings({ outside: "hide" });
        await settle(element);
        assert.isFalse(fills(element).get("s0")?.shown);
        assert.isFalse(haloOn(element, "s0"), "a hidden node draws no halo");

        await time.setSettings({ outside: "ghost" });
        await settle(element);
        assert.isTrue(fills(element).get("s0")?.shown);
        assert.isTrue(haloOn(element, "s0"), "a ghost keeps its halo");
    });

    it("takes a pinned node's halo away with it outside the window, and draws it again as a ghost", async () => {
        // The Pinned row is a starting row only when its look is set with them, or before.
        const element = await trace(false);
        const { time } = element.session;
        await element.session.config.set({
            startingRows: true,
            pinnedStyle: { color: "#868e96", scale: 1.12, opacity: 1 },
        });
        await element.session.positions.pin(["s4"]);
        await settle(element);
        assert.isTrue(haloOn(element, "s4"), "the Pinned row rings s4");

        await time.window({ from: 1, to: 3 });
        await settle(element);
        assert.isFalse(fills(element).get("s4")?.shown);
        assert.isFalse(haloOn(element, "s4"), "a hidden node draws no halo");

        await time.setSettings({ outside: "ghost" });
        await settle(element);
        assert.isTrue(fills(element).get("s4")?.shown);
        assert.isTrue(haloOn(element, "s4"), "a ghost keeps its halo");
    });

    it("draws what lies outside the window as any other with no layer selecting it", async () => {
        const element = await trace(false);
        const { time } = element.session;
        const before = fills(element).get("s0");
        await time.window({ from: 1, to: 3 });
        await settle(element);
        assert.deepStrictEqual(fills(element).get("s0"), before);
        assert.isTrue(fills(element).get("s1")?.shown);

        await time.setSettings({ outside: "hide" });
        await settle(element);
        assert.isFalse(fills(element).get("s0")?.shown);
    });

    it("hides what lies outside the window with the Timeline Hidden row's default look", async () => {
        const element = await trace();
        await element.session.time.window({ from: 1, to: 3 });
        await settle(element);
        assert.isFalse(fills(element).get("s0")?.shown);
        assert.isTrue(fills(element).get("s1")?.shown);
        assert.strictEqual(element.session.visibility.summary.visibleNodes, 5);
    });
});
