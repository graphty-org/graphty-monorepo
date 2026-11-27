/**
 * @file A node dragged in 3D while its layout is still running stays at the depth it is dragged at. A press is a click
 * until the pointer travels past the click tolerance, and the layout kept moving the node in that time; a drag
 * started from a point measured at the press's depth added that move again on every pointer move, so the node ran
 * away along the line of sight, about one unit per move (issue #10116).
 */

import "../../src/graphty-element";

import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { afterEach, assert, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { moveHeld, press, release } from "../helpers/real-input";
import { applied, HEIGHT, WIDTH } from "./helpers/mounted-element";

const elements: HTMLElement[] = [];

afterEach(() => {
    for (const element of elements.splice(0)) {
        element.remove();
    }
});

/**
 * A ring of 63 nodes laid out by a force layout in 3D, drawn and still laying out.
 * @returns The element.
 */
async function mountedLayingOut(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    elements.push(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    const ids = Array.from({ length: 63 }, (_unused, i) => `n${String(i)}`);
    await element.session.data.addNodes(ids.map((id) => ({ id })));
    await element.session.data.addEdges(ids.map((id, i) => ({ src: id, dst: ids[(i + 1) % ids.length] })));
    await element.setViewMode("3d");
    await element.graph.setLayout("ngraph", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await drawnFrames(element.graph.getScene(), 2);
    return element;
}

/**
 * Where a node is, in scene units.
 * @param element - The element.
 * @param id - The node.
 * @returns Its position.
 */
function where(element: Graphty, id: string): Vector3 {
    const out = { x: 0, y: 0, z: 0 };
    element.session.positions.read(element.session.snapshot().ids.requireIndex(id), out);
    return new Vector3(out.x, out.y, out.z);
}

it("a node dragged sideways while the layout runs keeps its depth", async () => {
    const element = await mountedLayingOut();
    // Held still only while the press lands, so it lands on the node where it is drawn: a running
    // layout could carry the node out from under a point read a frame before the press.
    await element.session.layout.pause();
    await drawnFrames(element.graph.getScene(), 1);
    const spot = element.nodeScreenPosition("n0");
    assert.exists(spot);
    assert.isTrue(spot.visible, "n0 is on screen");
    const from = { x: spot.x, y: spot.y };

    await press(element, from);
    await element.session.layout.play();
    assert.strictEqual(element.session.layout.motion, "running", "the layout runs under the held press");
    const places: Vector3[] = [];
    let forward: Vector3 | null = null;
    for (let step = 1; step <= 20; step++) {
        await moveHeld(element, { x: from.x + 4 * step, y: from.y });
        await drawnFrames(element.graph.getScene(), 1);
        places.push(where(element, "n0"));
        // The drag plane faces the camera as it was when the drag began: the second move, past the click tolerance.
        forward ??=
            step === 2 ? (element.graph.getScene().activeCamera?.getForwardRay().direction.clone() ?? null) : null;
    }
    await release(element, { x: from.x + 80, y: from.y });
    await applied(element);

    // The press took the node: it followed the pointer across, rather than the camera turning.
    assert.isAbove(places[19].x - places[1].x, 1, "the node followed the pointer");

    // From the second move on only the pointer moves the node, across the drag plane, so it keeps its depth.
    assert.exists(forward);
    const start = places[1];
    const depths = places.slice(1).map((p) => Vector3.Dot(p.subtract(start), forward));
    const drift = Math.max(...depths.map(Math.abs));
    assert.isBelow(drift, 0.5, `depth moved along the drag: ${depths.map((d) => d.toFixed(2)).join(", ")}`);
});
