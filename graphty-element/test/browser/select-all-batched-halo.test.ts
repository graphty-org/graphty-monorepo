/**
 * @file Selecting many rows on the "batched" render path builds no `Node` for them: the Selected starting row
 * paints a halo, and a node batch draws each row's halo itself, from the source a `Node`'s halo would be an
 * instance of. Before, every selected row was handed to a `Node` of its own (an instance and a halo mesh), so a
 * select-all at 10,000 nodes built 5,000 of them in one 240 ms frame.
 *
 * Counted, never timed: the `Node`s alive before and after the selection. The halo is checked on the canvas
 * against the "objects" path, where every halo is a `Node`'s: the same pixels are drawn in the halo's color.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import { dispatcherOf } from "../../src/session/GraphSession";

/** Rows on a grid, far enough apart that no two halos touch. */
const SIDE = 8;
const SPACING = 4;

/** A halo color nothing else on the canvas is drawn in. */
const PROBE = "#00FF00";

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
 * A mounted element on a render path, its nodes on a grid, with the starting rows on and the Selected row's halo
 * in the probe color.
 * @param path - The render path.
 * @param view - The view mode.
 * @returns The element.
 */
async function mounted(path: "objects" | "batched", view: "2d" | "3d"): Promise<Graphty> {
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
    await element.session.config.set({ startingRows: true });
    const half = ((SIDE - 1) * SPACING) / 2;
    await element.session.data.addNodes(
        Array.from({ length: SIDE * SIDE }, (_, at) => ({
            id: `n${String(at)}`,
            position: { x: (at % SIDE) * SPACING - half, y: Math.floor(at / SIDE) * SPACING - half, z: 0 },
        })),
    );
    await element.setViewMode(view);
    const selected = element.session.styles.tree().find((row) => row.name === "Selected");
    assert.isDefined(selected, "the Selected row");
    await element.session.styles.writeRow(selected.id, { set: { "node.haloColor": PROBE, "node.haloOpacity": 1 } });
    await settle(element);
    return element;
}

/**
 * Count the probe-green pixels on the canvas.
 * @param element - The element.
 * @returns How many.
 */
async function greenPixels(element: Graphty): Promise<number> {
    const { engine } = element.graph;
    const pixels = (await engine.readPixels(
        0,
        0,
        engine.getRenderWidth(),
        engine.getRenderHeight(),
    )) as unknown as Uint8Array;
    let count = 0;
    for (let at = 0; at < pixels.length; at += 4) {
        if (pixels[at + 1] > 180 && pixels[at] < 90 && pixels[at + 2] < 90) {
            count++;
        }
    }

    return count;
}

/**
 * Select every node, and say what it cost and drew.
 * @param path - The render path.
 * @param view - The view mode.
 * @returns The `Node`s the selection built, the halo pixels drawn, and how many nodes it selected.
 */
async function selectAll(
    path: "objects" | "batched",
    view: "2d" | "3d",
): Promise<{ built: number; green: number; selected: number }> {
    const element = await mounted(path, view);
    const manager = element.graph.getDataManager();
    assert.strictEqual(await greenPixels(element), 0, "nothing is selected, so no halo is drawn");
    const before = dataManagerInternals.nodesLive(manager);
    await element.session.selection.apply({ scope: "visible" }, "replace", { cause: "user" });
    await settle(element);
    return {
        built: dataManagerInternals.nodesLive(manager) - before,
        green: await greenPixels(element),
        selected: element.session.selection.nodes.length,
    };
}

describe("select all on the batched render path", () => {
    for (const view of ["3d", "2d"] as const) {
        it(`builds no Node for the selected rows, and draws the halos the objects path draws (${view})`, async () => {
            const objects = await selectAll("objects", view);
            const batched = await selectAll("batched", view);

            assert.strictEqual(batched.selected, SIDE * SIDE, "every node is selected");
            assert.strictEqual(batched.built, 0, "a batch draws the selected rows and their halos: no Node is built");
            assert.isAbove(objects.green, 0, "the objects path draws a halo round each node");
            assert.strictEqual(batched.green, objects.green, "the batch draws the same halo pixels");
        });
    }
});
