/**
 * @file Hiding a layer, and showing it again, rebuilds nothing it does not have to (issue #10323). Hiding the
 * Everything row over 10,000 nodes rebuilt every node's mesh for the look under it and built one edge paint per
 * edge, and showing it rebuilt the meshes back; on the "batched" path a box read while the row was hidden (the
 * graphty app's autosave) built a `Node` for every row it hid.
 *
 * Counted, never timed: the node meshes a hide and a show replace, the distinct paints the hidden edges are drawn
 * from, and the `Node`s a box read builds while the row is hidden. The canvas after the show is the canvas before
 * the hide, pixel for pixel.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { cameraViewIds } from "../../src/camera/names";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import { dispatcherOf } from "../../src/session/GraphSession";

/** Nodes on a grid, each joined to its right and lower neighbors. */
const SIDE = 6;
const SPACING = 3;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Let every queued write and pass finish, and the frames that draw them come to rest.
 * @param element - The element.
 */
async function settle(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await dispatcherOf(element.graph.getSession()).lane.settled();
    await element.session.styles.settled();
    await element.waitForStableFrame();
    element.graph.scene.render();
}

/**
 * A mounted element on a render path, as the graphty app sets it up: the starting rows on, the base look in the
 * Everything row, which colors every node. The look under it is another color of the same shape, so a hidden node's
 * edges still stop at the outline it draws, and it can keep its mesh; a hidden look of another shape is painted in
 * full (the render-parity matrix's hidden-node case).
 * @param path - The render path.
 * @returns The element and the Everything row's id.
 */
async function mounted(path: "objects" | "batched"): Promise<{ element: Graphty; everything: string }> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.layout = "fixed";
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.waitForStableFrame();
    await element.session.config.set({ startingRows: true, editableBase: true });
    const half = ((SIDE - 1) * SPACING) / 2;
    const id = (x: number, y: number): string => `n${String(y * SIDE + x)}`;
    await element.session.data.addNodes(
        Array.from({ length: SIDE * SIDE }, (_, at) => ({
            id: id(at % SIDE, Math.floor(at / SIDE)),
            position: { x: (at % SIDE) * SPACING - half, y: Math.floor(at / SIDE) * SPACING - half, z: 0 },
        })),
    );
    const edges: { src: string; dst: string }[] = [];
    for (let y = 0; y < SIDE; y++) {
        for (let x = 0; x < SIDE; x++) {
            if (x + 1 < SIDE) {
                edges.push({ src: id(x, y), dst: id(x + 1, y) });
            }
            if (y + 1 < SIDE) {
                edges.push({ src: id(x, y), dst: id(x, y + 1) });
            }
        }
    }
    await element.session.data.addEdges(edges);
    const row = element.session.styles.tree().find((each) => each.name === "Everything");
    assert.isDefined(row, "the Everything row");
    await element.session.styles.writeRow(row.id, { set: { "node.color": "#3366ff" } });
    await settle(element);
    return { element, everything: row.id };
}

/**
 * The canvas, as bytes.
 * @param element - The element.
 * @returns Its pixels.
 */
async function pixels(element: Graphty): Promise<Uint8Array> {
    const { engine } = element.graph;
    return (await engine.readPixels(0, 0, engine.getRenderWidth(), engine.getRenderHeight())) as unknown as Uint8Array;
}

/**
 * How many bytes two pictures differ in.
 * @param a - One picture.
 * @param b - The other.
 * @returns The count.
 */
function differing(a: Uint8Array, b: Uint8Array): number {
    let count = 0;
    for (let at = 0; at < a.length; at++) {
        if (a[at] !== b[at]) {
            count++;
        }
    }

    return count;
}

describe("hiding a layer and showing it again (issue #10323)", () => {
    it("keeps every node's mesh on the objects path, and shows the picture it hid", async () => {
        const { element, everything } = await mounted("objects");
        const nodes = [...element.graph.getDataManager().nodes.values()];
        assert.strictEqual(nodes.length, SIDE * SIDE);
        const meshes = nodes.map((node) => node.mesh);
        const before = await pixels(element);

        await element.session.styles.hideRow(everything, true);
        await settle(element);
        const hidden = await pixels(element);
        assert.isTrue(
            nodes.every((node) => node.getRenderState() === "hidden"),
            "every node is hidden",
        );
        assert.strictEqual(
            nodes.filter((node, at) => node.mesh !== meshes[at]).length,
            0,
            "hiding the row rebuilt no node's mesh",
        );

        await element.session.styles.hideRow(everything, false);
        await settle(element);
        assert.strictEqual(
            nodes.filter((node, at) => node.mesh !== meshes[at]).length,
            0,
            "showing the row rebuilt no node's mesh",
        );
        assert.isAbove(differing(before, hidden), 0, "hiding the row changed the picture");
        assert.strictEqual(differing(before, await pixels(element)), 0, "showing it drew the picture it hid");
    });

    for (const path of ["objects", "batched"] as const) {
        it(`draws every hidden edge from one paint (${path})`, async () => {
            const { element, everything } = await mounted(path);
            await element.session.styles.hideRow(everything, true);
            await settle(element);
            const painter = element.graph.getStylePainter();
            const edges = element.session.data.edges().length;
            assert.isAbove(edges, 1);
            const paints = new Set(Array.from({ length: edges }, (_, at) => painter.edgePaint(at)));
            assert.strictEqual(paints.size, 1, "one paint for every hidden edge");
        });
    }

    it("builds no Node for a hidden row when a box is read on the batched path", async () => {
        const { element, everything } = await mounted("batched");
        const manager = element.graph.getDataManager();
        await element.session.styles.hideRow(everything, true);
        await settle(element);
        const built = dataManagerInternals.nodesLive(manager);

        // what the graphty app's autosave reads: the camera view of the whole graph
        element.graph.resolveCameraPreset(cameraViewIds()[0]);

        assert.strictEqual(dataManagerInternals.nodesLive(manager) - built, 0, "no Node is built to measure");
    });
});
