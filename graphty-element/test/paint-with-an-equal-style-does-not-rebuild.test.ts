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
import { afterEach, assert, describe, it } from "vitest";

import type { AdHocData } from "../src/config";
import { Edge } from "../src/Edge";
import { SimpleLayoutEngine } from "../src/layout/LayoutEngine";
import { DataManager } from "../src/managers/DataManager";
import { EventManager } from "../src/managers/EventManager";
import { DefaultGraphContext, type GraphContext } from "../src/managers/GraphContext";
import { LayoutManager } from "../src/managers/LayoutManager";
import { StatsManager } from "../src/managers/StatsManager";
import { bootstrapEdgePaint, bootstrapNodePaint } from "../src/managers/StylePainter";
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
    layoutManager.layoutEngine = layoutEngine;
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
    const node = new Node(harness.context, id, bootstrapNodePaint(), { id } as unknown as AdHocData);
    harness.dataManager.nodes.set(id, node);
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
        const edge = new Edge(harness.context, "src", "dst", 0, bootstrapEdgePaint(), {} as unknown as AdHocData);
        harness.dataManager.edges.set(edge.id, edge);
        harness.layoutEngine.addEdge(edge);
        edge.update();
        const line = edge.mesh;
        const head = edge.arrowMesh;

        edge.applySessionPaint({
            meshKey: "s0|#a9a9a9|",
            style: cloneDeep(bootstrapEdgePaint().style),
        });

        assert.isTrue(edge.mesh === line, "the same line mesh");
        assert.isTrue(edge.arrowMesh === head, "the same arrow head");
        assert.strictEqual(keyOf(edge), "s0|#a9a9a9|", "while the session's key is adopted");
    });

    it("still rebuilds an edge whose style actually changed", () => {
        harness = createHarness();
        addNode(harness, "src");
        addNode(harness, "dst");
        const edge = new Edge(harness.context, "src", "dst", 0, bootstrapEdgePaint(), {} as unknown as AdHocData);
        harness.dataManager.edges.set(edge.id, edge);
        harness.layoutEngine.addEdge(edge);
        edge.update();
        const line = edge.mesh;
        const style = cloneDeep(bootstrapEdgePaint().style);
        style.line = { ...style.line, width: (style.line?.width ?? 1) * 3 };

        edge.applySessionPaint({ meshKey: "s1|#a9a9a9|", style });

        assert.isFalse(edge.mesh === line, "a different line mesh");
    });
});
