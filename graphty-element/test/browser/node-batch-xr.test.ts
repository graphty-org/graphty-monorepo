/**
 * @file Each eye draws the same whole frame on both render paths, laser included.
 *
 * A batched row has no mesh. Babylon's laser picks the scene, so the element moves an invisible
 * stand-in onto the row each controller's ray finds, and the laser lands on it as on the row's mesh.
 */

import "../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { installIWER, type IWERHandle } from "../interactions/helpers/iwer-setup";
import {
    differing,
    type Handedness,
    laserHit,
    type LaserNode,
    wholeFrame,
    type XRFrame,
} from "../interactions/helpers/xr-frames";

let iwer: IWERHandle;
let element: Graphty;

beforeEach(() => {
    iwer = installIWER();
});

afterEach(() => {
    element.remove();
    iwer.uninstall();
});

/**
 * The node a laser landed on, read after drawn frames (never in a wait: it is an answer, and a
 * wait on it hangs when the laser lands on an edge or on nothing).
 * @returns The controller and its node.
 */
async function laserOnANode(): Promise<{ hand: Handedness; node: LaserNode }> {
    await drawnFrames(element.graph.getScene(), 4);
    for (const hand of ["left", "right"] as const) {
        const { on, node } = laserHit(element, hand);
        if (node !== undefined) {
            return { hand, node };
        }

        assert.equal(on, "nothing", `the ${hand} laser landed on something other than a node`);
    }

    throw new Error("no laser landed on a node");
}

/** The edges drawn with the rows: none, or disjoint pairs along each line of six. */
type Edges = "no edges" | "directed" | "undirected";

/**
 * Open the element in VR with 24 nodes in front of the headset and each controller pointing straight ahead.
 * @param edges - The edges between the rows.
 * @param path - A render path set before the data loads; the default when absent.
 */
async function rowsInFrontOfTheHeadset(edges: Edges = "no edges", path?: "objects" | "batched"): Promise<void> {
    element = document.createElement("graphty-element");
    if (path !== undefined) {
        element.renderPath = path;
    }

    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    element.xr = { enabled: true, ui: { enabled: true, showAvailabilityWarning: false } };
    document.body.append(element);
    await element.updateComplete;
    // In front of the headset, which stands at eye height and looks along +z in Babylon's space.
    await element.session.data.addNodes(
        Array.from({ length: 24 }, (_, id) => ({
            id,
            position: { x: (id % 6) - 2.5, y: Math.floor(id / 6) + 0.1, z: 4 },
        })),
    );
    if (edges !== "no edges") {
        await element.session.data.addEdges(
            Array.from({ length: 12 }, (_, pair) => ({
                source: 2 * pair,
                target: 2 * pair + 1,
                ...(edges === "undirected" ? { directed: false } : {}),
            })),
        );
    }

    // Where the data puts them, so the rays straight ahead meet rows with edges too: no spread,
    // which would place them by the edges' lengths.
    await element.graph.setLayout("fixed", { dim: 3, spacing: 0 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.setViewMode("vr");
    await drawnFrames(element.graph.getScene(), 10);
    assert.equal(element.graph.getScene().activeCamera?.rigCameras.length, 2, "two eyes are drawing");
    // Each controller points straight ahead, down a row, a hand's length in front of the eyes.
    iwer.device.controllers.left?.position.set(-0.5, 1.1, -0.3);
    iwer.device.controllers.right?.position.set(0.5, 1.1, -0.3);
}

describe("node batches in XR", () => {
    it.each<Edges>(["no edges", "directed", "undirected"])(
        "draw each eye's whole frame as the object rows do, laser on a row, %s",
        async (edges) => {
            await rowsInFrontOfTheHeadset(edges);
            const { graph } = element;
            const onObjects = (await laserOnANode()).node.id;
            const objects = await wholeFrame(element);
            graph.setRenderPath("batched");
            const batched = await wholeFrame(element);

            const onRows = await laserOnANode();
            assert.equal(onRows.node.id, onObjects, "the laser stays on the same row");
            assert.isNull(onRows.node.drawnPickMesh, "the row has no mesh");
            assert.equal(graph.rowCounts.batchedNodes, 24);
            assert.deepEqual(differing(objects, batched), { left: 0, right: 0 });

            // Without the rows the frame changes in each eye, so the comparison above held rows.
            await element.session.data.clear();
            await operationQueueOf(graph).waitForCompletion();
            const ink = differing(batched, await wholeFrame(element));
            assert.isAbove(ink.left, 10000, "the left eye drew no rows");
            assert.isAbove(ink.right, 10000, "the right eye drew no rows");
        },
    );

    it.each<Edges>(["no edges", "directed", "undirected"])(
        "draw each eye's whole frame the same with the path set before the data loads, %s",
        async (edges) => {
            const pictures: XRFrame[] = [];
            const landed: unknown[] = [];
            for (const path of ["objects", "batched"] as const) {
                iwer.uninstall();
                iwer = installIWER();
                await rowsInFrontOfTheHeadset(edges, path);
                landed.push((await laserOnANode()).node.id);
                pictures.push(await wholeFrame(element));
                element.remove();
            }

            assert.equal(landed[1], landed[0], "the laser lands on the same row");
            assert.deepEqual(differing(pictures[0], pictures[1]), { left: 0, right: 0 });
        },
    );

    it("select and drag a row with no mesh by the trigger", async () => {
        await rowsInFrontOfTheHeadset();
        const { graph } = element;
        const scene = graph.getScene();
        graph.setRenderPath("batched");
        await drawnFrames(scene, 4);
        const { hand: handedness, node } = await laserOnANode();
        assert.isNull(node.drawnPickMesh, "the row has no mesh");
        const hand = iwer.device.controllers[handedness];
        assert.exists(hand);
        // A tap: press and release where it points.
        hand.updateButtonValue("trigger", 1);
        await drawnFrames(scene, 4);
        hand.updateButtonValue("trigger", 0);
        await drawnFrames(scene, 4);
        assert.equal(graph.getSelectedNode()?.id, node.id, "the tap selected the row");

        // A drag: press, move the controller to the right, release.
        const before = node.drawnPosition.x;
        hand.updateButtonValue("trigger", 1);
        await drawnFrames(scene, 4);
        for (let step = 0; step < 10; step++) {
            hand.position.x += 0.05;
            await drawnFrames(scene, 2);
        }
        hand.updateButtonValue("trigger", 0);
        await drawnFrames(scene, 4);
        assert.isAbove(node.drawnPosition.x, before + 0.1, "the row followed the controller");
        assert.isNull(node.drawnPickMesh, "the row still has no mesh");
        assert.equal(graph.rowCounts.batchedNodes, 24);
    });
});
