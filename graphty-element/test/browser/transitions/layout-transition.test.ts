/**
 * @file Layout transitions on a real graph (design/rendering/shader-styles.md, package E7): with
 * `layoutTransition` set, a new layout moves the nodes over the transition's duration while their
 * edges and labels follow and a click selects by the new layout; with none, the nodes are drawn at
 * the new layout's places on the first frame. Clicks are real mouse input.
 */

import "../../../src/graphty-element";

import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";

import {
    type AuthoredLayoutDescriptor,
    clearRegisteredLayoutsForTesting,
    clearRegisteredTransitionsForTesting,
    registerSnapshotLayout,
    registerTransition,
    type SnapshotLayoutInput,
} from "../../../extend";
import type { Graphty } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";
import type { Node } from "../../../src/Node";
import { transitionsOf } from "../../../src/transitions/LayoutTransitionRunner";
import { drawnFrames } from "../../helpers/drawn-frames";
import { click } from "../../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

/** Each `move` call: its progress, for the test to read the clock the transition ran on. */
const progress: number[] = [];

/**
 * A layout that puts the nodes in a row at y = 1, `gap` apart, centered on x = 0.
 * @param input - The graph.
 * @returns The coordinates.
 */
function row(input: SnapshotLayoutInput): Float32Array<ArrayBuffer> {
    const gap = input.options.gap as number;
    const n = input.graph.nodeCount;
    const out = new Float32Array(input.dimensions * n);
    for (let i = 0; i < n; i++) {
        out[input.dimensions * i] = (i - (n - 1) / 2) * gap;
        out[input.dimensions * i + 1] = 1;
    }

    return out;
}

const ROW: AuthoredLayoutDescriptor = {
    id: "e7-row",
    plainName: "Row",
    technicalName: "Nodes in a row",
    description: "Puts the nodes in a row.",
    family: "geometric",
    kind: "batch",
    maxDimensions: 2,
    sizeRating: "any",
    structuralInputs: [],
    engine: "e7-row",
    options: [{ name: "gap", plainName: "Gap", type: "number", default: 4, min: 1, max: 100 }],
};

beforeAll(() => {
    registerSnapshotLayout({ descriptor: ROW, compute: row });
    registerTransition({
        descriptor: { id: "e7/linear", plainName: "Linear" },
        move: (t, from, to) => {
            progress.push(t);
            return {
                x: from.x + (to.x - from.x) * t,
                y: from.y + (to.y - from.y) * t,
                z: from.z + (to.z - from.z) * t,
            };
        },
    });
});

afterAll(() => {
    clearRegisteredLayoutsForTesting();
    clearRegisteredTransitionsForTesting();
});

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element drawing two joined nodes in 2D at fixed places, with labels.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    element.renderOnDemand = true;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        { id: "a", position: { x: -4, y: -1, z: 0 } },
        { id: "b", position: { x: 4, y: -1, z: 0 } },
    ]);
    await element.session.data.addEdges([{ source: "a", target: "b" }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    await element.session.styles.add({
        name: "Labels",
        target: "node",
        selector: { match: "everything" },
        set: { "node.label": "Mg" },
    });
    await operationQueueOf(element.graph).waitForCompletion();
    await drawnFrames(element.graph.getScene(), 2);
    return element;
}

/**
 * A node of the graph.
 * @param element - The element.
 * @param id - The node id.
 * @returns The node.
 */
function nodeOf(element: Graphty, id: string): Node {
    const node = element.graph.getNode(id);
    assert.isDefined(node, `the graph holds ${id}`);
    return node;
}

/**
 * Where the layout puts a node.
 * @param element - The element.
 * @param id - The node id.
 * @returns Its place.
 */
function layoutPlace(element: Graphty, id: string): { x: number; y: number; z: number } {
    const out = { x: 0, y: 0, z: 0 };
    element.session.positions.read(nodeOf(element, id).index, out);
    return out;
}

/**
 * Wait until a condition holds, counting drawn frames; fail after a bound.
 * @param element - The element.
 * @param what - What is awaited, for the failure.
 * @param holds - The condition.
 */
async function until(element: Graphty, what: string, holds: () => boolean): Promise<void> {
    const scene = element.graph.getScene();
    for (let i = 0; i < 600 && !holds(); i++) {
        await drawnFrames(scene, 1);
    }

    assert.isTrue(holds(), what);
}

describe("layout transitions", () => {
    it("lists a registered transition in the catalog", async () => {
        const element = await mounted();
        assert.include(
            element.session.catalog.transitions().map((descriptor) => descriptor.id),
            "e7/linear",
        );
    });

    it("moves the nodes over the duration while edges and labels follow, and a click reads the new layout", async () => {
        const element = await mounted();
        const a = nodeOf(element, "a");
        const edge = [...element.graph.getDataManager().edges.values()][0];
        await element.session.config.set({ layoutTransition: { transition: "e7/linear", seconds: 30 } });
        progress.length = 0;

        await element.graph.setLayout("e7-row");
        const target = layoutPlace(element, "a");
        assert.closeTo(target.y, 1, 1e-6, "the layout's answer is read at once");

        // Part of the way there: neither where it was nor where it is going.
        await until(element, "node a is drawn between its old and new places", () => {
            const { y } = a.mesh.position;
            return y > -1 + 0.01 && y < 1 - 0.01;
        });
        assert.isTrue(
            progress.some((t) => t > 0 && t < 1),
            "the transition was asked for a place part way through",
        );

        // The edge is drawn between the nodes as they are drawn, not as the layout has them.
        await drawnFrames(element.graph.getScene(), 1);
        const b = nodeOf(element, "b");
        const middle = edge.drawnCentre;
        assert.closeTo(middle.y, (a.mesh.position.y + b.mesh.position.y) / 2, 0.05, "the edge follows the nodes");
        const label = a.label?.labelMesh;
        assert.exists(label, "node a has a label");
        assert.isAbove(label.getAbsolutePosition().y, -1 + 0.01, "the label moved with its node");

        // A click where node a is going selects it while it is still drawn on its way there.
        const drawnY = a.mesh.position.y;
        assert.isBelow(drawnY, 1 - 0.01, "node a is still on its way");
        const point = element.worldToScreen(target);
        await click(element, point);
        await until(element, "the click selected node a", () => element.getSelectedNode()?.id === "a");

        // A new layout with no transition set places the nodes in one frame.
        await element.session.config.set({ layoutTransition: undefined });
        await element.graph.setLayout("e7-row", { gap: 6 });
        await drawnFrames(element.graph.getScene(), 1);
        const placed = layoutPlace(element, "a");
        assert.closeTo(a.mesh.position.x, placed.x, 1e-6, "no transition: drawn at the new place");
        assert.closeTo(a.mesh.position.y, placed.y, 1e-6);
    });

    it("lands exactly on the layout's answer when the duration ends", async () => {
        const element = await mounted();
        const a = nodeOf(element, "a");
        await element.session.config.set({ layoutTransition: { transition: "e7/linear", seconds: 0.2 } });
        await element.graph.setLayout("e7-row");
        const target = layoutPlace(element, "a");
        await until(
            element,
            "the transition ends",
            () => transitionsOf(element.graph.getLayoutManager())?.active === false,
        );
        await drawnFrames(element.graph.getScene(), 1);
        assert.closeTo(a.mesh.position.x, target.x, 1e-6);
        assert.closeTo(a.mesh.position.y, target.y, 1e-6);
    });

    it("holds the move part way as a final picture, and runs it on once the hold is cleared", async () => {
        const element = await mounted();
        const a = nodeOf(element, "a");
        // Held: the 30-second move must not keep the picture from being final for 30 seconds, nor
        // keep the camera's framing owed until it ends.
        await element.session.config.set({ layoutTransition: { transition: "e7/linear", seconds: 30, hold: 0.5 } });
        await element.graph.setLayout("e7-row");
        await element.waitForStableFrame();

        assert.isTrue(transitionsOf(element.graph.getLayoutManager())?.active, "the move is under way");
        assert.isTrue(element.isFrameStable, "a held move is a final picture");
        assert.closeTo(a.mesh.position.x, -3, 1e-6, "node a is drawn half way from x = -4 to x = -2");
        assert.closeTo(a.mesh.position.y, 0, 1e-6, "node a is drawn half way from y = -1 to y = 1");

        await element.session.config.set({ layoutTransition: { transition: "e7/linear", seconds: 30 } });
        await until(element, "node a moves on once the hold is cleared", () => a.mesh.position.y > 0.01);
    });

    it("draws the particle cloud only while a particles transition runs", async () => {
        registerTransition({
            descriptor: {
                id: "e7/particles",
                plainName: "Particles",
                params: [
                    { name: "particles", plainName: "Particles", type: "integer", default: 8, min: 1, max: 32 },
                    { name: "curl", plainName: "Curl", type: "number", default: 1, min: 0, max: 3 },
                ],
            },
            drawable: "particles",
            move: (t, from, to) => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, z: to.z }),
        });
        const element = await mounted();
        const scene = element.graph.getScene();
        const cloud = (): boolean => scene.meshes.some((mesh) => mesh.name === "graphtyTransitionParticles");
        await element.session.config.set({
            layoutTransition: { transition: "e7/particles", seconds: 0.4, params: { particles: 4 } },
        });
        await element.graph.setLayout("e7-row");
        await until(element, "the cloud is drawn while the nodes move", cloud);
        const mesh = scene.meshes.find((each) => each.name === "graphtyTransitionParticles");
        assert.strictEqual((mesh as { forcedInstanceCount?: number }).forcedInstanceCount, 8, "4 per node");
        const a = nodeOf(element, "a");
        await until(element, "node a gives way to its cloud on its way", () => a.mesh.scaling.x < 0.5);
        await until(element, "the cloud is gone once they land", () => !cloud());
        assert.strictEqual(a.mesh.scaling.x, 1, "node a is whole once it lands");
    });

    it("keeps every node on the canvas while they move, and does not jump the camera when they land", async () => {
        const element = await mounted();
        const scene = element.graph.getScene();
        await element.session.config.set({ layoutTransition: { transition: "e7/linear", seconds: 0.6 } });
        // The row is ten times as wide as the graph was: framed only once it lands, the nodes
        // leave the canvas on their way, and the camera then jumps out to the new layout.
        await element.graph.setLayout("e7-row", { gap: 80 });
        const runner = transitionsOf(element.graph.getLayoutManager());
        const zoom = (): number => scene.activeCamera?.orthoTop ?? Number.NaN;
        let last = zoom();
        let moved = 0;
        for (let i = 0; i < 600 && runner?.active !== false; i++) {
            await drawnFrames(scene, 1);
            if (runner?.active !== true) {
                break;
            }

            last = zoom();
            moved++;
            for (const id of ["a", "b"]) {
                const at = element.worldToScreen(nodeOf(element, id).mesh.position);
                assert.isTrue(
                    at.x >= 0 && at.x <= WIDTH && at.y >= 0 && at.y <= HEIGHT,
                    `node ${id} is on the canvas on frame ${String(moved)} of the move`,
                );
            }
        }

        assert.isAbove(moved, 1, "the move was drawn over several frames");
        await drawnFrames(scene, 2);
        assert.closeTo(zoom() / last, 1, 0.1, "the camera frames the landed layout as the move ended on it");
    });
});
