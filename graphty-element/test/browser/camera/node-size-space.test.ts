/**
 * @file `node.sizeSpace`: how a node's drawn size follows the camera, set on a style layer for any
 * selection of nodes, or for every node by `layoutBehavior.node.sizeSpace`.
 *
 * "pivot": two nodes, one 10% larger than the other, at very different depths. The 3D camera's
 * perspective draws the nearer one bigger, so with the option off the larger node is drawn smaller
 * when it is the farther one -- the misreading a size bound to data must not allow. With "pivot",
 * the drawn order is the size order, near or far, and the drawn ratio is the size ratio.
 *
 * "screen": a node keeps its size on screen while the reader zooms with the wheel, while a node in
 * "scene" grows. The layout here is "fixed", so nothing of the location map is involved.
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { drawnFrames } from "../../helpers/drawn-frames";
import { drag, wheel } from "../../helpers/real-input";

const BIG = 3;
const SMALL = 2.7;
const WIDTH = 640;
const HEIGHT = 480;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };

describe("node size space", () => {
    let container: HTMLDivElement;
    let element: Graphty;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        element = document.createElement("graphty-element");
        container.appendChild(element);
        await element.waitForStableFrame();
    });

    afterEach(() => {
        container.remove();
    });

    /**
     * Wait until the camera holds still for a drawn frame and the picture is finished: a wheel
     * zooms over several frames, and a stable frame does not wait for the reader's own motion.
     */
    async function still(): Promise<void> {
        const scene = element.graph.getScene();
        const view = (): string => JSON.stringify(scene.activeCamera?.getViewMatrix().asArray());
        let before = "";
        while (before !== view()) {
            before = view();
            await drawnFrames(scene, 1);
            await element.waitForStableFrame();
        }
    }

    /**
     * A node's drawn radius on screen, measured whether or not the view shows it.
     * @param id - The node.
     * @returns The radius, in pixels.
     */
    function radius(id: string): number {
        const at = element.nodeScreenPosition(id);
        assert.isDefined(at, id);
        return at.radius;
    }

    /**
     * Zoom in with two wheel notches over the middle of the canvas.
     */
    async function zoomIn(): Promise<void> {
        for (let step = 0; step < 2; step++) {
            await wheel(element, CENTER, -100);
            await drawnFrames(element.graph.getScene(), 1);
        }

        await still();
    }

    /**
     * Two nodes side by side at one depth, joined by an edge, framed.
     * @param view - The view mode.
     */
    async function pair(view: "2d" | "3d" = "3d"): Promise<void> {
        await element.setViewMode(view);
        await element.graph.addNodes([
            { id: "a", position: { x: -6, y: 0, z: 0 } },
            { id: "b", position: { x: 6, y: 0, z: 0 } },
        ]);
        await element.graph.addEdges([{ src: "a", dst: "b" }]);
        await element.graph.setLayout("fixed", { dim: view === "2d" ? 2 : 3 });
        await element.graph.waitForSettled();
        element.zoomToFit();
        await still();
    }

    /**
     * Draw "big" and "small" with "big" at the given depth side, and read both drawn diameters.
     * The orbit camera looks along +z, so a node at negative z is the nearer one.
     * @param bigIsFar - Whether the larger node is the farther one.
     * @param pivot - Whether every node is drawn at the pivot's depth.
     * @returns Both drawn diameters, in pixels.
     */
    async function drawn(bigIsFar: boolean, pivot: boolean): Promise<{ big: number; small: number }> {
        const far = 30;
        await element.graph.addNodes([
            { id: "big", position: { x: -6, y: 0, z: bigIsFar ? far : -far } },
            { id: "small", position: { x: 6, y: 0, z: bigIsFar ? -far : far } },
        ]);
        await element.graph.setLayout("fixed", { dim: 3 });
        await element.session.styles.add({
            name: "big",
            target: "node",
            selector: { match: "ids", nodes: ["big"] },
            set: { "node.size": BIG },
        });
        await element.session.styles.add({
            name: "small",
            target: "node",
            selector: { match: "ids", nodes: ["small"] },
            set: { "node.size": SMALL },
        });
        element.layoutBehavior = { node: { sizeSpace: pivot ? "pivot" : "scene" } };
        await element.graph.waitForSettled();
        element.zoomToFit();
        await element.waitForStableFrame();

        return { big: 2 * radius("big"), small: 2 * radius("small") };
    }

    it("scene: perspective draws the larger, farther node smaller (the misreading)", async () => {
        const { big, small } = await drawn(true, false);
        assert.isBelow(big, small);
    });

    for (const bigIsFar of [true, false]) {
        it(`pivot: the larger node is drawn larger, ${bigIsFar ? "farther" : "nearer"} than the other`, async () => {
            const { big, small } = await drawn(bigIsFar, true);
            assert.isAbove(big, small);
            assert.closeTo(big / small, BIG / SMALL, 0.01, "the drawn ratio is the size ratio");
        });
    }

    it("pivot, then scene: the nodes go back to their perspective size", async () => {
        await drawn(true, true);
        element.layoutBehavior = { node: { sizeSpace: "scene" } };
        await element.waitForStableFrame();
        assert.isBelow(radius("big"), radius("small"));
    });

    it("pivot, in 2D: sizes are left alone (an orthographic view has no depth to undo)", async () => {
        await drawn(true, true);
        await element.setViewMode("2d");
        await element.waitForStableFrame();
        assert.closeTo(radius("big") / radius("small"), BIG / SMALL, 0.01);
    });

    it("pivot: near and far nodes of one size are drawn one size after an orbit", async () => {
        await element.graph.addNodes([
            { id: "near", position: { x: -6, y: 0, z: -30 } },
            { id: "far", position: { x: 6, y: 0, z: 30 } },
        ]);
        await element.graph.setLayout("fixed", { dim: 3 });
        element.layoutBehavior = { node: { sizeSpace: "pivot" } };
        await element.graph.waitForSettled();
        element.zoomToFit();
        await still();
        // From an empty corner, so the drag turns the camera rather than moving a node.
        await drag(element, { x: 10, y: 10 }, { x: 90, y: 60 });
        await still();
        assert.closeTo(radius("near") / radius("far"), 1, 0.01);
    });

    it("screen on a layer: its node keeps its size on screen through a wheel zoom, another grows", async () => {
        await pair();
        await element.session.styles.add({
            name: "held",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.sizeSpace": "screen" },
        });
        await still();
        const a = radius("a");
        const b = radius("b");
        await zoomIn();
        assert.closeTo(radius("a") / a, 1, 0.02, "the screen-sized node keeps its size");
        assert.isAbove(radius("b") / b, 1.1, "the scene-sized node grows");
    });

    it("screen as the graph-wide default: every node keeps its size on screen, no layer", async () => {
        await pair();
        element.layoutBehavior = { node: { sizeSpace: "screen" } };
        await still();
        const a = radius("a");
        const b = radius("b");
        await zoomIn();
        assert.closeTo(radius("a") / a, 1, 0.02);
        assert.closeTo(radius("b") / b, 1, 0.02);
    });

    it("screen in 2D: a node keeps its size through a wheel zoom", async () => {
        await pair("2d");
        element.layoutBehavior = { node: { sizeSpace: "screen" } };
        await still();
        const a = radius("a");
        await zoomIn();
        assert.closeTo(radius("a") / a, 1, 0.02);
    });

    it("screen: an edge ends on its nodes' scaled surfaces once the view is still", async () => {
        await pair();
        // No arrowhead, so the line runs from surface to surface.
        await element.session.styles.add({
            name: "plain",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "none" },
        } as never);
        element.layoutBehavior = { node: { sizeSpace: "screen" } };
        await zoomIn();
        const a = element.graph.getNode("a");
        const b = element.graph.getNode("b");
        const edge = [...element.graph.getDataManager().edges.values()][0];
        assert.isDefined(a);
        assert.isDefined(b);
        assert.notStrictEqual(a.drawnScale, 1, "the zoom scaled the nodes");
        const apart = a.drawnPosition.subtract(b.drawnPosition).length();
        const line = edge.drawnLine;
        assert.isNotNull(line);
        assert.closeTo(line.length, apart - a.drawnRadius - b.drawnRadius, apart * 0.01);
    });

    it("screen: a row past the objectRows budget gets a node and keeps its size", async () => {
        element.renderPath = "batched";
        element.limits = { objectRows: 1 };
        await pair();
        await element.session.styles.add({
            name: "ring",
            target: "node",
            selector: { match: "everything" },
            set: { "node.borderColor": "#000000", "node.borderWidth": 0.1, "node.sizeSpace": "screen" },
        } as never);
        await still();
        const a = radius("a");
        const b = radius("b");
        await zoomIn();
        assert.closeTo(radius("a") / a, 1, 0.02);
        assert.closeTo(radius("b") / b, 1, 0.02);
    });

    it("draws every node at its scene size in an XR session", async () => {
        await pair();
        element.layoutBehavior = { node: { sizeSpace: "screen" } };
        await zoomIn();
        const node = element.graph.getNode("a");
        assert.notStrictEqual(node?.drawnScale, 1);
        // Real WebXR cannot be driven here: the scene reads the XR helper's state, as XR mode sets it.
        const scene = element.graph.getScene();
        const metadata = (scene.metadata ?? {}) as Record<string, unknown>;
        scene.metadata = { ...metadata, xrHelper: { baseExperience: { state: 2 } } };
        await drawnFrames(scene, 2);
        assert.strictEqual(node?.drawnScale, 1);
        scene.metadata = metadata;
    });
});
