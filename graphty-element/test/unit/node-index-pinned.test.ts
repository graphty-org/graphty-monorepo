/**
 * `Node.index` (graph-format design 14.4 rule 5), and the pin lifecycle it shipped alongside.
 *
 * The index is the element's handle into the current GraphSnapshot. Pinning is the neighbouring
 * behaviour, and it is INDEXED BY THE SAME NUMBER: a pin is one byte beside the node's
 * coordinates in the element's own position array, so a node with no row in the graph has nowhere
 * to record one. This file pins the round trip, the ordering the live simulations depend on, and
 * the one way a pin must NOT be acquired -- a plain click never pins.
 *
 * Edge identity moved out to `test/unit/edge-identity.test.ts` when `Edge.id` stopped being the
 * endpoint pair and became the element's own counter: it is a different subject, and the two were
 * only ever in one file because `index` landed for both at the same time.
 *
 * What a pin does to an arrangement, and how it survives a layout change, is
 * `test/layout/pin-state.test.ts`, which drives real engines through the real manager.
 *
 * The harness is the one `test/node-shape-edge-reattach.test.ts` already uses in this same
 * `default` project: a real `NullEngine` scene and the managers `Node` and `Edge` call into, so
 * the FIELD INITIALISERS actually run. A bare `Object.create(Node.prototype)` would prove only
 * that `isPinned()` reads a property, and would pass against an implementation that never
 * declared `index` at all.
 */
import { NullEngine, type Scene as BabylonScene, Scene, Vector3 } from "@babylonjs/core";
import { INVALID_INDEX } from "@graphty/graph-format";
import { afterEach, assert, describe, it } from "vitest";

import type { AdHocData, NodeStyleConfig } from "../../src/config";
import { SimpleLayoutEngine } from "../../src/layout/LayoutEngine";
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
    enabled: true,
};

/**
 * The paint every node here is drawn from.
 *
 * A Node is handed its paint rather than an id to look a style up by, because the session's paint
 * is addressed by the dense index the store assigns AFTER construction -- which is the very
 * index this file is about. One style, so one key.
 */
const NODE_PAINT: NodePaint = { meshKey: "test-node", style: NODE_STYLE, color: null };

/** One forwarded pin/unpin: which node, and what `isPinned()` answered AT THE CALL. */
interface PinCall {
    node: Node | undefined;
    pinnedAtCall: boolean;
}

/**
 * A layout engine that never moves anything, and that RECORDS the pins forwarded to it.
 *
 * `SimpleLayoutEngine.pin` / `.unpin` hold nothing -- the element's position array does -- so an
 * engine-only assertion would prove nothing. But the forwarding still has to happen, because
 * `NGraphLayoutEngine.pin` and `D3GraphLayoutEngine.pin` are what stop a live simulation spending
 * force on a body that cannot move. Recording what `isPinned()` answered at the moment of the call
 * also pins the ORDER: `Node.pin()` records the pin BEFORE telling the engine, so an engine that
 * asks the node back sees it.
 */
class FixedTestLayout extends SimpleLayoutEngine {
    static override type = "fixed-test-pin";

    override positions: Record<string | number, number[]> = {
        src: [0, 0, 0],
        dst: [5, 0, 0],
    };

    /** Every pin forwarded to this engine, in order. */
    readonly pinCalls: PinCall[] = [];
    /** Every unpin forwarded to this engine, in order. */
    readonly unpinCalls: PinCall[] = [];

    /**
     * Mark the (already final) positions as fresh.
     */
    doLayout(): void {
        this.stale = false;
    }

    /**
     * Record a forwarded pin. The parameter is optional only because the concrete base declares
     * `pin(): void`; `Node.pin()` always passes the node.
     * @param n - the node `Node.pin()` forwarded
     */
    override pin(n?: Node): void {
        this.pinCalls.push({ node: n, pinnedAtCall: n?.isPinned() === true });
    }

    /**
     * Record a forwarded unpin.
     * @param n - the node `Node.unpin()` forwarded
     */
    override unpin(n?: Node): void {
        this.unpinCalls.push({ node: n, pinnedAtCall: n?.isPinned() === true });
    }
}

interface Harness {
    context: GraphContext;
    dataManager: DataManager;
    layoutManager: LayoutManager;
    layoutEngine: FixedTestLayout;
    scene: BabylonScene;
    /** How many rows the position array has handed out, which is the next node's index. */
    rows: number;
    dispose(): void;
}

/**
 * Build a minimal but REAL graph context against a NullEngine scene.
 * @returns A harness whose dispose() tears down the Babylon scene
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
    const layoutEngine = new FixedTestLayout();
    layoutManager.layoutEngine = layoutEngine;

    const context = new DefaultGraphContext(
        () => styles,
        dataManager,
        layoutManager,
        meshCache,
        scene,
        statsManager,
        {},
    );

    return {
        context,
        dataManager,
        layoutManager,
        layoutEngine,
        scene,
        rows: 0,
        dispose(): void {
            scene.dispose();
            engine.dispose();
        },
    };
}

/**
 * Create a node and register it where a real load would.
 * @param harness - The test harness
 * @param id - The node id
 * @param pinOnDrag - The node's pinOnDrag behaviour option, as the configuration document sets it
 * @returns The created node
 */
function addNode(harness: Harness, id: string, pinOnDrag = true): Node {
    const node = new Node(harness.context, id, NODE_PAINT, { id } as unknown as AdHocData, {
        pinOnDrag,
    });
    // THE ROW IS THE POINT. A pin lives in the position array at the node's index, so a node that
    // never reached the graph builder has nowhere to record one -- which is a real state, asserted
    // separately below, and not the state a pin test should be run in.
    node.index = harness.rows;
    harness.rows += 1;
    harness.dataManager.positions.grow(harness.rows);
    harness.dataManager.nodes.set(id, node);
    harness.dataManager.nodeCache.set(id, node);
    harness.layoutEngine.addNode(node);
    return node;
}

/**
 * Drag a node and drop it, through the same two public entry points the pointer observer and the
 * XR input handler call.
 * @param node - the node to drag
 */
function dragAndDrop(node: Node): void {
    assert.isDefined(node.dragHandler, "the Node constructor installs the drag handler");
    node.dragHandler.onDragStart(new Vector3(0, 0, 0));
    node.dragHandler.onDragEnd();
}

describe("Node.index and the pin lifecycle", () => {
    let harness: Harness | undefined;

    afterEach(() => {
        harness?.dispose();
        harness = undefined;
    });

    it("gives a fresh Node an INVALID_INDEX index, and refuses to pin one that has no row", () => {
        harness = createHarness();
        const node = new Node(harness.context, "src", NODE_PAINT, { id: "src" } as unknown as AdHocData, {
            pinOnDrag: true,
        });

        assert.strictEqual(node.index, INVALID_INDEX, "index is INVALID_INDEX until the node reaches the builder");
        assert.strictEqual(node.isPinned(), false, "a node is not pinned until the user pins it");

        // A pin is recorded at the node's row, so a node the graph builder never took has nowhere
        // to put one. Reporting the pin anyway would fix a node that does not exist in the graph,
        // with nothing able to release it.
        node.pin();
        assert.strictEqual(node.isPinned(), false, "and pinning one that has no row does not pretend to work");
        assert.strictEqual(harness.layoutEngine.pinCalls.length, 0, "nor is a layout engine told about it");
    });

    it("forwards the pin to the CURRENT layout engine and reports it through isPinned()", () => {
        // NGraphLayoutEngine.pin is what actually fixes a body in the live simulation, so dropping
        // the forward would break interactive pinning while every isPinned() assertion stayed green.
        harness = createHarness();
        const node = addNode(harness, "src");
        const { layoutEngine } = harness;

        node.pin();
        assert.strictEqual(node.isPinned(), true, "isPinned() reports the pin, it is not a stub");
        assert.strictEqual(layoutEngine.pinCalls.length, 1, "pin() reached the engine exactly once");
        assert.strictEqual(layoutEngine.pinCalls[0]?.node, node, "and it was told WHICH node");
        assert.strictEqual(
            layoutEngine.pinCalls[0]?.pinnedAtCall,
            true,
            "the node records the pin BEFORE the engine is told, so an engine may ask it back",
        );

        node.unpin();
        assert.strictEqual(node.isPinned(), false, "unpin() releases the node");
        assert.strictEqual(layoutEngine.unpinCalls.length, 1, "unpin() reached the engine exactly once");
        assert.strictEqual(layoutEngine.unpinCalls[0]?.node, node);
        assert.strictEqual(layoutEngine.unpinCalls[0]?.pinnedAtCall, false, "and the pin was released first");
    });

    it("KEEPS the pin when the engine that was told about it is replaced", () => {
        // The exact inverse of what this file used to assert. The pin used to be the engine's, so
        // every layout change, every 2D/3D switch and every style template silently released every
        // pin the reader had made -- and the reader was given no notice that it had happened. The
        // pin is the element's now, so replacing the engine underneath cannot touch it.
        harness = createHarness();
        const node = addNode(harness, "src");
        node.pin();

        const replacement = new FixedTestLayout();
        replacement.addNode(node);
        harness.layoutManager.layoutEngine = replacement;

        assert.strictEqual(node.isPinned(), true, "the pin belongs to the node's row, not to an engine");

        // And a release now reaches the CURRENT engine, not the discarded one. This is the path
        // that used to THROW: ngraph refuses a node it has never been told about, so a node pinned
        // under one layout could not be released after a layout change at all.
        node.unpin();
        assert.strictEqual(node.isPinned(), false);
        assert.strictEqual(replacement.unpinCalls.length, 1, "the release went to the engine that is live now");
        assert.strictEqual(harness.layoutEngine.unpinCalls.length, 0, "not to the one that was replaced");
    });

    it("does NOT pin on a plain click, even with pinOnDrag on", () => {
        // A reader clicking nodes to inspect them must not fix them in place: nothing in the
        // element releases a pin, so a click that pinned froze the layout one node per click.
        harness = createHarness();
        const node = addNode(harness, "src", true);

        assert.strictEqual(node.pinOnDrag, true, "the behaviour option under test is on");
        assert.isDefined(node.dragHandler);
        node.dragHandler.select();

        assert.strictEqual(node.isPinned(), false, "a click selects; it does not pin");
        assert.strictEqual(harness.layoutEngine.pinCalls.length, 0, "and nothing reached the layout engine");
    });

    it("pins at the end of a drag when pinOnDrag is on, and releases on unpin()", () => {
        harness = createHarness();
        const node = addNode(harness, "src", true);

        dragAndDrop(node);

        assert.strictEqual(node.isPinned(), true, "the user placed this node, so it stays placed");
        assert.strictEqual(harness.layoutEngine.pinCalls.length, 1, "the pin reached the layout engine");

        node.unpin();
        assert.strictEqual(node.isPinned(), false, "and there is a way back out");
        assert.strictEqual(harness.layoutEngine.unpinCalls.length, 1);
    });

    it("does not pin at the end of a drag when pinOnDrag is off", () => {
        harness = createHarness();
        const node = addNode(harness, "src", false);

        dragAndDrop(node);

        assert.strictEqual(node.isPinned(), false, "pinOnDrag off means a dropped node rejoins the layout");
        assert.strictEqual(harness.layoutEngine.pinCalls.length, 0);
    });
});
