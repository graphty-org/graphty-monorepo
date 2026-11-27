/**
 * @file Counted-work scaling of the pointer over the nodes: real mouse moves, a click and a drag
 * on a graph of n and of 4n nodes make the same number of `scene.pick` calls. Each node used to
 * pick the scene itself on every move and every press, to ask whether the pointer was over it, so
 * one move cost one pick per node, each testing every mesh (issue #2941). And each pick builds the
 * ray in the space of every mesh it tests, so a move onto a node on a graph of n and of 10n nodes
 * builds the same number of rays: only the meshes the pointer's ray can reach are tested (issue
 * #3244). Counted, never timed (issue #1643).
 */
import "../../src/graphty-element";

import { Ray } from "@babylonjs/core";
import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { pickWork } from "../../src/render/PickService";
import { click, drag, hover, moveHeld, nextFrame, type Point, press, release } from "../helpers/real-input";

/** The two graph sizes: big enough that a pick per node is 4x. */
const SIZES = [100, 400] as const;

const WIDTH = 400;
const HEIGHT = 300;

/** A spot with no node under it. */
const EMPTY: Point = { x: 30, y: HEIGHT - 30 };

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element with node `t` at the origin and `size - 1` more nodes in a ring far around
 * it, drawn.
 * @param size - The node count.
 * @returns The element.
 */
async function mounted(size: number): Promise<Graphty> {
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
    const ring = Array.from({ length: size - 1 }, (_, at) => {
        const angle = (2 * Math.PI * at) / (size - 1);
        return { id: `n${String(at)}`, position: { x: 20 * Math.cos(angle), y: 20 * Math.sin(angle), z: 0 } };
    });
    await element.session.data.addNodes([{ id: "t", position: { x: 0, y: 0, z: 0 } }, ...ring]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Where node `t` is drawn.
 * @param element - The element.
 * @returns Its center in CSS pixels from the element's top-left corner.
 */
function target(element: Graphty): Point {
    const position = element.nodeScreenPosition("t");
    assert.isDefined(position, "node t is drawn");
    assert.isTrue(position.visible, "node t is on screen");
    return { x: position.x, y: position.y };
}

/**
 * Point at node `t`, leave it, click it and drag it, through real input, counting the scene picks
 * made while doing so; and check each did what a reader sees.
 * @param size - The node count.
 * @returns The picks made.
 */
async function picksFor(size: number): Promise<number> {
    const element = await mounted(size);
    const { scene } = element.graph;
    const hovered: unknown[] = [];
    element.addEventListener("graphty-node-hover", (event) => {
        hovered.push((event as CustomEvent<{ nodeId: unknown }>).detail.nodeId);
    });

    let picks = 0;
    const pick = scene.pick.bind(scene);
    scene.pick = (...args) => {
        picks++;
        return pick(...args);
    };
    try {
        // Frames drawn while the input is sent make no picks of their own: only the input does.
        element.graph.engine.stopRenderLoop();
        const at = target(element);

        await hover(element, EMPTY);
        await hover(element, at);
        await vi.waitFor(() => {
            assert.deepStrictEqual(hovered, ["t"], "pointing at the node reported one hover");
        });
        await hover(element, EMPTY);
        await hover(element, at);
        await vi.waitFor(() => {
            assert.deepStrictEqual(hovered, ["t", "t"], "leaving and coming back reported a second hover");
        });

        await click(element, at);
        await vi.waitFor(() => {
            assert.strictEqual(element.getSelectedNode()?.id, "t", "the click selected the node");
        });
        assert.isFalse(element.isPinned("t"), "a click pins nothing");

        await drag(element, at, { x: at.x + 40, y: at.y + 30 });
        await vi.waitFor(() => {
            assert.isTrue(element.isPinned("t"), "the dragged node is pinned");
        });
        return picks;
    } finally {
        scene.pick = pick;
    }
}

describe("the pointer over the nodes", () => {
    it("makes the same number of scene picks at any graph size", async () => {
        const [small, large] = [await picksFor(SIZES[0]), await picksFor(SIZES[1])];
        const message = `scene picks: ${String(small)} at ${String(SIZES[0])} nodes, ${String(large)} at ${String(SIZES[1])}`;
        assert.isAbove(small, 0, message);
        assert.strictEqual(large, small, message);
    });
});

/**
 * Move the pointer onto the canvas at an empty spot and then onto node `t`, through real input, counting the picking rays Babylon builds
 * meanwhile (one per mesh a pick tests, in that mesh's space), and check the hover reported `t`.
 * @param size - The node count.
 * @returns The rays built.
 */
async function raysFor(size: number): Promise<number> {
    const element = await mounted(size);
    const hovered: unknown[] = [];
    element.addEventListener("graphty-node-hover", (event) => {
        hovered.push((event as CustomEvent<{ nodeId: unknown }>).detail.nodeId);
    });

    const at = target(element);
    // Frames drawn while the input is sent build no rays of their own: only the input does.
    element.graph.engine.stopRenderLoop();

    let rays = 0;
    const unproject = Ray.prototype.unprojectRayToRef;
    Ray.prototype.unprojectRayToRef = function (this: Ray, ...args) {
        rays++;
        unproject.apply(this, args);
    };
    try {
        // The first move into the canvas counts too: Babylon installs its own move predicate then.
        await hover(element, EMPTY);
        await hover(element, at);
        await vi.waitFor(() => {
            assert.deepStrictEqual(hovered, ["t"], "pointing at the node reported one hover, for that node");
        });
        return rays;
    } finally {
        Ray.prototype.unprojectRayToRef = unproject;
    }
}

describe("one pointer move onto a node", () => {
    it("tests the same number of meshes at 10x the nodes", async () => {
        const [small, large] = [await raysFor(100), await raysFor(1000)];
        const message = `picking rays built: ${String(small)} at 100 nodes, ${String(large)} at 1000`;
        assert.isAbove(small, 0, message);
        assert.strictEqual(large, small, message);
    });
});

describe("one click on a node", () => {
    it("picks the scene once for the press: the release reuses its answer", async () => {
        const element = await mounted(SIZES[0]);
        const at = target(element);
        await hover(element, at);
        // Frames drawn while the input is sent make no picks of their own: only the input does.
        element.graph.engine.stopRenderLoop();

        const before = pickWork.meshPicks;
        const babylonBefore = pickWork.pointerPicks;
        await click(element, at);
        await vi.waitFor(() => {
            assert.strictEqual(element.getSelectedNode()?.id, "t", "the click selected the node");
        });

        // Each pick walks every mesh on the "objects" path. One for the move the click arrives
        // with (the hover) and one for the press. Before, the release picked again to tell a node
        // from the background, and again to look for a close button no label in the scene has:
        // four walks for one click (issue #10116). On "batched" the hover reads the node ID target
        // instead, so only the press walks.
        const batched = element.renderPath === "batched";
        assert.strictEqual(
            pickWork.meshPicks - before,
            batched ? 1 : 2,
            batched ? "the press's walk, nothing more" : "the hover's walk and the press's, nothing more",
        );
        // Babylon picks the move, the press and the release again, for the cursor and the node's actions. On "objects"
        // the press and the release are answered from the press's walk, where they were two more walks of every mesh,
        // about 45 ms each at 99,000 nodes (issue #10116). On "batched" the row scan answers the press, which Babylon's
        // picks cannot reuse, so it makes all three.
        assert.strictEqual(
            pickWork.pointerPicks - babylonBefore,
            batched ? 3 : 1,
            batched
                ? "Babylon picks the move, the press and the release"
                : "Babylon walks the meshes for the move only",
        );
    });
});

/**
 * Turn the camera by dragging from the empty spot through real input, in `moves` held moves, counting the picks
 * Babylon makes of its own of the pointer (for the cursor and the meshes' actions) meanwhile.
 * @param element - The element.
 * @param moves - The held moves.
 * @returns Babylon's pointer picks.
 */
async function babylonPicksInCameraDrag(element: Graphty, moves: number): Promise<number> {
    const before = pickWork.pointerPicks;
    const start = JSON.stringify(element.getCameraState());
    await press(element, EMPTY);
    for (let step = 1; step <= moves; step++) {
        await moveHeld(element, { x: EMPTY.x + 8 * step, y: EMPTY.y - 4 * step });
    }

    await release(element, { x: EMPTY.x + 8 * moves, y: EMPTY.y - 4 * moves });
    await nextFrame();
    assert.notStrictEqual(JSON.stringify(element.getCameraState()), start, "the drag turned the camera");
    return pickWork.pointerPicks - before;
}

describe("a camera drag", () => {
    it("makes no pick of Babylon's own on its moves, at any drag length", async () => {
        const element = await mounted(SIZES[1]);
        await hover(element, EMPTY);
        const [short, long] = [await babylonPicksInCameraDrag(element, 2), await babylonPicksInCameraDrag(element, 10)];
        // Only the press and the release are picked, however long the drag: each move of a camera drag walked every
        // mesh again, about 19 ms a move at 100,000 nodes, for a cursor and pointer-over actions no node mesh has.
        const message = `Babylon's pointer picks: ${String(short)} in a drag of 2 moves, ${String(long)} in 10`;
        assert.isAbove(short, 0, message);
        assert.strictEqual(long, short, message);
    });

    it("leaves Babylon picking the moves once the button is up", async () => {
        const element = await mounted(SIZES[0]);
        await hover(element, EMPTY);
        await babylonPicksInCameraDrag(element, 3);
        const before = pickWork.pointerPicks;
        await hover(element, target(element));
        assert.strictEqual(pickWork.pointerPicks - before, 1, "the move after the drag is picked by Babylon");
        assert.isFalse(element.graph.scene.skipPointerMovePicking, "nothing is left skipping");
    });
});
