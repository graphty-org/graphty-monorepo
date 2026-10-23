/**
 * @file A layer's halo channels draw the selection halo on the node under the pointer.
 *
 * The `node.halo*` channels draw the same halo as the selection -- the node's own shape,
 * scaled about its centre -- on any node a layer picks. With a `{ match: "hover" }` layer that is
 * the node under the pointer. These tests drive the browser's own mouse
 * (test/helpers/real-input.ts) in a 3D view whose camera is turned so the hovered node sits near
 * the side of the view, where a flat screen-space ring would drift off the node, and read the
 * drawn halo back from the scene.
 */

import "../../../src/graphty-element";

import type { AbstractMesh } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";
import { drawnFrames } from "../../helpers/drawn-frames";
import { click, hover, type Point } from "../../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

/** A box and a sphere, side by side. */
const NODES = [
    { id: "box", position: { x: -2, y: 0, z: 0 } },
    { id: "ball", position: { x: 2, y: 0, z: 0 } },
];

/** The selection style's default scale, which a highlight that sets no scale is drawn at. */
const DEFAULT_SCALE = 1.45;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted 3D element with the box node drawn as a box, the camera turned off to one side.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES);
    await element.session.styles.add({
        name: "box",
        target: "node",
        selector: { match: "ids", nodes: ["box"] },
        set: { "node.shape": "box" },
    });
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("3d");
    await operationQueueOf(element.graph).waitForCompletion();
    // Turned toward a point beyond the ball, from above and to one side: the box lands near the
    // side of the view, off the camera's axis.
    await element.setCameraState({ position: { x: 7, y: 4, z: 9 }, target: { x: 4, y: 0, z: 0 } });
    await applied(element);
    return element;
}

/**
 * Wait until the element has applied the input just given and drawn it.
 * @param element - The element.
 */
async function applied(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await drawnFrames(element.graph.getScene(), 2);
    await element.waitForStableFrame();
}

/**
 * Where a node is drawn on screen.
 * @param element - The element.
 * @param id - The node.
 * @returns Its centre in CSS pixels from the element's top-left corner.
 */
function at(element: Graphty, id: string): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position, `node ${id} is drawn`);
    return { x: position.x, y: position.y };
}

/**
 * Every halo drawn on screen. The cached source meshes sit in the scene too, hidden, so being
 * enabled and visible is what tells a drawn instance from them.
 * @param element - The element.
 * @returns The drawn halos.
 */
function drawnHalos(element: Graphty): AbstractMesh[] {
    return element.graph
        .getScene()
        .meshes.filter((mesh) => mesh.name.startsWith("graphty-selection-halo") && mesh.isVisible && mesh.isEnabled());
}

/**
 * Move the real pointer and let the element repaint.
 * @param element - The element.
 * @param point - Where to.
 */
async function pointTo(element: Graphty, point: Point): Promise<void> {
    await hover(element, point);
    await applied(element);
}

/**
 * Assert one halo is drawn around a node: centred on it and its own shape scaled about that centre.
 * @param element - The element.
 * @param id - The node.
 * @param scale - The scale the halo should be drawn at.
 * @returns The halo.
 */
function assertHaloAround(element: Graphty, id: string, scale: number): AbstractMesh {
    const halos = drawnHalos(element);
    assert.lengthOf(halos, 1, "one halo is drawn");
    const [halo] = halos;
    const node = element.graph.getNode(id);
    assert.isDefined(node, `node ${id} exists`);
    halo.computeWorldMatrix(true);
    node.mesh.computeWorldMatrix(true);
    const nodeBox = node.mesh.getBoundingInfo().boundingBox;
    const haloBox = halo.getBoundingInfo().boundingBox;
    assert.isBelow(haloBox.centerWorld.subtract(nodeBox.centerWorld).length(), 1e-4, `the halo is centred on ${id}`);
    for (const axis of ["x", "y", "z"] as const) {
        assert.closeTo(
            haloBox.extendSizeWorld[axis] / nodeBox.extendSizeWorld[axis],
            scale,
            1e-3,
            `the halo is ${id}'s own shape scaled ${String(scale)} times on ${axis}`,
        );
    }

    return halo;
}

describe("a hover layer's halo in 3D", () => {
    it("draws the halo around the hovered node near the side of the view, and takes it off on leaving", async () => {
        const element = await mounted();
        await element.session.styles.add({
            name: "highlight the hovered node",
            target: "node",
            selector: { match: "hover" },
            set: { "node.halo": true },
        });
        await applied(element);
        assert.lengthOf(drawnHalos(element), 0, "no halo before the pointer arrives");

        const box = at(element, "box");
        assert.isBelow(
            Math.min(box.x, WIDTH - box.x),
            WIDTH * 0.2,
            `the camera is turned so the box is near the side of the view (x = ${String(box.x)})`,
        );

        await pointTo(element, box);
        assert.strictEqual(element.session.selection.hovered, "box", "the real pointer hovers the box");
        assertHaloAround(element, "box", DEFAULT_SCALE);
        assert.isNull(element.getSelectedNode(), "hovering selected nothing");

        await pointTo(element, { x: WIDTH - 5, y: 5 });
        assert.isNull(element.session.selection.hovered, "the pointer left the node");
        assert.lengthOf(drawnHalos(element), 0, "the halo went with the pointer");
    });

    it("draws the layer's own look, and one halo on a node both selected and hovered", async () => {
        const element = await mounted();
        await element.session.styles.add({
            name: "highlight the hovered node",
            target: "node",
            selector: { match: "hover" },
            set: { "node.haloColor": "#00BCD4", "node.haloScale": 2 },
        });
        await applied(element);

        await click(element, at(element, "box"));
        await applied(element);
        assert.strictEqual(element.getSelectedNode()?.id, "box", "the click selected the box");

        const halo = assertHaloAround(element, "box", 2);
        assert.include(halo.name.toLowerCase(), "#00bcd4", "the layer's colour wins over the selection's");

        await pointTo(element, { x: WIDTH - 5, y: 5 });
        const selected = assertHaloAround(element, "box", DEFAULT_SCALE);
        assert.notInclude(
            selected.name.toLowerCase(),
            "#00bcd4",
            "off hover the selection halo is back in its own look",
        );
    });

    it("draws the layer's halo on a clicked node while the selection's own halo is hidden", async () => {
        const element = await mounted();
        // The selection draws no halo of its own; a layer marks the hovered node, or with none
        // hovered the clicked one.
        element.selectionStyle = { opacity: 0 };
        await element.session.styles.add({
            name: "highlight the focused node",
            target: "node",
            selector: { match: "hover", orSelected: true },
            set: { "node.haloColor": "#00BCD4", "node.haloOpacity": 0.5 },
        });
        await applied(element);

        await click(element, at(element, "box"));
        await applied(element);
        assert.strictEqual(element.getSelectedNode()?.id, "box", "the click selected the box");
        assertHaloAround(element, "box", DEFAULT_SCALE);

        await pointTo(element, { x: WIDTH - 5, y: 5 });
        assert.isNull(element.session.selection.hovered, "the pointer left the node");
        assertHaloAround(element, "box", DEFAULT_SCALE);
    });

    it("draws nothing on hover without a halo layer", async () => {
        const element = await mounted();
        const before = element.graph
            .getScene()
            .meshes.map((mesh) => `${mesh.name}:${String(mesh.isEnabled())}`)
            .sort();

        await pointTo(element, at(element, "box"));
        assert.strictEqual(element.session.selection.hovered, "box", "the real pointer hovers the box");

        assert.lengthOf(drawnHalos(element), 0, "hovering alone draws no halo");
        const after = element.graph
            .getScene()
            .meshes.map((mesh) => `${mesh.name}:${String(mesh.isEnabled())}`)
            .sort();
        assert.deepEqual(after, before, "and changes nothing in the scene");
    });
});
