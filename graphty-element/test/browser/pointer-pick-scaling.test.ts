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
import { click, drag, hover, type Point } from "../helpers/real-input";

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
 * @returns Its centre in CSS pixels from the element's top-left corner.
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
