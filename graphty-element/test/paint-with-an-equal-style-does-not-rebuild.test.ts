/**
 * @file A paint whose style equals the one an element was built from adopts the key and rebuilds nothing.
 *
 * WHY THIS MATTERS AT LOAD. Every node and edge is constructed from the bootstrap paint, whose
 * mesh key is a sentinel no session key ever equals, and the first style pass then hands it the
 * session's key -- for the same style, whenever no layer touches the element, which is every
 * element of a plain load. Comparing keys alone disposed the placeholder mesh and built the same
 * one again, and Babylon's dispose is a linear search of the scene's mesh list, so a load grew as
 * the square of its size: 4,000 nodes took 28 s and 10,000 never finished (issue #388).
 */
import { NullEngine, Scene } from "@babylonjs/core";
import { cloneDeep } from "lodash";
import { afterEach, assert, describe, it, vi } from "vitest";

import { Edge } from "../src/Edge";
import { SimpleLayoutEngine } from "../src/layout/LayoutEngine";
import { DataManager, dataManagerInternals } from "../src/managers/DataManager";
import { EventManager } from "../src/managers/EventManager";
import { DefaultGraphContext, type GraphContext } from "../src/managers/GraphContext";
import { LayoutManager, layoutManagerInternals } from "../src/managers/LayoutManager";
import { StatsManager } from "../src/managers/StatsManager";
import { bootstrapEdgePaint, bootstrapNodePaint, type EdgePaint } from "../src/managers/StylePainter";
import { ArrowCap } from "../src/meshes/ArrowCapBatch";
import { EdgeLineBatch } from "../src/meshes/EdgeLineBatch";
import { MeshCache } from "../src/meshes/MeshCache";
import { Node } from "../src/Node";
import { Styles } from "../src/Styles";

class FixedTestLayout extends SimpleLayoutEngine {
    static override type = "fixed-test-equal-style";
    override scalingFactor = 1;
    override positions: Record<string | number, number[]> = { src: [0, 0, 0], dst: [5, 0, 0] };

    doLayout(): void {
        this.stale = false;
    }
}

interface Harness {
    context: GraphContext;
    dataManager: DataManager;
    layoutEngine: FixedTestLayout;
    scene: Scene;
    dispose(): void;
}

function createHarness(): Harness {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const styles = Styles.default();
    const eventManager = new EventManager();
    const statsManager = new StatsManager(eventManager);
    const dataManager = new DataManager(eventManager, styles);
    const layoutManager = new LayoutManager(eventManager, dataManager, styles);
    const layoutEngine = new FixedTestLayout();
    layoutManagerInternals.setEngine(layoutManager, layoutEngine);
    const context = new DefaultGraphContext(
        () => styles,
        dataManager,
        layoutManager,
        new MeshCache(),
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

/** The mesh key an element is currently drawn from; private to the element, read here as the fact under test. */
function keyOf(element: Node | Edge): string {
    return (element as unknown as { meshKey: string }).meshKey;
}

function addNode(harness: Harness, id: string): Node {
    const node = new Node(harness.context, id, bootstrapNodePaint(), { id });
    dataManagerInternals.adoptNode(harness.dataManager, node);
    harness.dataManager.nodeCache.set(id, node);
    harness.layoutEngine.addNode(node);
    node.update();

    return node;
}

describe("a paint with an equal style adopts the key and rebuilds nothing", () => {
    let harness: Harness | null = null;

    afterEach(() => {
        harness?.dispose();
        harness = null;
    });

    it("keeps a node's mesh across the bootstrap-to-session hand-over", () => {
        harness = createHarness();
        const node = addNode(harness, "src");
        const before = node.mesh;
        const bootstrap = bootstrapNodePaint();

        node.applySessionPaint({
            meshKey: "s0",
            style: cloneDeep(bootstrap.style),
            color: bootstrap.color === null ? null : { ...bootstrap.color },
        });

        // Identity through isTrue: a failed strictEqual would try to print two Babylon meshes.
        assert.isTrue(node.mesh === before, "the same mesh object, not a rebuilt one");
        assert.isFalse(before.isDisposed(), "and it was never disposed");
        assert.strictEqual(keyOf(node), "s0", "while the session's key is adopted");
    });

    it("still rebuilds a node whose style actually changed", () => {
        harness = createHarness();
        const node = addNode(harness, "src");
        const before = node.mesh;
        const style = cloneDeep(bootstrapNodePaint().style);
        style.shape = { ...style.shape, type: "box", size: style.shape?.size ?? 1 };

        node.applySessionPaint({ meshKey: "s1", style, color: bootstrapNodePaint().color });

        assert.isFalse(node.mesh === before, "a different mesh");
        assert.isTrue(before.isDisposed());
    });

    it("keeps an edge's line and caps across the bootstrap-to-session hand-over", () => {
        harness = createHarness();
        addNode(harness, "src");
        addNode(harness, "dst");
        const edge = new Edge(harness.context, "src", "dst", 0, bootstrapEdgePaint(), {});
        dataManagerInternals.adoptEdge(harness.dataManager, edge);
        harness.layoutEngine.addEdge(edge);
        edge.update();
        const line = edge.mesh;
        const head = edge.arrowCap;

        edge.applySessionPaint({
            meshKey: "s0|#a9a9a9|",
            style: cloneDeep(bootstrapEdgePaint().style),
        });

        assert.isTrue(edge.mesh === line, "the same line mesh");
        assert.isTrue(edge.arrowCap === head, "the same arrow head");
        assert.strictEqual(keyOf(edge), "s0|#a9a9a9|", "while the session's key is adopted");
    });

    it("still rebuilds an edge whose style actually changed", () => {
        harness = createHarness();
        addNode(harness, "src");
        addNode(harness, "dst");
        const edge = new Edge(harness.context, "src", "dst", 0, bootstrapEdgePaint(), {});
        dataManagerInternals.adoptEdge(harness.dataManager, edge);
        harness.layoutEngine.addEdge(edge);
        edge.update();
        const line = edge.mesh;
        const style = cloneDeep(bootstrapEdgePaint().style);
        style.line = { ...style.line, width: (style.line?.width ?? 1) * 3 };

        edge.applySessionPaint({ meshKey: "s1|#a9a9a9|", style });

        assert.isFalse(edge.mesh === line, "a different line mesh");
    });
});

/** The line batch and slots an edge draws from; private to the edge, read here as the fact under test. */
function lineOf(edge: Edge): { batch: EdgeLineBatch; slots: number[] } {
    const held = edge as unknown as { lineBatch: EdgeLineBatch | null; lineSlots: number[] };
    assert.isNotNull(held.lineBatch, "the edge draws a batched line");
    return { batch: held.lineBatch, slots: held.lineSlots };
}

/** Where an edge's line is drawn: every slot's two ends, flat. */
function endsOf(edge: Edge): number[] {
    const { batch, slots } = lineOf(edge);
    return slots.flatMap((slot) => batch.endsOf(slot).flatMap((end) => end.asArray()));
}

describe("a paint that changes only an edge's colour moves it without placing it again (#6026)", () => {
    let harness: Harness | null = null;

    afterEach(() => {
        harness?.dispose();
        harness = null;
        vi.restoreAllMocks();
    });

    /**
     * A placed directed edge, and the paint the Ghost row gives it: grey at low opacity.
     * @returns The edge and its two looks.
     */
    function ghostable(): { edge: Edge; normal: EdgePaint; ghost: EdgePaint } {
        harness = createHarness();
        addNode(harness, "src");
        addNode(harness, "dst");
        const normal = bootstrapEdgePaint();
        const edge = new Edge(harness.context, "src", "dst", 0, normal, {});
        dataManagerInternals.adoptEdge(harness.dataManager, edge);
        harness.layoutEngine.addEdge(edge);
        edge.update();
        const style = cloneDeep(normal.style);
        style.line = { ...style.line, color: "#9e9e9e", opacity: 0.15 };
        style.arrowHead = { ...style.arrowHead, opacity: 0.15 };

        return { edge, normal, ghost: { meshKey: "s0|#9e9e9e|0.15|>", style } };
    }

    it("copies the line and the head into the new look's batches, where they were drawn", () => {
        const { edge, ghost } = ghostable();
        const line = edge.mesh;
        const { batch } = lineOf(edge);
        const head = edge.arrowCap;
        const ends = endsOf(edge);
        const headAt = head?.position.asArray();
        assert.isNotNull(head, "a directed edge draws a head");

        edge.applySessionPaint(ghost);

        assert.isFalse(edge.mesh === line, "the line moved to another batch");
        assert.isTrue(batch.disposed, "and the batch it left, now empty, is gone");
        assert.deepStrictEqual(endsOf(edge), ends, "drawn between the same two points");
        assert.isFalse(edge.arrowCap === head, "the head moved to another batch");
        assert.isTrue(head?.isDisposed(), "and the old head is given up");
        assert.deepStrictEqual(edge.arrowCap?.position.asArray(), headAt, "drawn where the old one was");
        assert.strictEqual(edge.arrowCap?.visibility, 0.15, "at the new opacity");
    });

    it("places nothing on the next update, there and back", () => {
        const { edge, normal, ghost } = ghostable();
        const lines = vi.spyOn(EdgeLineBatch.prototype, "place");
        const runs = vi.spyOn(EdgeLineBatch.prototype, "placeRun");
        const caps = vi.spyOn(ArrowCap.prototype, "place");

        edge.applySessionPaint(ghost);
        edge.update();
        edge.applySessionPaint({ ...normal, meshKey: "s0|#a9a9a9||>" });
        edge.update();

        assert.strictEqual(lines.mock.calls.length + runs.mock.calls.length, 0, "no line was placed again");
        assert.strictEqual(caps.mock.calls.length, 0, "no cap was placed again");
    });

    it("keeps a hidden edge's parked placement, so showing it puts it back", () => {
        const { edge, ghost } = ghostable();
        const ends = endsOf(edge);
        const headAt = edge.arrowCap?.position.asArray();
        const before = lineOf(edge);
        for (const slot of before.slots) {
            before.batch.park(slot);
        }
        edge.arrowCap?.park();

        edge.applySessionPaint(ghost);

        const { batch, slots } = lineOf(edge);
        assert.isTrue(
            endsOf(edge).every((value) => value === 0),
            "still hidden after the move",
        );
        assert.isTrue(
            slots.every((slot) => batch.unpark(slot)),
            "and parked in the new batch",
        );
        assert.deepStrictEqual(endsOf(edge), ends, "shown where it was");
        assert.isTrue(edge.arrowCap?.unpark(), "the head too");
        assert.deepStrictEqual(edge.arrowCap?.position.asArray(), headAt);
    });

    it("still rebuilds an edge whose line changed more than its colour", () => {
        const { edge, ghost } = ghostable();
        const line = edge.mesh;
        const caps = vi.spyOn(ArrowCap.prototype, "place");
        ghost.style.line = { ...ghost.style.line, width: (ghost.style.line?.width ?? 1) * 3 };

        edge.applySessionPaint(ghost);
        edge.update();

        assert.isFalse(edge.mesh === line);
        assert.isAbove(caps.mock.calls.length, 0, "a rebuilt edge is placed again");
    });
});
