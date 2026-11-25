/**
 * @file On the `"batched"` render path most rows are drawn with no `Node` or `Edge`. Three paths built
 * one for every row (issues #10023 and #10031):
 *
 * - `element.pinnedNodes` asked every `Node` whether it was pinned: 747 ms and +52 MB at 20,000 nodes
 *   to return an empty set.
 * - `graph.getEdges()` was `Array.from` over the edge map, which builds every `Edge`.
 * - a 2D layout put each node with a Z onto the plane through its `Node`.
 *
 * What is asserted is counted work: the `Node`s and `Edge`s each step builds. The pin is made by
 * the browser's own input pipeline, a drag of the node.
 */

import "../../src/graphty-element";

import type { F32 } from "@graphty/graph-format";
import { afterEach, assert, describe, it } from "vitest";

import type { AuthoredLayoutDescriptor } from "../../extend";
import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { LayoutEngine } from "../../src/layout/LayoutEngine";
import { SnapshotLayoutEngine, type SnapshotLayoutInput } from "../../src/layout/SnapshotLayoutEngine";
import { dataManagerInternals } from "../../src/managers/DataManager";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { curveWork } from "../../src/meshes/pulledCurve";
import { drag, hover } from "../helpers/real-input";

const COUNT = 40;
const NODES = Array.from({ length: COUNT }, (_, id) => ({
    id,
    position: { x: (id % 8) * 3 - 10, y: Math.floor(id / 8) * 3 - 6, z: (id % 3) * 2 - 2 },
}));
const EDGES = Array.from({ length: COUNT - 1 }, (_, id) => ({ src: id, dst: id + 1 }));

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * The graph, its nodes at positions that carry a Z.
 * @param path - The render path.
 * @param view - The view mode.
 * @param layout - The layout and its options.
 * @returns The element, its picture final.
 */
async function mounted(
    path: RenderPath,
    view: "2d" | "3d",
    layout: readonly [string, Record<string, unknown>],
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.viewMode = view;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.graph.setLayout(...layout);
    // A row line draws an edge with no arrowhead, so such an edge is stored with no `Edge`.
    await element.session.styles.add({
        name: "uncapped",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.arrowHead": "none" },
    });
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.waitForSettled();
    await element.waitForStableFrame();
    return element;
}

/**
 * The `Node`s and `Edge`s built so far.
 * @param element - The element.
 * @returns The counts.
 */
function built(element: Graphty): { nodes: number; edges: number } {
    const manager = element.graph.getDataManager();
    return { nodes: dataManagerInternals.nodesBuilt(manager), edges: dataManagerInternals.edgesBuilt(manager) };
}

/**
 * Every node's Z, by row.
 * @param element - The element.
 * @returns The Zs.
 */
function zs(element: Graphty): number[] {
    const { positions } = element.graph.getDataManager();
    const at = { x: 0, y: 0, z: 0 };
    return Array.from({ length: positions.count }, (_, row) => {
        positions.read(row, at);
        return at.z;
    });
}

const FIXED_3D = ["fixed", { dim: 3 }] as const;

/**
 * A layout that places every node at its data position, Z included, whatever the view, as a third party's may: the
 * element, not the engine, has to put its rows on the plane in 2D.
 */
class Echo extends SnapshotLayoutEngine {
    static override type = "test-echo-stored";
    static maxDimensions = 3;
    static override readonly descriptor: AuthoredLayoutDescriptor = {
        id: "test-echo-stored",
        plainName: "Echo",
        technicalName: "Echo",
        description: "Places every node at its data position, Z included, whatever the view.",
        family: "geometric",
        kind: "batch",
        maxDimensions: 3,
        sizeRating: "any",
        structuralInputs: [],
        engine: "test-echo-stored",
        options: [],
    };
    protected readonly dimensions = 3 as const;
    protected readonly options = {};

    protected compute(input: SnapshotLayoutInput): F32 {
        return Float32Array.from(input.dataPositions(), (v) => (Number.isNaN(v) ? 0 : v));
    }
}

/** {@link Echo} under a second name, so a layout can be built again over the first one's arrangement. */
class EchoAgain extends Echo {
    static override type = "test-echo-stored-again";
    static override readonly descriptor: AuthoredLayoutDescriptor = {
        ...Echo.descriptor,
        id: "test-echo-stored-again",
        engine: "test-echo-stored-again",
    };
}

LayoutEngine.register(Echo);
LayoutEngine.register(EchoAgain);

describe("reads on the batched path", () => {
    it("pinnedNodes, getEdges and getEdgeIds build no Node or Edge", async () => {
        const element = await mounted("batched", "3d", FIXED_3D);
        const before = built(element);
        assert.deepStrictEqual(before, { nodes: 0, edges: 0 }, "rows are drawn with no Node or Edge");

        assert.strictEqual(element.pinnedNodes.size, 0, "nothing is pinned");
        assert.strictEqual(element.graph.getEdges().length, EDGES.length, "every edge is listed");
        assert.strictEqual(element.graph.getEdgeIds().length, EDGES.length, "every edge id is listed");

        assert.deepStrictEqual(built(element), before, "the reads built nothing");
    });

    it("pinnedNodes answers a node a drag pinned, building no other", async () => {
        const element = await mounted("batched", "3d", FIXED_3D);
        const from = element.nodeScreenPosition(12);
        assert.isDefined(from, "node 12 is on screen");
        await drag(element, from, { x: from.x + 30, y: from.y + 20 });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        const before = built(element);
        assert.deepStrictEqual([...element.pinnedNodes], [12], "the drag pinned node 12");
        assert.isTrue(element.isPinned(12));
        assert.deepStrictEqual(built(element), before, "the read built nothing");
    });

    it("a curve restyle draws every curve from the rows, building no Edge (issue #10046)", async () => {
        const element = await mounted("batched", "3d", FIXED_3D);
        const lines = element.graph.getEdgeRowLines();
        assert.isNotNull(lines);
        const before = built(element);

        await element.session.styles.add({
            name: "curves",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "none", "edge.curvature": true },
        });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        assert.deepStrictEqual(built(element), before, "the restyle built no Edge");
        assert.strictEqual(lines?.count, EDGES.length, "every edge is drawn from its rows");
        assert.strictEqual(lines?.shownCurveRows().length, EDGES.length, "every edge is drawn as a curve");
        let bowed = 0;
        lines?.forEachShownCurve((_, points) => {
            // a lone curve's middle stands off its chord (`pulledCurve.ts` CONTROL_OFFSET)
            const middle = Math.floor(points.length / 8) * 4;
            const last = points.length - 4;
            const [ax, ay, bx, by] = [points[0], points[1], points[last], points[last + 1]];
            const [mx, my] = [points[middle], points[middle + 1]];
            const across = Math.abs((bx - ax) * (my - ay) - (by - ay) * (mx - ax)) / Math.hypot(bx - ax, by - ay);
            bowed += across > 0.1 ? 1 : 0;
        });
        assert.strictEqual(bowed, EDGES.length, "each curve is placed, bowed off its chord");

        // the pointer on a curve's middle, off its chord, finds that edge, still building none
        let middle: { x: number; y: number } | undefined;
        let row = -1;
        lines?.forEachShownCurve((at, points) => {
            const half = Math.floor(points.length / 8) * 4;
            middle ??= element.worldToScreen({ x: points[half], y: points[half + 1], z: points[half + 2] });
            row = row < 0 ? at : row;
        });
        assert.isDefined(middle);
        await hover(element, middle ?? { x: 0, y: 0 });
        const id = dataManagerInternals.unbuiltEdgeId(element.graph.getDataManager(), row);
        assert.isDefined(id, "the curve's edge is stored with no Edge");
        assert.deepEqual(element.elementAt(middle ?? { x: 0, y: 0 }), { kind: "edge", id }, "the curve is found");
        assert.deepStrictEqual(built(element), before, "the pick built no Edge");

        // a drag of node 12 moves its two curves and places no other
        const placed = (): Map<number, number[]> => {
            const all = new Map<number, number[]>();
            lines?.forEachShownCurve((at, points) => all.set(at, Array.from(points)));
            return all;
        };
        const still = placed();
        const from = element.nodeScreenPosition(12);
        assert.isDefined(from, "node 12 is on screen");
        const { spans } = curveWork;
        await drag(element, from, { x: from.x + 30, y: from.y + 20 });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        const moved = [...placed()].filter(([at, points]) => points.some((v, i) => v !== still.get(at)?.[i]));
        const manager = element.graph.getDataManager();
        assert.sameMembers(
            moved.map(([at]) => dataManagerInternals.unbuiltEdgeId(manager, at)),
            dataManagerInternals.incidentEdgeIds(manager, 12),
            "the dragged node's curves follow it, and no other moves",
        );
        // two curves a frame of the drag's eight moves; placing every curve on each frame would be 39 a frame
        assert.isBelow(curveWork.spans - spans, EDGES.length, "only the dragged node's curves are placed");
        // the drag builds the dragged node's `Node`, which its pointer handler is delivered to
        assert.strictEqual(built(element).edges, before.edges, "the drag built no Edge");
    });

    it("getEdges builds each Edge as it is read, in the order getEdgeIds lists the ids", async () => {
        const element = await mounted("batched", "3d", FIXED_3D);
        const edges = element.graph.getEdges();
        const ids = element.graph.getEdgeIds();
        assert.strictEqual(edges[5].id, ids[5], "an element read is the edge with that id");
        assert.strictEqual(built(element).edges, 1, "reading one element built one Edge");
        assert.deepStrictEqual(
            edges.map((edge) => edge.id),
            ids,
            "walking the array gives every edge in id order",
        );
    });
});

describe.each(["batched", "objects"] as const)("a layout built for 2D on %s", (path) => {
    it("draws a fixed arrangement whose data carries a Z on the plane", async () => {
        const element = await mounted(path, "2d", ["fixed", {}]);
        assert.deepStrictEqual(
            zs(element),
            NODES.map(() => 0),
            "every node is on the plane",
        );
    });

    it("puts a layout that keeps the data's Z onto the plane, building no Node or Edge", async () => {
        // The layout keeps each node's Z from its data, which the view's 2D does not stop.
        const element = await mounted(path, "2d", [Echo.type, {}]);
        assert.isTrue(
            zs(element).some((z) => z !== 0),
            "the arrangement holds nodes off the plane",
        );
        const before = built(element);

        await element.graph.setLayout(EchoAgain.type, {});
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        assert.deepStrictEqual(
            zs(element),
            NODES.map(() => 0),
            "every node is on the plane",
        );
        assert.deepStrictEqual(built(element), before, "the build built nothing");
    });

    it("puts a 3D fixed arrangement onto the plane when the view turns 2D, building no Node or Edge", async () => {
        const element = await mounted(path, "3d", FIXED_3D);
        const before = built(element);

        await element.setViewMode("2d");
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        assert.deepStrictEqual(
            zs(element),
            NODES.map(() => 0),
            "every node is on the plane",
        );
        assert.deepStrictEqual(built(element), before, "the switch built nothing");
    });
});
