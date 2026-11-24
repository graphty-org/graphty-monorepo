/**
 * @file Layout transitions on a real graph (design/rendering/shader-styles.md, package E7): with
 * `layoutTransition` set, a new layout moves the nodes over the transition's duration while their
 * edges and labels follow and a click selects by the new layout; with none, the nodes are drawn at
 * the new layout's places on the first frame. Clicks are real mouse input.
 */

import "../../../src/graphty-element";

import { Vector3 } from "@babylonjs/core";
import { afterAll, afterEach, assert, beforeAll, describe, it, vi } from "vitest";

import {
    type AuthoredLayoutDescriptor,
    clearRegisteredLayoutsForTesting,
    clearRegisteredTransitionsForTesting,
    registerSnapshotLayout,
    registerTransition,
    type SnapshotLayoutInput,
} from "../../../extend";
import type { Graphty } from "../../../index.js";
import type { Edge } from "../../../src/Edge";
// edgeInternals is read through the module, not imported by name: the build from before the renderer work lacks
// it, and this file's other cases run against that build too (benchmarks/compare/parity-vs-reference.mjs).
import * as edgeModule from "../../../src/Edge";
import { operationQueueOf } from "../../../src/Graph";
import { dataManagerInternals } from "../../../src/managers/DataManager";
import type { RenderPath } from "../../../src/meshes/NodeBatch";
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

/** How a test's one edge is drawn, and where. */
interface Setup {
    /** The render path. */
    path?: RenderPath;
    /** 2D or 3D. */
    view?: "2d" | "3d";
    /**
     * The edge: directed with its default arrowhead, directed with the head turned off by a layer,
     * or undirected (which draws no head).
     */
    edge?: "arrow" | "no-head" | "undirected";
}

/**
 * A mounted element drawing two joined nodes at fixed places, with labels.
 * @param setup - How the edge is drawn, and where; 2D, the objects path and an arrowhead by default.
 * @returns The element.
 */
async function mounted(setup: Setup = {}): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    if (setup.path !== undefined) {
        element.renderPath = setup.path;
    }

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
    await element.session.data.addEdges([
        setup.edge === "undirected" ? { source: "a", target: "b", directed: false } : { source: "a", target: "b" },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode(setup.view ?? "2d");
    if (setup.edge === "no-head") {
        await element.session.styles.add({
            name: "No head",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "none" },
        });
    }

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

/**
 * Where an edge's line is drawn from and to: the row centers a line pulled from the row table is
 * drawn between, or the first and last points of its run of slots.
 * @param element - The element.
 * @param edge - The edge.
 * @returns Its two ends, source first.
 */
function drawnEnds(element: Graphty, edge: Edge): [Vector3, Vector3] {
    const { lineBatch, lineSlots, pulled } = edgeModule.edgeInternals.drawn(edge);
    if (pulled !== null) {
        const table = element.graph.getRowTable();
        assert.isNotNull(table, "a pulled line is drawn from the row table");
        return [table.centerOf(pulled.source), table.centerOf(pulled.target)];
    }

    const last = lineSlots.at(-1);
    assert(lineBatch !== null && last !== undefined, "the line is drawn");
    return [lineBatch.endsOf(lineSlots[0])[0], lineBatch.endsOf(last)[1]];
}

/**
 * How far an edge's drawn end is off its node as drawn: its distance from the line between the two
 * nodes' drawn centers, and from its own node's center.
 * @param end - The drawn end.
 * @param node - Its node.
 * @param other - The other end's node.
 * @returns The two distances.
 */
function offNode(end: Vector3, node: Node, other: Node): { off: number; from: number } {
    const centre = node.drawnPosition;
    const along = other.drawnPosition.subtract(centre).normalize();
    const rel = end.subtract(centre);
    const off = rel.subtract(along.scale(Vector3.Dot(rel, along))).length();
    return { off, from: rel.length() };
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
        const middle = edge.drawnCenter;
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

    // Issue #9222: an edge with no arrowhead was laid between the layout's final answer, so it jumped
    // there on the first frame and its nodes glided in to meet it. An arrowhead casts its ends from the
    // drawn node meshes, which hid it from the test above. Every frame of the move is checked.
    describe.each([
        { path: "objects", view: "2d", edge: "arrow" },
        { path: "objects", view: "2d", edge: "no-head" },
        { path: "objects", view: "2d", edge: "undirected" },
        { path: "objects", view: "3d", edge: "arrow" },
        { path: "objects", view: "3d", edge: "no-head" },
        { path: "objects", view: "3d", edge: "undirected" },
        { path: "batched", view: "2d", edge: "arrow" },
        { path: "batched", view: "2d", edge: "no-head" },
        { path: "batched", view: "2d", edge: "undirected" },
        { path: "batched", view: "3d", edge: "arrow" },
        { path: "batched", view: "3d", edge: "no-head" },
        { path: "batched", view: "3d", edge: "undirected" },
    ] as const)("an edge ($edge) on the $path path in $view", (setup) => {
        it("keeps both ends on its nodes as drawn on every frame of the move", async () => {
            const element = await mounted(setup);
            const scene = element.graph.getScene();
            const a = nodeOf(element, "a");
            const b = nodeOf(element, "b");
            const edge = [...element.graph.getDataManager().edges.values()][0];
            await element.session.config.set({ layoutTransition: { transition: "e7/linear", seconds: 0.6 } });
            const runner = (): ReturnType<typeof transitionsOf> => transitionsOf(element.graph.getLayoutManager());
            const misses: string[] = [];
            let moving = 0;
            const watch = scene.onAfterRenderObservable.add(() => {
                if (runner()?.active !== true) {
                    return;
                }

                const { y } = a.drawnPosition;
                if (y <= -1 + 0.01 || y >= 1 - 0.01) {
                    return;
                }

                moving++;
                const [src, dst] = drawnEnds(element, edge);
                for (const [end, node, other] of [
                    [src, a, b],
                    [dst, b, a],
                ] as const) {
                    const { off, from } = offNode(end, node, other);
                    // on the line between the drawn centers, and no further from its own than its outline and cap
                    if (off > 0.02 || from > 1.5) {
                        misses.push(`frame ${String(moving)}: ${node.id} end ${end.toString()} off ${String(off)}`);
                    }
                }
            });
            cleanups.push(() => scene.onAfterRenderObservable.remove(watch));

            await element.graph.setLayout("e7-row");
            await until(element, "the move ends", () => runner()?.active === false);
            assert.isAbove(moving, 1, "the move was drawn over several frames part way");
            assert.deepEqual(misses.slice(0, 3), [], "each end sits on its node as drawn on every frame");
        });
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
        // The move runs on the wall clock, and the test samples it once a drawn frame: one slow
        // frame (the cloud's first draw compiles its shader) stepped the 0.4 s move past the
        // whole span where node a is shrunk, and the wait never saw it. So time advances one
        // 60 Hz frame per drawn frame, and the move takes the same 24 frames however slow they are.
        let clock = performance.now();
        const now = vi.spyOn(performance, "now").mockImplementation(() => clock);
        const tick = scene.onBeforeRenderObservable.add(() => {
            clock += 1000 / 60;
        });
        cleanups.push(() => {
            scene.onBeforeRenderObservable.remove(tick);
            now.mockRestore();
        });
        const cloud = (): boolean => scene.meshes.some((mesh) => mesh.name === "graphtyTransitionParticles");
        // Every drawn frame of the move is checked, not the frames a wait happens to sample: node a
        // must be drawn shrunk on some frame that also draws its cloud.
        const a = nodeOf(element, "a");
        let gaveWay = false;
        const watch = scene.onAfterRenderObservable.add(() => {
            gaveWay ||= cloud() && a.mesh.scaling.x < 0.5;
        });
        cleanups.push(() => scene.onAfterRenderObservable.remove(watch));
        await element.session.config.set({
            layoutTransition: { transition: "e7/particles", seconds: 0.4, params: { particles: 4 } },
        });
        await element.graph.setLayout("e7-row");
        await until(element, "the cloud is drawn while the nodes move", cloud);
        const mesh = scene.meshes.find((each) => each.name === "graphtyTransitionParticles");
        assert.strictEqual((mesh as { forcedInstanceCount?: number }).forcedInstanceCount, 8, "4 per node");
        await until(element, "the cloud is gone once they land", () => !cloud());
        assert.isTrue(gaveWay, "node a gives way to its cloud on its way");
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

// Issue #9864: on the batched path a node added after the first frame is drawn from its row with no
// Node, and a transition moves that row by itself. A dashed edge is laid on the CPU from its rows,
// and was left at the old layout while its nodes moved.
describe.each([
    { path: "objects", view: "2d" },
    { path: "objects", view: "3d" },
    { path: "batched", view: "2d" },
    { path: "batched", view: "3d" },
] as const)("a dashed edge between rows with no Node on the $path path in $view", ({ path, view }) => {
    // A Node built part way through the move (a selection, a hover, a read of the node) is drawn by the same move.
    it.each([
        { built: "no node", when: "never" },
        { built: "node a", when: "part way" },
    ] as const)(
        "keeps both ends on its nodes as drawn on every frame of the move, $built built $when",
        async ({ when }) => {
            const element = document.createElement("graphty-element");
            element.renderPath = path;
            element.style.display = "block";
            element.style.width = `${String(WIDTH)}px`;
            element.style.height = `${String(HEIGHT)}px`;
            document.body.appendChild(element);
            cleanups.push(() => {
                element.remove();
            });
            await element.updateComplete;
            await element.setViewMode(view);
            await element.session.styles.add({
                name: "Dashed",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.style": "dash" },
            });
            await operationQueueOf(element.graph).waitForCompletion();
            await element.waitForStableFrame();
            // Added once the element has drawn: the batched path stores these rows with no Node.
            await element.session.data.addNodes([
                { id: "a", position: { x: -4, y: -1, z: 0 } },
                { id: "b", position: { x: 4, y: -1, z: 0 } },
            ]);
            await element.session.data.addEdges([{ source: "a", target: "b", directed: false }]);
            await element.graph.setLayout("fixed", { dim: 3 });
            await operationQueueOf(element.graph).waitForCompletion();
            await element.waitForStableFrame();

            const scene = element.graph.getScene();
            const edge = [...element.graph.getDataManager().edges.values()][0];
            assert.isNull(edgeInternals.drawn(edge).pulled, "the dashed line is laid on the CPU, not pulled");
            const runner = (): ReturnType<typeof transitionsOf> => transitionsOf(element.graph.getLayoutManager());
            const misses: string[] = [];
            let moving = 0;
            const watch = scene.onAfterRenderObservable.add(() => {
                const a = element.nodeScreenPosition("a");
                const b = element.nodeScreenPosition("b");
                if (runner()?.active !== true || a === undefined || b === undefined) {
                    return;
                }

                moving++;
                if (when === "part way" && moving === 3) {
                    nodeOf(element, "a");
                }

                const [src, dst] = drawnEnds(element, edge).map((end) => element.worldToScreen(end));
                for (const [end, node, other] of [
                    [src, a, b],
                    [dst, b, a],
                ] as const) {
                    // on the line between the nodes as drawn, in screen pixels, and near its own node
                    const along = { x: other.x - node.x, y: other.y - node.y };
                    const span = Math.hypot(along.x, along.y);
                    const rel = { x: end.x - node.x, y: end.y - node.y };
                    const off = Math.abs(rel.x * along.y - rel.y * along.x) / span;
                    if (off > 1 || Math.hypot(rel.x, rel.y) > span / 2) {
                        misses.push(
                            `frame ${String(moving)}: end ${JSON.stringify(end)} off its node by ${String(off)}`,
                        );
                    }
                }
            });
            cleanups.push(() => scene.onAfterRenderObservable.remove(watch));

            await element.session.config.set({ layoutTransition: { transition: "e7/linear", seconds: 0.6 } });
            await element.graph.setLayout("e7-row");
            await until(element, "the move ends", () => runner()?.active === false);
            if (path === "batched") {
                assert.strictEqual(
                    dataManagerInternals.nodesBuilt(element.graph.getDataManager()),
                    when === "never" ? 0 : 1,
                    "only the nodes the test read have a Node",
                );
            }

            assert.isAbove(moving, 1, "the move was drawn over several frames");
            assert.deepEqual(misses.slice(0, 3), [], "each end sits on its node as drawn on every frame");
        },
    );
});
