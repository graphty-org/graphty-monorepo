/**
 * A pin belongs to the element, not to whichever layout engine happens to be running.
 *
 * What it used to be: `Node.pin()` handed the pin to the current engine and remembered which
 * engine that was, and `isPinned()` answered yes only while that same engine was still current.
 * `LayoutManager` builds a FRESH engine on every `setLayout`, on every 2D/3D view-mode switch and
 * on every style template that names a layout -- so all three silently released every pin the
 * reader had made. Worse, `unpin()` forwarded to the engine that was current NOW, so releasing a
 * node pinned before a layout change told an engine to let go of a node it had never been told
 * about, which under ngraph threw "Internal error: Node not found".
 *
 * And a pin meant nothing at all under fourteen of the sixteen engines, because a static layout
 * recomputes every coordinate from scratch and its `pin()` is a no-op: a reader who dragged a node
 * under a circular or a Kamada-Kawai arrangement watched it snap back to where the layout wanted
 * it the next time anything recomputed.
 *
 * What it is now: one byte beside the node's coordinates in the element's own position array. The
 * array refuses a LAYOUT write onto a pinned row and accepts a PLACEMENT one, which is what makes
 * a pin real for every engine at once while leaving a pinned node draggable; the live simulations
 * are still told, as a projection, so they stop spending force on a body that cannot move; and
 * `LayoutManager` replays the pins into every engine it builds.
 *
 * These tests drive real engines through the real manager, because the three rebuild paths are
 * the thing under test and a hand-swapped engine would exercise none of them.
 */
// Registers the element's sixteen engines, which is what `setLayout` looks them up in.
import "../../src/layout/index";

import { NullEngine, type Scene as BabylonScene, Scene } from "@babylonjs/core";
import { INVALID_INDEX } from "@graphty/graph-format";
import { afterEach, assert, describe, it } from "vitest";

import type { AdHocData, NodeStyleConfig } from "../../src/config";
import { WRITABLE_LANE } from "../../src/data/lane";
import type { Edge } from "../../src/Edge";
import { type LayoutEngine, layoutEngineInternals } from "../../src/layout/LayoutEngine";
import { DataManager, dataManagerInternals } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import { DefaultGraphContext, type GraphContext } from "../../src/managers/GraphContext";
import { LayoutManager, layoutManagerInternals } from "../../src/managers/LayoutManager";
import { StatsManager } from "../../src/managers/StatsManager";
import type { NodePaint } from "../../src/managers/StylePainter";
import { MeshCache } from "../../src/meshes/MeshCache";
import { Node } from "../../src/Node";
import { Styles } from "../../src/Styles";

const NODE_STYLE: NodeStyleConfig = {
    shape: { type: "icosphere", size: 1 },
    texture: { color: "#6366F1" },
};

const NODE_PAINT: NodePaint = { meshKey: "test-node", style: NODE_STYLE, color: null };

interface Harness {
    context: GraphContext;
    dataManager: DataManager;
    layoutManager: LayoutManager;
    scene: BabylonScene;
    add(id: string): Node;
    coordsOf(node: Node): { x: number; y: number; z: number };
    dispose(): void;
}

/**
 * Build a minimal but real graph context against a NullEngine scene, with a real position array.
 *
 * The nodes are given real row numbers, because a pin is a statement about a row: a node the graph
 * builder never took has nowhere to record one, and that is itself asserted below.
 * @returns a harness whose dispose() tears down the Babylon scene
 */
function createHarness(): Harness {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const meshCache = new MeshCache();
    const styles = Styles.default();
    const eventManager = new EventManager();
    const statsManager = new StatsManager(eventManager);
    const dataManager = new DataManager(eventManager, styles);
    const layoutManager = new LayoutManager(eventManager, dataManager, styles);

    const context = new DefaultGraphContext(
        () => styles,
        dataManager,
        layoutManager,
        meshCache,
        scene,
        statsManager,
        {},
    );

    // Through the data manager, so every node has a row in the graph a static layout reads.
    dataManager.setGraphContext(context);

    return {
        context,
        dataManager,
        layoutManager,
        scene,
        add(id: string): Node {
            dataManager.addNodes([{ id }]);
            const node = dataManager.nodes.get(id);
            assert.isDefined(node, `${id} is a node of the graph`);
            return node;
        },
        coordsOf(node: Node): { x: number; y: number; z: number } {
            const out = { x: 0, y: 0, z: 0 };
            dataManager.positions.read(node.index, out);
            return out;
        },
        dispose(): void {
            layoutManager.dispose();
            scene.dispose();
            engine.dispose();
        },
    };
}

describe("a pin outlives the engine that was told about it", () => {
    let harness: Harness | undefined;

    afterEach(() => {
        harness?.dispose();
        harness = undefined;
    });

    it("keeps the pin, and the pinned node's place, across a setLayout", async () => {
        // The inverse of what the element used to do. A reader who has placed nodes and then
        // changes arrangement expects to keep what they placed; before this, all of it was thrown
        // away with the old engine, and the reader was given no notice that it had happened.
        harness = createHarness();
        const pinned = harness.add("a");
        harness.add("b");
        harness.add("c");
        harness.add("d");

        await layoutManagerInternals.setLayout(harness.layoutManager, "circular", {});
        const held = harness.coordsOf(pinned);
        const movedBefore = harness.coordsOf(harness.dataManager.nodes.get("c") as Node);
        pinned.pin();

        await layoutManagerInternals.setLayout(harness.layoutManager, "spiral", {});

        assert.isTrue(pinned.isPinned(), "the pin survived the engine that was told about it");
        assert.deepStrictEqual(harness.coordsOf(pinned), held, "and so did the coordinates it was holding");
        assert.notDeepEqual(
            harness.coordsOf(harness.dataManager.nodes.get("c") as Node),
            movedBefore,
            "while an unpinned node was rearranged, so standing still means something",
        );
    });

    it("keeps the pin across a 2D/3D view-mode switch", async () => {
        // The rebuild a reader triggers most often, and the one no register row names. It goes
        // through the same funnel as setLayout, which is why one replay covers all three.
        harness = createHarness();
        const pinned = harness.add("a");
        harness.add("b");
        harness.add("c");

        const circular = { id: "circular", engine: "circular", options: {}, dimension: "3d" } as const;
        await layoutManagerInternals.apply(harness.layoutManager, circular, { restoring: false });
        const held = harness.coordsOf(pinned);
        pinned.pin();

        await layoutManagerInternals.apply(
            harness.layoutManager,
            { ...circular, dimension: "2d" },
            { restoring: false },
        );

        assert.isTrue(pinned.isPinned(), "switching to 2D did not release the reader's pins");
        // Held where the reader put it, on the plane a 2D engine draws: a Z carried into 2D is
        // hidden by the camera but not by the node's edges, which then run past it.
        assert.deepStrictEqual(harness.coordsOf(pinned), { ...held, z: 0 });
    });

    it("keeps the pin when the layout slice names a new layout", async () => {
        harness = createHarness();
        const pinned = harness.add("a");
        harness.add("b");
        harness.add("c");

        await layoutManagerInternals.apply(
            harness.layoutManager,
            { id: "circular", engine: "circular", options: {}, dimension: "3d" },
            { restoring: false },
        );
        const held = harness.coordsOf(pinned);
        pinned.pin();

        await layoutManagerInternals.apply(
            harness.layoutManager,
            { id: "spiral", engine: "spiral", options: {}, dimension: "3d" },
            { restoring: false },
        );

        assert.isTrue(pinned.isPinned(), "the layout hook's new engine did not release the reader's pins");
        assert.deepStrictEqual(harness.coordsOf(pinned), held);
    });

    it("hands a fresh live simulation the pinned node's place, not its own idea of where that node is", async () => {
        // The replay is two steps, and both are load-bearing. It PLACES the node in the new engine
        // and only then tells that engine to hold it, because d3 fixes a node at its CURRENT
        // simulated position -- a bare pin replayed into a fresh simulation would nail the node to
        // whatever coordinates d3's own initialisation invented.
        //
        // The element's array alone will not catch a missing replay, because it refuses a layout
        // write onto a pinned row either way. What a reader SEES is the edges: d3 answers
        // `getEdgePosition` from its own node objects, so a simulation that was never told where
        // the pinned node is draws every line to it ending somewhere the node is not.
        harness = createHarness();
        const pinned = harness.add("a");
        const other = harness.add("b");
        harness.add("c");
        const link = {
            id: "a-b",
            index: INVALID_INDEX,
            srcId: pinned.id,
            dstId: other.id,
            srcNode: pinned,
            dstNode: other,
        };
        dataManagerInternals.adoptEdge(harness.dataManager, link as unknown as Edge);

        await layoutManagerInternals.setLayout(harness.layoutManager, "circular", {});
        const held = harness.coordsOf(pinned);
        pinned.pin();

        await layoutManagerInternals.setLayout(harness.layoutManager, "d3", {});
        for (let step = 0; step < 20; step++) {
            harness.layoutManager.step();
        }

        const after = harness.coordsOf(pinned);
        assert.closeTo(after.x, held.x, 1e-3, "the node is where the reader left it, not where d3 started it");
        assert.closeTo(after.y, held.y, 1e-3);
        assert.closeTo(after.z, held.z, 1e-3);

        const drawn = harness.layoutManager.layoutEngine?.getEdgePosition(link as unknown as Edge);
        assert.isDefined(drawn);
        assert.closeTo(drawn.src.x, held.x, 1e-3, "and the line to it ends where the node is drawn");
        assert.closeTo(drawn.src.y, held.y, 1e-3);
        assert.closeTo(drawn.src.z ?? 0, held.z, 1e-3);
    });

    it("releases a node pinned under one layout without throwing after the layout has changed", async () => {
        // This threw. `unpin()` forwarded to whichever engine was current, and ngraph refuses a
        // node it has never been told about -- so the only way to release a pin was to not change
        // layout first, which is exactly what a reader cannot promise.
        harness = createHarness();
        const pinned = harness.add("a");
        harness.add("b");

        await layoutManagerInternals.setLayout(harness.layoutManager, "ngraph", {});
        pinned.pin();
        await layoutManagerInternals.setLayout(harness.layoutManager, "circular", {});

        assert.doesNotThrow(() => {
            pinned.unpin();
        });
        assert.isFalse(pinned.isPinned(), "and the release took effect");
    });

    it("holds a pinned node still while a static layout rearranges everything else", async () => {
        // The half of this that has NEVER worked. `SimpleLayoutEngine.pin` is a no-op -- there is
        // nothing in a static layout for a pin to live in -- so under any of the fourteen static
        // arrangements a pinned node was recomputed back into the ring like any other. The refusal
        // now lives in the shared position array, which every engine writes through.
        harness = createHarness();
        const pinned = harness.add("a");
        const free = harness.add("b");
        harness.add("c");

        await layoutManagerInternals.setLayout(harness.layoutManager, "circular", {});
        const heldBefore = harness.coordsOf(pinned);
        const freeBefore = harness.coordsOf(free);
        pinned.pin();

        // A larger ring moves every node free to move, so standing still means something.
        await layoutManagerInternals.setLayout(harness.layoutManager, "circular", { scale: 2 });

        assert.deepStrictEqual(harness.coordsOf(pinned), heldBefore, "the pinned node did not move");
        assert.notDeepEqual(harness.coordsOf(free), freeBefore, "while an unpinned one did");
    });

    it("still lets the reader drag a node they have pinned", async () => {
        // Without the placement/layout distinction the guard above would make a pin mean
        // "undraggable", which is the opposite of what a reader means by pinning something.
        harness = createHarness();
        const pinned = harness.add("a");
        harness.add("b");
        harness.add("c");

        await layoutManagerInternals.setLayout(harness.layoutManager, "circular", {});
        pinned.pin();

        const engine = harness.layoutManager.layoutEngine;
        assert.isDefined(engine);
        layoutEngineInternals.setNodePosition(engine, pinned, { x: 12, y: -34, z: 5 });

        const after = harness.coordsOf(pinned);
        assert.closeTo(after.x, 12, 1e-3, "a drag is a deliberate placement and lands on a pinned row");
        assert.closeTo(after.y, -34, 1e-3);
        assert.closeTo(after.z, 5, 1e-3);

        // And it stays there: the next recompute must not undo the drag either.
        const arrival = harness.add("d");
        await harness.layoutManager.updatePositions([arrival]);

        assert.deepStrictEqual(harness.coordsOf(pinned), after, "the layout did not take the placement back");
    });

    it("refuses to pin a node the graph builder never took, rather than pretending it worked", async () => {
        // Such a node carries INVALID_INDEX for its whole life and has no row to record a pin in.
        // Reporting it pinned would fix a node that does not exist, with nothing able to release
        // it.
        harness = createHarness();
        harness.add("a");
        await layoutManagerInternals.setLayout(harness.layoutManager, "circular", {});

        const orphan = new Node(harness.context, "orphan", NODE_PAINT, { id: "orphan" } as unknown as AdHocData, {
            pinOnDrag: true,
        });

        orphan.pin();
        assert.isFalse(orphan.isPinned(), "a node with no row in the graph cannot be pinned");
    });
});

describe("a static layout after the graph grows", () => {
    let harness: Harness | undefined;

    afterEach(() => {
        harness?.dispose();
        harness = undefined;
    });

    it("keeps every existing node where it was and places only the one added", async () => {
        // graph-format design 14.4: after a reader adds to a finished graph, a static layout
        // re-runs with the existing nodes held, so the picture they have been reading does not
        // re-seat itself under them. Without the hold, a fourth node on a circle moves all three.
        harness = createHarness();
        const existing = [harness.add("a"), harness.add("b"), harness.add("c")];
        await layoutManagerInternals.setLayout(harness.layoutManager, "circular", {});
        const before = existing.map((node) => harness?.coordsOf(node));

        const arrival = harness.add("d");
        await harness.layoutManager.updatePositions([arrival]);

        assert.deepStrictEqual(
            existing.map((node) => harness?.coordsOf(node)),
            before,
            "no existing node moved",
        );
        assert.isTrue(harness.dataManager.positions.isPlaced(arrival.index), "and the new node was placed");
    });

    it("re-arranges the whole graph when the same freeze also joins two existing nodes", async () => {
        // An edge between nodes that were already drawn changes what the picture should be, so
        // this is not an add to a finished graph and nothing is held.
        harness = createHarness();
        harness.add("a");
        const free = harness.add("b");
        harness.add("c");
        await layoutManagerInternals.setLayout(harness.layoutManager, "circular", {});
        const before = harness.coordsOf(free);

        const arrival = harness.add("d");
        harness.dataManager.addEdges([{ source: "b", target: "c" }]);
        await harness.layoutManager.updatePositions([arrival]);

        assert.notDeepEqual(harness.coordsOf(free), before, "the ring was re-seated for four nodes");
    });
});

describe("a pin survives the freeze that renumbers every node", () => {
    it("moves to the row its node moved to, still holding the same coordinates", () => {
        // A compacting freeze hands out entirely new node indices, and the element walks every
        // render object onto them. A pin that stayed on the old row number would hold whichever
        // node inherited that row -- a node the reader never touched, fixed in place with nothing
        // on screen saying why. This is the whole reason the pin lives beside the coordinates
        // rather than in an engine or a Set of ids.
        //
        // The nodes here are stand-ins on a real DataManager. A real `Node` builds a Babylon mesh
        // in its constructor, and the removal-and-refreeze path this exercises has nothing to do
        // with a mesh -- it is the store, the remap and the position array.
        const eventManager = new EventManager();
        const dm = new DataManager(eventManager, Styles.default());
        dm.setGraphContext({} as unknown as GraphContext);
        dm.addEdges([
            { source: "a", target: "b" },
            { source: "b", target: "c" },
        ]);
        dm.getSnapshot();

        const stubs = ["a", "b", "c"].map((id, index) => {
            const stub = { id, index, dispose: () => undefined } as unknown as Node;
            dataManagerInternals.adoptNode(dm, stub);
            dm.nodeCache.set(id, stub);
            return stub;
        });
        const [a, , c] = stubs;

        dm[WRITABLE_LANE].grow(3);
        dm[WRITABLE_LANE].write(c.index, 11, 22, 33);
        assert.isTrue(dm[WRITABLE_LANE].setPinned(c.index, true), "c is pinned at row 2");

        // Removing a re-numbers everything above it, which is the whole point of the case.
        dm.removeNodeAndIncidentEdges(a.id);
        dm.getSnapshot();

        assert.strictEqual(a.index, INVALID_INDEX, "the removed node lost its row");
        assert.strictEqual(c.index, 1, "and c was slid down into a new one");
        assert.isTrue(dm.positions.isPinned(c.index), "the pin came with it");
        assert.strictEqual(dm.positions.pinnedCount, 1, "and did not multiply on the way");

        const out = { x: 0, y: 0, z: 0 };
        dm.positions.read(c.index, out);
        assert.deepStrictEqual(out, { x: 11, y: 22, z: 33 }, "holding the coordinates it was pinning");
    });
});

describe("the fixed layout puts nodes where their data says", () => {
    let harness: Harness | undefined;

    afterEach(() => {
        harness?.dispose();
        harness = undefined;
    });

    it("returns every node to its data position after another layout has moved it, and keeps a later drag", async () => {
        // A switch to "fixed" used to keep whatever the previous layout had written into the
        // position array, so a graph that started under the default force layout never reached its
        // data positions.
        harness = createHarness();
        harness.context.getStyles().config.data.knownFields.positionScale = 2;
        harness.dataManager.addNodes([
            { id: "a", position: { x: 0, y: 2, z: 0 } },
            { id: "b", position: { x: -2, y: 0, z: 0 } },
            { id: "c", position: [2, 0] },
        ]);
        const node = (id: string): Node => harness?.dataManager.nodes.get(id) as Node;

        await layoutManagerInternals.setLayout(harness.layoutManager, "circular", { scale: 7 });
        assert.notDeepEqual(harness.coordsOf(node("a")), { x: 0, y: 4, z: 0 }, "the circular layout moved a");

        await layoutManagerInternals.setLayout(harness.layoutManager, "fixed", {});
        assert.deepStrictEqual(harness.coordsOf(node("a")), { x: 0, y: 4, z: 0 });
        assert.deepStrictEqual(harness.coordsOf(node("b")), { x: -4, y: 0, z: 0 });
        assert.deepStrictEqual(harness.coordsOf(node("c")), { x: 4, y: 0, z: 0 });

        layoutEngineInternals.setNodePosition(harness.layoutManager.layoutEngine as LayoutEngine, node("a"), {
            x: 12,
            y: -34,
            z: 5,
        });
        const arrival = harness.add("d");
        await harness.layoutManager.updatePositions([arrival]);
        assert.deepStrictEqual(harness.coordsOf(node("a")), { x: 12, y: -34, z: 5 }, "the drag survived a recompute");
    });
});
