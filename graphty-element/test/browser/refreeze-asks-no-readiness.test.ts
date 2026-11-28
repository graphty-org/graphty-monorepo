/**
 * @file After an input that changes how meshes look, graphty-element freezes Babylon's list of what is drawn again
 * without asking the whole scene whether it is ready, and reading the camera at rest thaws nothing. Before, every
 * re-freeze went through Babylon's `freezeActiveMeshes`, whose `executeWhenReady` asks every mesh's material about
 * every sub-mesh (64 to 120 ms at 10,000 to 100,000 nodes), on the first still frame after every hover, click, drag
 * and camera move; and `getCameraState()` bumped the view matrix's update stamp, which read as a camera move and
 * thawed the list (issue #10300). Counted with the real mouse, never timed.
 */

import "../../src/graphty-element";

import type { Scene } from "@babylonjs/core/scene.js";
import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { drawnFrames } from "../helpers/drawn-frames";
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
 * A 3D grid of nodes on the objects path, drawn every frame, whose hovered node turns magenta, settled and frozen.
 * @returns The element.
 */
async function grid(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.cssText = `display:block;width:${String(SIZE)}px;height:${String(SIZE)}px`;
    element.renderPath = "objects";
    // Drawing every frame, as graphty-element does by default (the test setups turn drawing on demand on, and the
    // render loop then asks the scene's readiness itself after a change, which is not the re-freeze counted here).
    element.renderOnDemand = false;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.session.data.addNodes(
        Array.from({ length: 100 }, (_, at) => ({
            id: `n${String(at)}`,
            position: { x: (at % 10) * 3, y: Math.floor(at / 10) * 3, z: 0 },
        })),
    );
    await element.session.styles.add({
        name: "Hover color",
        target: "node",
        selector: { match: "state", state: "hovered" },
        set: { "node.color": "#ff00ff" },
    });
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.waitForSettled();
    await element.waitForStableFrame();
    const { scene } = element.graph;
    await vi.waitFor(() => {
        assert.isTrue(frozen(scene), "the settled scene's drawn list is frozen");
    });
    return element;
}

/**
 * Count the thaws of the drawn list and the whole-scene readiness questions while `act` runs, then until the
 * picture is stable and the list frozen again.
 * @param element - The element.
 * @param act - The input.
 * @returns The counts.
 */
async function counted(element: Graphty, act: () => Promise<void>): Promise<{ thaws: number; readiness: number }> {
    const { scene } = element.graph;
    const counts = { thaws: 0, readiness: 0 };
    const unfreeze = scene.unfreezeActiveMeshes.bind(scene);
    const isReady = scene.isReady.bind(scene);
    scene.unfreezeActiveMeshes = () => {
        counts.thaws++;
        return unfreeze();
    };
    scene.isReady = (...args) => {
        counts.readiness++;
        return isReady(...args);
    };
    try {
        await act();
        await drawnFrames(scene, 4);
        await element.waitForStableFrame();
        await vi.waitFor(() => {
            assert.isTrue(frozen(scene), "the list is frozen again");
        });
    } finally {
        scene.unfreezeActiveMeshes = unfreeze;
        scene.isReady = isReady;
    }

    return counts;
}

describe("re-freezing the drawn list after an input", () => {
    it("asks the scene no readiness question after a hover restyles a node, or a click selects one", async () => {
        const element = await grid();
        const at = element.nodeScreenPosition("n55");
        assert.isTrue(at?.visible === true, "n55 is on screen");
        if (at === undefined) {
            throw new Error("unreachable");
        }

        const hovered = await counted(element, async () => {
            await hover(element, at);
            await vi.waitFor(() => {
                assert.strictEqual(element.session.selection.hovered, "n55", "the pointer hovers n55");
            });
        });
        // The hover restyles n55, which thaws the list for the frame that draws it; the freeze after it walks nothing.
        assert.isAtLeast(hovered.thaws, 1, "the restyle thawed the list");
        assert.strictEqual(hovered.readiness, 0, `no whole-scene readiness walk: ${JSON.stringify(hovered)}`);

        const selected = await counted(element, async () => {
            await click(element, at);
            await vi.waitFor(() => {
                assert.deepEqual([...element.session.selection.nodes], ["n55"], "the click selected n55");
            });
        });
        assert.strictEqual(selected.readiness, 0, `no whole-scene readiness walk: ${JSON.stringify(selected)}`);
    });

    it("thaws nothing when a consumer reads the camera of a still graph", async () => {
        const element = await grid();
        const read = await counted(element, async () => {
            for (let i = 0; i < 3; i++) {
                element.getCameraState();
                await drawnFrames(element.graph.scene, 1);
            }
        });
        assert.deepEqual(read, { thaws: 0, readiness: 0 }, "reading the camera changes nothing drawn");
    });
});
