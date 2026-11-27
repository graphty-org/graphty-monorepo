/**
 * @file A click that selects a node on the "objects" render path keeps Babylon's frozen list of what is drawn: it
 * thaws nothing and freezes nothing again, and the frames it draws evaluate a number of meshes that does not grow
 * with the graph. Before, the selection's new halo mesh thawed the list, so the next frame evaluated every mesh in
 * the scene and uploaded every instance's matrix again, and the next quiet frame walked them all once more to
 * freeze it: about 200 ms of a click at 99,000 nodes (issue #10128). The first click on a page also built the halo's
 * source mesh, which thawed the list once: it is now built with the nodes (issue #10124), so the first click costs
 * what a later one does. Counted with the real mouse, never timed.
 */

import "../../src/graphty-element";

import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import type { Scene } from "@babylonjs/core/scene.js";
import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { pickWork } from "../../src/render/PickService";
import { assertScalesLinearly } from "../helpers/cost";
import { drawnFrames } from "../helpers/drawn-frames";
import { pictureOf } from "../helpers/drawn-invariants";
import { readFrame } from "../helpers/paint-assertions";
import { click, hover } from "../helpers/real-input";

const SIZE = 400;
const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Whether the scene's list of what is drawn is frozen.
 * @param scene - The scene.
 * @returns True when it is.
 */
function frozen(scene: Scene): boolean {
    return (scene as unknown as { _activeMeshesFrozen: boolean })._activeMeshesFrozen;
}

/**
 * A grid of `size` nodes on the objects path, zoomed onto a 10 by 10 block in its middle, settled and frozen.
 * @param size - The node count.
 * @returns The element and the ids of the middle block's nodes.
 */
async function grid(size: number): Promise<{ element: Graphty; middle: string[] }> {
    const element = document.createElement("graphty-element");
    element.style.cssText = `display:block;width:${String(SIZE)}px;height:${String(SIZE)}px`;
    element.viewMode = "2d";
    element.renderPath = "objects";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    const side = Math.ceil(Math.sqrt(size));
    await element.session.data.addNodes(
        Array.from({ length: size }, (_, at) => ({
            id: `n${String(at)}`,
            position: { x: (at % side) * 3, y: Math.floor(at / side) * 3, z: 0 },
        })),
    );
    await element.graph.setLayout("fixed", { dim: 2 });
    await element.waitForSettled();
    const corner = Math.floor(side / 2) * side + Math.floor(side / 2);
    const middle = Array.from({ length: 100 }, (_, k) => `n${String(corner + Math.floor(k / 10) * side + (k % 10))}`);
    await element.zoomToNodes(middle);
    await element.waitForStableFrame();
    const { scene } = element.graph;
    await vi.waitFor(() => {
        assert.isTrue(frozen(scene), "the settled scene's drawn list is frozen");
    });
    return { element, middle };
}

/**
 * Click a node with the real mouse, wait until its selection is drawn and the frames after it, and count what the
 * click cost.
 * @param element - The element.
 * @param id - The node.
 * @returns The thaws, freezes, mesh evaluations and meshes built from the press to two frames after the selection.
 */
async function clickCounted(
    element: Graphty,
    id: string,
): Promise<{ thaws: number; freezes: number; evaluated: number; meshPicks: number; built: number }> {
    const { scene } = element.graph;
    const at = element.nodeScreenPosition(id);
    assert.isTrue(at?.visible === true, `${id} is on screen`);
    if (at === undefined) {
        throw new Error("unreachable");
    }

    await hover(element, at);
    await element.waitForStableFrame();
    await vi.waitFor(() => {
        assert.isTrue(frozen(scene), "the list is frozen again after the hover");
    });

    const counts = { thaws: 0, freezes: 0, evaluated: 0, meshPicks: 0, built: 0 };
    const added = scene.onNewMeshAddedObservable.add(() => {
        counts.built++;
    });
    const unfreeze = scene.unfreezeActiveMeshes.bind(scene);
    const freeze = scene.freezeActiveMeshes.bind(scene);
    scene.unfreezeActiveMeshes = () => {
        counts.thaws++;
        return unfreeze();
    };
    scene.freezeActiveMeshes = (...args) => {
        counts.freezes++;
        return freeze(...args);
    };
    const evaluate = AbstractMesh.prototype.computeWorldMatrix;
    AbstractMesh.prototype.computeWorldMatrix = function (this: AbstractMesh, ...args) {
        counts.evaluated++;
        return evaluate.apply(this, args);
    };
    const picks = pickWork.meshPicks;
    try {
        const selected = new Promise<void>((resolve) => {
            const off = element.session.on("selection:changed", () => {
                off();
                resolve();
            });
        });
        await click(element, at);
        await selected;
        // The frame that draws the selection, and the quiet frames after it, where a thawed list froze again.
        await drawnFrames(scene, 4);
        await element.waitForStableFrame();
    } finally {
        AbstractMesh.prototype.computeWorldMatrix = evaluate;
        added.remove();
        scene.unfreezeActiveMeshes = unfreeze;
        scene.freezeActiveMeshes = freeze;
    }

    counts.meshPicks = pickWork.meshPicks - picks;
    assert.deepEqual([...element.session.selection.nodes], [id], `the click selected ${id}`);
    assert.isTrue(frozen(scene), "the list is still frozen");
    return counts;
}

/**
 * Whether a node's halo is drawn in the frame on the canvas: the pixel just outside the node, inside its halo, is
 * not the background.
 * @param element - The element.
 * @param id - The node.
 * @returns True when it is.
 */
async function haloDrawn(element: Graphty, id: string): Promise<boolean> {
    const at = element.nodeScreenPosition(id);
    if (at === undefined) {
        throw new Error(`${id} is not drawn`);
    }

    const picture = pictureOf(element, await readFrame(element.graph));
    const ring = picture.at(at.x + at.radius * 1.15, at.y) ?? picture.background;
    return ring.some((value, i) => Math.abs(value - (picture.background[i] ?? 0)) > 24);
}

describe("a click that selects a node on the objects path", () => {
    it("keeps the drawn list frozen, and evaluates meshes in no proportion to the graph", async () => {
        const seen: Record<number, unknown> = {};
        await assertScalesLinearly(
            async (size) => {
                const { element, middle } = await grid(size);
                // The first click shows the spare halo built with the nodes; then a click on a new node adds a halo
                // instance and hides the old one, and a click back shows the old one again.
                const first = await clickCounted(element, middle[11]);
                assert.strictEqual(first.built, 0, `the first click builds no mesh: ${JSON.stringify(first)}`);
                const fresh = await clickCounted(element, middle[55]);
                assert.isTrue(await haloDrawn(element, middle[55]), "the new halo is drawn on the frozen list");
                assert.isFalse(await haloDrawn(element, middle[11]), "the old halo is taken off the frozen list");
                const again = await clickCounted(element, middle[11]);
                assert.isTrue(await haloDrawn(element, middle[11]), "the halo shown again is drawn");
                assert.isFalse(await haloDrawn(element, middle[55]), "the halo hidden again is not");
                assert.strictEqual(again.built, 0, `a click back builds no mesh: ${JSON.stringify(again)}`);
                seen[size] = { first, fresh, again };
                for (const counts of [first, fresh, again]) {
                    assert.strictEqual(counts.thaws, 0, `no thaw at ${String(size)} nodes: ${JSON.stringify(seen)}`);
                    assert.strictEqual(
                        counts.freezes,
                        0,
                        `no refreeze at ${String(size)} nodes: ${JSON.stringify(seen)}`,
                    );
                }

                element.remove();
                return first.evaluated + fresh.evaluated + again.evaluated;
            },
            { sizes: [500, 2000], growth: "constant", counter: () => `meshes evaluated ${JSON.stringify(seen)}` },
        );
    });
});
