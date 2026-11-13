/**
 * @file `xr.input.zAxisAmplification` multiplies only depth (Z) movement of a dragged node, and an
 * XR drag ignores a pointer jump that is a controller losing and reacquiring tracking.
 *
 * The drag is driven through `node.dragHandler`, the entry an XR controller feeds world positions
 * into. XR mode is the element's own signal for an immersive session: the WebXR helper it stores
 * on the scene, in the IN_XR state, which here stands in for a headset.
 */
import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import type { Graph } from "../../src/Graph";
import type { Node } from "../../src/Node";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup";

/** Babylon's WebXRState.IN_XR. */
const IN_XR = 2;

let graph: Graph;
let node: Node;

beforeEach(async () => {
    graph = await createTestGraph();
    graph.getDataManager().addNode({ id: "n", label: "n" });
    const added = graph.getDataManager().getNode("n");
    assert.isDefined(added);
    node = added;
});

afterEach(() => {
    cleanupTestGraph(graph);
});

/**
 * Drag the node from where it is drawn by each offset in turn, and return where it ends up
 * relative to where it started.
 * @param offsets - Pointer offsets from the drag start, one per update.
 * @returns The node's movement.
 */
function drag(...offsets: Vector3[]): Vector3 {
    const handler = node.dragHandler;
    assert.isDefined(handler);
    const start = node.drawnPosition.clone();
    handler.onDragStart(start);
    for (const offset of offsets) {
        handler.onDragUpdate(start.add(offset));
    }
    const moved = node.drawnPosition.subtract(start);
    handler.onDragEnd();
    return moved;
}

/**
 * Assert two vectors are equal to within rounding.
 * @param actual - The vector measured.
 * @param expected - The vector expected.
 * @param message - What is being checked.
 */
function assertNear(actual: Vector3, expected: Vector3, message: string): void {
    assert.isBelow(Vector3.Distance(actual, expected), 1e-6, `${message}: got ${actual.toString()}`);
}

describe("xr.input.zAxisAmplification", () => {
    test("on the desktop, with enableZAmplificationInDesktop, multiplies only Z", () => {
        graph.setXRConfig({ input: { zAxisAmplification: 4, enableZAmplificationInDesktop: true } });
        assertNear(drag(new Vector3(1, 2, 3)), new Vector3(1, 2, 12), "X and Y follow the pointer, Z is 4x");
    });

    test("on the desktop, without enableZAmplificationInDesktop, nothing is amplified", () => {
        graph.setXRConfig({ input: { zAxisAmplification: 4 } });
        assertNear(drag(new Vector3(1, 2, 3)), new Vector3(1, 2, 3), "the node follows the pointer");
    });

    test("in XR, the default amplifies only Z, 10x", () => {
        graph.scene.metadata.xrHelper = { baseExperience: { state: IN_XR } };
        assertNear(drag(new Vector3(0.1, 0.2, 0.3)), new Vector3(0.1, 0.2, 3), "X and Y follow the hand, Z is 10x");
    });
});

describe("the XR tracking-glitch guard", () => {
    test("in XR, a pointer jump larger than 5 units leaves the node where it is, and movement carries on after it", () => {
        graph.scene.metadata.xrHelper = { baseExperience: { state: IN_XR } };
        const moved = drag(new Vector3(1, 0, 0), new Vector3(51, 0, 0), new Vector3(52, 0, 0));
        assertNear(
            moved,
            new Vector3(2, 0, 0),
            "the 50-unit jump is ignored; the 1-unit moves either side of it count",
        );
    });

    test("in XR, steady movement adds up past 5 units", () => {
        graph.scene.metadata.xrHelper = { baseExperience: { state: IN_XR } };
        const steps = Array.from({ length: 10 }, (_, i) => new Vector3(i + 1, 0, 0));
        assertNear(drag(...steps), new Vector3(10, 0, 0), "ten 1-unit steps move the node 10 units");
    });

    test("on the desktop, a large pointer move is followed", () => {
        assertNear(drag(new Vector3(50, 0, 0)), new Vector3(50, 0, 0), "the node follows the pointer");
    });
});
