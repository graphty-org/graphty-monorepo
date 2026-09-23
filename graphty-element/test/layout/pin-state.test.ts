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
import type { Edge } from "../../src/Edge";
import { DataManager } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import { DefaultGraphContext, type GraphContext } from "../../src/managers/GraphContext";
import { LayoutManager } from "../../src/managers/LayoutManager";
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

    let nextIndex = 0;

    return {
        context,
        dataManager,
        layoutManager,
        scene,
        add(id: string): Node {
            const node = new Node(context, id, NODE_PAINT, { id } as unknown as AdHocData, { pinOnDrag: true });
            node.index = nextIndex++;
            dataManager.positions.grow(nextIndex);
            dataManager.nodes.set(id, node);
            dataManager.nodeCache.set(id, node);
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

        await harness.layoutManager.setLayout("circular", {});
        const held = harness.coordsOf(pinned);
        const movedBefore = harness.coordsOf(harness.dataManager.nodes.get("c") as Node);
        pinned.pin();

        await harness.layoutManager.setLayout("spiral", {});

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

        await harness.layoutManager.setLayout("circular", {});
        const held = harness.coordsOf(pinned);
        pinned.pin();

        await harness.layoutManager.updateLayoutDimension(true);

        assert.isTrue(pinned.isPinned(), "switching to 2D did not release the reader's pins");
        assert.deepStrictEqual(harness.coordsOf(pinned), held);
    });

    it("keeps the pin when a style template brings its own layout", async () => {
        harness = createHarness();
        const pinned = harness.add("a");
        harness.add("b");
        harness.add("c");

        await harness.layoutManager.setLayout("circular", {});
        const held = harness.coordsOf(pinned);
        pinned.pin();

        await harness.layoutManager.applyTemplateLayout("spiral", {});

        assert.isTrue(pinned.isPinned(), "applying a template did not release the reader's pins");
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
        const link = { srcId: pinned.id, dstId: other.id, srcNode: pinned, dstNode: other };
        harness.dataManager.edges.set("a-b", link as unknown as Edge);

        await harness.layoutManager.setLayout("circular", {});
        const held = harness.coordsOf(pinned);
        pinned.pin();

        await harness.layoutManager.setLayout("d3", {});
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

        await harness.layoutManager.setLayout("ngraph", {});
        pinned.pin();
        await harness.layoutManager.setLayout("circular", {});

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

        await harness.layoutManager.setLayout("circular", {});
        const heldBefore = harness.coordsOf(pinned);
        const freeBefore = harness.coordsOf(free);
        pinned.pin();

        // A fourth node re-seats the whole ring, so every node free to move has somewhere new to
        // be and standing still means something.
        const arrival = harness.add("d");
        harness.layoutManager.layoutEngine?.addNode(arrival);
        await harness.layoutManager.updatePositions([arrival]);

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

        await harness.layoutManager.setLayout("circular", {});
        pinned.pin();

        harness.layoutManager.layoutEngine?.setNodePosition(pinned, { x: 12, y: -34, z: 5 });

        const after = harness.coordsOf(pinned);
        assert.closeTo(after.x, 12, 1e-3, "a drag is a deliberate placement and lands on a pinned row");
        assert.closeTo(after.y, -34, 1e-3);
        assert.closeTo(after.z, 5, 1e-3);

        // And it stays there: the next recompute must not undo the drag either.
        const arrival = harness.add("d");
        harness.layoutManager.layoutEngine?.addNode(arrival);
        await harness.layoutManager.updatePositions([arrival]);

        assert.deepStrictEqual(harness.coordsOf(pinned), after, "the layout did not take the placement back");
    });

    it("refuses to pin a node the graph builder never took, rather than pretending it worked", async () => {
        // Such a node carries INVALID_INDEX for its whole life and has no row to record a pin in.
        // Reporting it pinned would fix a node that does not exist, with nothing able to release
        // it.
        harness = createHarness();
        harness.add("a");
        await harness.layoutManager.setLayout("circular", {});

        const orphan = new Node(harness.context, "orphan", NODE_PAINT, { id: "orphan" } as unknown as AdHocData, {
            pinOnDrag: true,
        });

        orphan.pin();
        assert.isFalse(orphan.isPinned(), "a node with no row in the graph cannot be pinned");
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
            dm.nodes.set(id, stub);
            dm.nodeCache.set(id, stub);
            return stub;
        });
        const [a, , c] = stubs;

        dm.positions.grow(3);
        dm.positions.write(c.index, 11, 22, 33);
        assert.isTrue(dm.positions.setPinned(c.index, true), "c is pinned at row 2");

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
