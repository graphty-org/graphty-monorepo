/**
 * @file `fitToGraph` with `keepAngle` only zooms and pans: after the reader orbits by a real drag,
 * the camera's direction and pivot rotation are unchanged, and the framed nodes fill the canvas on
 * their limiting axis, centered. Framing the selection does the same with `camera.pivotOnSelection`
 * on, so the view's placement wins over the glide to the selection's center. In 2D a turned view
 * keeps its turn and still fills the canvas, for the graph and for the selection. Read through the
 * public API: `getCameraState` and `nodeScreenPosition`.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drag } from "../helpers/real-input";

const WIDTH = 640;
const HEIGHT = 400;

/** Spread unevenly in all three axes, so a centered 3D box is not a centered picture. */
const NODES = [
    { id: "a", position: { x: -40, y: 10, z: 5 } },
    { id: "b", position: { x: 35, y: -20, z: -30 } },
    { id: "c", position: { x: 10, y: 30, z: 25 } },
    { id: "d", position: { x: -15, y: -35, z: 40 } },
    { id: "e", position: { x: 50, y: 5, z: 10 } },
    { id: "f", position: { x: -5, y: 0, z: -45 } },
    { id: "g", position: { x: 20, y: 20, z: -10 } },
    { id: "h", position: { x: -30, y: 25, z: -20 } },
];

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

async function mounted(mode: "2d" | "3d", pivotOnSelection = false): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(mode);
    if (pivotOnSelection) {
        element.layoutBehavior = { camera: { pivotOnSelection: true } };
    }
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(
        mode === "3d" ? NODES : NODES.map(({ id, position }) => ({ id, position: { ...position, z: 0 } })),
    );
    await element.graph.setLayout("fixed", { dim: mode === "3d" ? 3 : 2 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/** Orbit by a real pointer drag across the canvas. */
async function orbit(element: Graphty): Promise<void> {
    await drag(element.graph.canvas, { x: 200, y: 150 }, { x: 330, y: 230 });
    await element.waitForStableFrame();
}

function direction(element: Graphty): number[] {
    const { position, target } = element.graph.getCameraState();
    assert.exists(position);
    assert.exists(target);
    const d = [position.x - target.x, position.y - target.y, position.z - target.z];
    const length = Math.hypot(...d);
    return d.map((v) => v / length);
}

/** Assert the nodes' screen box reaches at least 0.9 of the canvas on its limiting axis, centered within 5 percent. */
function assertFills(element: Graphty, ids: readonly string[]): void {
    let [left, top, right, bottom] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const id of ids) {
        const at = element.graph.nodeScreenPosition(id);
        assert.exists(at, `node ${id} is drawn`);
        left = Math.min(left, at.x);
        right = Math.max(right, at.x);
        top = Math.min(top, at.y);
        bottom = Math.max(bottom, at.y);
    }

    const where = `box ${left.toFixed(1)}..${right.toFixed(1)} x ${top.toFixed(1)}..${bottom.toFixed(1)}`;
    const fill = Math.max((right - left) / WIDTH, (bottom - top) / HEIGHT);
    assert.isAtLeast(fill, 0.9, `fills the canvas: ${where}`);
    assert.isAtMost(fill, 1.001, `stays inside the canvas: ${where}`);
    assert.isAtMost(Math.abs((left + right) / 2 - WIDTH / 2) / WIDTH, 0.05, `centered across: ${where}`);
    assert.isAtMost(Math.abs((top + bottom) / 2 - HEIGHT / 2) / HEIGHT, 0.05, `centered up and down: ${where}`);
}

function assertAngleKept(
    element: Graphty,
    before: { direction: number[]; turn: { x: number; y: number; z: number } },
): void {
    const after = direction(element);
    for (let i = 0; i < 3; i++) {
        assert.closeTo(after[i], before.direction[i], 1e-3, "the direction is kept");
    }

    const turn = element.graph.getCameraState().pivotRotation;
    assert.exists(turn);
    assert.closeTo(turn.x, before.turn.x, 1e-3, "pitch kept");
    assert.closeTo(turn.y, before.turn.y, 1e-3, "yaw kept");
    assert.closeTo(turn.z, before.turn.z, 1e-3, "roll kept");
}

function angleNow(element: Graphty): { direction: number[]; turn: { x: number; y: number; z: number } } {
    const turn = element.graph.getCameraState().pivotRotation;
    assert.exists(turn);
    return { direction: direction(element), turn };
}

describe("fitToGraph with keepAngle", () => {
    it("after an orbit, Fit only zooms and pans, and the graph fills the canvas", async () => {
        const element = await mounted("3d");
        await orbit(element);
        const before = angleNow(element);
        assert.isAbove(Math.abs(before.direction[0] - 1 / Math.sqrt(3)), 0.01, "the drag moved off the diagonal");

        await element.applyCameraView("fitToGraph", { params: { keepAngle: true }, animate: false });
        await element.waitForStableFrame();

        assertAngleKept(element, before);
        assertFills(
            element,
            NODES.map((node) => node.id),
        );
    });

    it("Fit selection frames the selected nodes the same way, with Follow selection on", async () => {
        const element = await mounted("3d", true);
        await orbit(element);
        const selected = ["a", "b", "c", "f"];
        await element.session.selection.apply({ nodes: selected });
        await element.waitForStableFrame();
        const before = angleNow(element);

        await element.applyCameraView("fitToGraph", {
            scope: "selection",
            params: { keepAngle: true },
            animate: false,
        });
        await element.waitForStableFrame();

        assertAngleKept(element, before);
        assertFills(element, selected);
    });

    it("in 2D a turned view keeps its turn", async () => {
        const element = await mounted("2d");
        await element.setCameraState({ rotation: 0.5 }, { animate: false });
        await element.waitForStableFrame();

        await element.applyCameraView("fitToGraph", { params: { keepAngle: true }, animate: false });
        await element.waitForStableFrame();

        assert.closeTo(element.graph.getCameraState().rotation ?? 0, 0.5, 1e-3);
        assertFills(
            element,
            NODES.map((node) => node.id),
        );
    });

    it("in 2D a turned view frames the selection to fill the canvas, keeping its turn", async () => {
        const element = await mounted("2d");
        await element.setCameraState({ rotation: 1.2 }, { animate: false });
        const selected = ["a", "c", "d", "g"];
        await element.session.selection.apply({ nodes: selected });
        await element.waitForStableFrame();

        await element.applyCameraView("fitToGraph", {
            scope: "selection",
            params: { keepAngle: true },
            animate: false,
        });
        await element.waitForStableFrame();

        assert.closeTo(element.graph.getCameraState().rotation ?? 0, 1.2, 1e-3);
        assertFills(element, selected);
    });
});
