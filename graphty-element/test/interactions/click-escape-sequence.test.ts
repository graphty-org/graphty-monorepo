/**
 * @file Clicking a run of nodes with Escape pressed between, with the camera pivoting on the
 * selection as the graphty app sets it: each click selects its node, and the camera always ends
 * where the click sent it. Escape pressed while the camera was still gliding to the clicked node
 * stopped it wherever that frame had got to, so where every node was drawn next depended on frame
 * timing, and the next node sometimes ended off the canvas, where a click at it selected nothing
 * (issue #10165). Clicks and keys are real input (test/helpers/real-input.ts).
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { attachKeymap } from "../../src/session/keymap";
import { drawnFrames } from "../helpers/drawn-frames";
import { click, holdKey, nodePoint, releaseKey } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/** A loose grid of nodes at fixed places, wider than it is tall. */
const NODES = Array.from({ length: 12 }, (_, i) => ({
    id: `n${String(i)}`,
    position: { x: (i % 4) * 6 - 9, y: Math.floor(i / 4) * 6 - 6, z: 0 },
}));

/**
 * A mounted element with the pivot on the selection and Escape clearing it, drawn.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.cssText = `display:block;width:${String(WIDTH)}px;height:${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    cleanups.push(attachKeymap(element.session, document));
    element.layoutBehavior = { camera: { pivotOnSelection: true, pivotOnSelectionCauses: ["user", "api"] } };
    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await drawnFrames(element.graph.getScene(), 2);
    await element.waitForStableFrame();
    return element;
}

describe("a run of clicks with Escape between", () => {
    it("selects each node clicked, and Escape leaves the camera where the click sent it", async () => {
        const element = await mounted();
        for (const id of ["n5", "n6", "n2", "n1", "n5"]) {
            const clicked = new Promise<void>((resolve) => {
                const off = element.session.on("selection:changed", () => {
                    off();
                    resolve();
                });
            });
            await click(element, nodePoint(element, id));
            await clicked;
            assert.deepEqual([...element.session.selection.nodes].map(String), [id], `the click selected ${id}`);

            // Escape at once, while the camera is still on its way to the clicked node.
            await holdKey("Escape");
            await releaseKey("Escape");
            await element.waitForStableFrame();
            assert.lengthOf(element.session.selection.nodes, 0, "Escape cleared the selection");
            const at = nodePoint(element, id);
            assert.isBelow(
                Math.hypot(at.x - WIDTH / 2, at.y - HEIGHT / 2),
                1,
                `${id} rests in the middle of the canvas, where the click sent the camera`,
            );
        }
    });
});
