/**
 * `Node.index` and `Edge.index` (graph-format design 14.4 rule 5), and the pin lifecycle they
 * shipped alongside.
 *
 * The two indices are the element's handles into the current GraphSnapshot. Pinning is the
 * neighbouring behaviour: a pin is held by whichever layout engine is current, and this file pins
 * both the round trip and the two ways a pin must NOT be acquired or kept -- a plain click never
 * pins, and a layout change does not carry a pin into the engine that replaces it.
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

import type { AdHocData, EdgeStyleConfig, NodeStyleConfig } from "../../src/config";
import { Edge } from "../../src/Edge";
import { SimpleLayoutEngine } from "../../src/layout/LayoutEngine";
import { DataManager } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import { DefaultGraphContext, type GraphContext } from "../../src/managers/GraphContext";
import { LayoutManager } from "../../src/managers/LayoutManager";
import { StatsManager } from "../../src/managers/StatsManager";
import { MeshCache } from "../../src/meshes/MeshCache";
import { Node } from "../../src/Node";
import { Styles } from "../../src/Styles";

const NODE_STYLE: NodeStyleConfig = {
    shape: { type: "icosphere", size: 1 },
    texture: { color: "#6366F1" },
    enabled: true,
};

const EDGE_STYLE: EdgeStyleConfig = {
    enabled: true,
    line: { type: "solid", color: "#AAAAAA", width: 0.5 },
};

/** One forwarded pin/unpin: which node, and what `isPinned()` answered AT THE CALL. */
interface PinCall {
    node: Node | undefined;
    pinnedAtCall: boolean;
}

/**
 * A layout engine that never moves anything, and that RECORDS the pins forwarded to it.
 *
 * `SimpleLayoutEngine.pin` / `.unpin` are no-ops today (LayoutEngine.ts), so an engine-only
 * assertion would prove nothing -- but the forwarding still has to happen, because
 * `NGraphLayoutEngine.pin` is what actually fixes a body in the live simulation. Recording what
 * `isPinned()` answered at the moment of the call also pins the ORDER: `Node.pin()` records the
 * engine BEFORE telling it, so an engine that asks the node back sees the pin.
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
 * @param pinOnDrag - The node's pinOnDrag behaviour option, as a style template would set it
 * @returns The created node
 */
function addNode(harness: Harness, id: string, pinOnDrag = true): Node {
    const node = new Node(harness.context, id, Styles.getNodeIdForStyle(NODE_STYLE), { id } as unknown as AdHocData, {
        pinOnDrag,
    });
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

describe("Node.index, Edge.index and the pin lifecycle", () => {
    let harness: Harness | undefined;

    afterEach(() => {
        harness?.dispose();
        harness = undefined;
    });

    it("gives a fresh Node an INVALID_INDEX index and leaves it unpinned", () => {
        harness = createHarness();
        const node = addNode(harness, "src");

        assert.strictEqual(node.index, INVALID_INDEX, "index is INVALID_INDEX until the node reaches the builder");
        assert.strictEqual(node.isPinned(), false, "a node is not pinned until the user pins it");
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

    it("releases the pin when setLayout replaces the engine that held it", () => {
        // LayoutManager builds a fresh engine on every setLayout and re-adds the nodes to it, so
        // the pins the old engine held die with it. Reporting a pin the live simulation does not
        // have would leave a node fixed with nothing able to release it, because a pin acquired
        // under one layout could never be handed to the next.
        harness = createHarness();
        const node = addNode(harness, "src");
        node.pin();

        const replacement = new FixedTestLayout();
        replacement.addNode(node);
        harness.layoutManager.layoutEngine = replacement;

        assert.strictEqual(replacement.pinCalls.length, 0, "nothing replayed the old pin into the new engine");
        assert.strictEqual(node.isPinned(), false, "so the node is not pinned under the new layout either");

        // And the element now talks to the CURRENT engine, not the discarded one.
        node.pin();
        assert.strictEqual(replacement.pinCalls.length, 1, "a fresh pin goes to the engine that is live now");
        assert.strictEqual(harness.layoutEngine.pinCalls.length, 1, "not to the one setLayout threw away");
        assert.strictEqual(node.isPinned(), true);
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

    it("gives a fresh Edge an INVALID_INDEX index and keeps the src:dst id (DEP-M6-B)", () => {
        harness = createHarness();
        addNode(harness, "src");
        addNode(harness, "dst");

        const edge = new Edge(
            harness.context,
            "src",
            "dst",
            Styles.getEdgeIdForStyle(EDGE_STYLE),
            {} as unknown as AdHocData,
        );

        assert.strictEqual(edge.index, INVALID_INDEX, "index is INVALID_INDEX until the edge reaches the builder");
        assert.strictEqual(edge.id, "src:dst", "Edge.id stays the pair string; index is additive");
    });
});
