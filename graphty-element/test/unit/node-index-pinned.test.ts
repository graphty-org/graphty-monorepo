/**
 * Task M6-T5: Node.index, Node.pinned and Edge.index (graph-format design 14.4 rule 5;
 * WebGPU design 9.4 item 4).
 *
 * `Node.index` and `Edge.index` are the element's handles into the current GraphSnapshot, and
 * `Node.pinned` is the element-owned pin flag that a simulation's fixed mask is rebuilt from
 * after a load or a reload. `Node.isPinned()` used to hard-return `false`, so nothing in the
 * element could report a pin; this file pins the fields, their defaults and the pin round trip.
 *
 * The harness is the one `test/node-shape-edge-reattach.test.ts` already uses in this same
 * `default` project: a real `NullEngine` scene and the managers `Node` and `Edge` call into, so
 * the FIELD INITIALISERS actually run. A bare `Object.create(Node.prototype)` would prove only
 * that `isPinned()` reads a property, and would pass against an implementation that never
 * declared `index` at all.
 */
import { NullEngine, type Scene as BabylonScene, Scene } from "@babylonjs/core";
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
import { StyleManager } from "../../src/managers/StyleManager";
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

/** One forwarded pin/unpin: which node, and what its element-owned flag read AT THE CALL. */
interface PinCall {
    node: Node | undefined;
    pinnedAtCall: boolean;
}

/**
 * A layout engine that never moves anything, and that RECORDS the pins forwarded to it.
 *
 * `SimpleLayoutEngine.pin` / `.unpin` are no-ops today (LayoutEngine.ts), so an engine-only
 * assertion would prove nothing -- but the forwarding still has to happen, because
 * `NGraphLayoutEngine.pin` is what actually fixes a body in the live simulation. Recording the
 * flag's value at the moment of the call also pins the ORDER: `Node.pin()` sets its own field
 * BEFORE telling the engine, so an engine that reads `node.pinned` back sees the pin.
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
        this.pinCalls.push({ node: n, pinnedAtCall: n?.pinned === true });
    }

    /**
     * Record a forwarded unpin.
     * @param n - the node `Node.unpin()` forwarded
     */
    override unpin(n?: Node): void {
        this.unpinCalls.push({ node: n, pinnedAtCall: n?.pinned === true });
    }
}

interface Harness {
    context: GraphContext;
    dataManager: DataManager;
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
    const styleManager = new StyleManager(eventManager, styles);
    const dataManager = new DataManager(eventManager, styles);
    const layoutManager = new LayoutManager(eventManager, dataManager, styles);
    const layoutEngine = new FixedTestLayout();
    layoutManager.layoutEngine = layoutEngine;

    const context = new DefaultGraphContext(
        styleManager,
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
 * @returns The created node
 */
function addNode(harness: Harness, id: string): Node {
    const node = new Node(harness.context, id, Styles.getNodeIdForStyle(NODE_STYLE), { id } as unknown as AdHocData);
    harness.dataManager.nodes.set(id, node);
    harness.dataManager.nodeCache.set(id, node);
    harness.layoutEngine.addNode(node);
    return node;
}

describe("Node.index, Node.pinned and Edge.index", () => {
    let harness: Harness | undefined;

    afterEach(() => {
        harness?.dispose();
        harness = undefined;
    });

    it("gives a fresh Node an INVALID_INDEX index and an unpinned pinned flag", () => {
        harness = createHarness();
        const node = addNode(harness, "src");

        assert.strictEqual(node.index, INVALID_INDEX, "index is INVALID_INDEX until the node reaches the builder");
        assert.strictEqual(node.pinned, false, "a node is not pinned until the user pins it");
        assert.strictEqual(node.isPinned(), false);
    });

    it("reports the pin through isPinned() rather than a hard-coded false", () => {
        harness = createHarness();
        const node = addNode(harness, "src");

        node.pin();
        assert.strictEqual(node.pinned, true, "pin() sets the element-owned flag");
        assert.strictEqual(node.isPinned(), true, "isPinned() reads the field, not a stub");

        node.unpin();
        assert.strictEqual(node.pinned, false, "unpin() clears the element-owned flag");
        assert.strictEqual(node.isPinned(), false);
    });

    it("still FORWARDS the pin to the layout engine, with the element flag already set", () => {
        // NGraphLayoutEngine.pin is what actually fixes a body in the live simulation, so dropping
        // the forward would break interactive pinning while every flag assertion above stayed green.
        harness = createHarness();
        const node = addNode(harness, "src");
        const { layoutEngine } = harness;

        node.pin();
        assert.strictEqual(layoutEngine.pinCalls.length, 1, "pin() reached the engine exactly once");
        assert.strictEqual(layoutEngine.pinCalls[0]?.node, node, "and it was told WHICH node");
        assert.strictEqual(
            layoutEngine.pinCalls[0]?.pinnedAtCall,
            true,
            "the element-owned flag is set BEFORE the engine is told, so an engine may read it back",
        );

        node.unpin();
        assert.strictEqual(layoutEngine.unpinCalls.length, 1, "unpin() reached the engine exactly once");
        assert.strictEqual(layoutEngine.unpinCalls[0]?.node, node);
        assert.strictEqual(layoutEngine.unpinCalls[0]?.pinnedAtCall, false, "and the flag was cleared first");
    });

    it("keeps the pin across a setLayout that constructs a WHOLE NEW engine", () => {
        // This is the reason the flag lives on the Node at all: LayoutManager builds a fresh engine
        // on every setLayout, so any pin state the old engine held dies with it, and E1's
        // applyPins() has nothing left to rebuild the simulation's fixed mask from.
        harness = createHarness();
        const node = addNode(harness, "src");
        node.pin();

        const replacement = new FixedTestLayout();
        replacement.addNode(node);
        harness.context.getLayoutManager().layoutEngine = replacement;

        assert.strictEqual(replacement.pinCalls.length, 0, "nothing replayed the old pin into the new engine");
        assert.strictEqual(node.isPinned(), true, "but the element still knows the node is pinned");

        // And the element now talks to the CURRENT engine, not the discarded one.
        node.unpin();
        assert.strictEqual(replacement.unpinCalls.length, 1, "the unpin went to the engine that is live now");
        assert.strictEqual(harness.layoutEngine.unpinCalls.length, 0, "not to the one setLayout threw away");
        assert.strictEqual(node.isPinned(), false);
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
