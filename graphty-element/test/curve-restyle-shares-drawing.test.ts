/**
 * @file A curve restyle on the "objects" path draws every curve of one look from shared drawing: restyling N
 * straight edges to curves creates no mesh and no material per edge (issue #10046). A curve is drawn from the line
 * batch a straight line of its look takes: a lone curve with no cap from ONE slot, which the vertex shader draws
 * piece by piece (`Edge.placeCurveRun`, `EdgeLineBatch.placeCurve`); a capped curve as a run of a slot a piece.
 */
import { NullEngine, Scene } from "@babylonjs/core";
import { cloneDeep } from "lodash";
import { afterEach, assert, describe, it } from "vitest";

import { Edge } from "../src/Edge";
import { SimpleLayoutEngine } from "../src/layout/LayoutEngine";
import { DataManager, dataManagerInternals } from "../src/managers/DataManager";
import { EventManager } from "../src/managers/EventManager";
import { DefaultGraphContext, type GraphContext } from "../src/managers/GraphContext";
import { LayoutManager, layoutManagerInternals } from "../src/managers/LayoutManager";
import { StatsManager } from "../src/managers/StatsManager";
import { bootstrapEdgePaint, bootstrapNodePaint } from "../src/managers/StylePainter";
import { MeshCache } from "../src/meshes/MeshCache";
import { Node } from "../src/Node";
import { Styles } from "../src/Styles";

class RingLayout extends SimpleLayoutEngine {
    static override type = "fixed-test-curve-restyle";
    override scalingFactor = 1;
    override positions: Record<string | number, number[]> = {};

    doLayout(): void {
        this.stale = false;
    }
}

interface Harness {
    context: GraphContext;
    dataManager: DataManager;
    layoutEngine: RingLayout;
    scene: Scene;
}

function createHarness(): Harness {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const styles = Styles.default();
    const eventManager = new EventManager();
    const dataManager = new DataManager(eventManager, styles);
    const layoutManager = new LayoutManager(eventManager, dataManager, styles);
    const layoutEngine = new RingLayout();
    layoutManagerInternals.setEngine(layoutManager, layoutEngine);
    const context = new DefaultGraphContext(
        () => styles,
        dataManager,
        layoutManager,
        new MeshCache(),
        scene,
        new StatsManager(eventManager),
        {},
    );

    return { context, dataManager, layoutEngine, scene };
}

/** N edges from a ring of nodes, each drawn by the bootstrap paint (straight). */
function ring(harness: Harness, n: number): Edge[] {
    const nodes: Node[] = [];
    for (let i = 0; i < n; i++) {
        const id = `n${i}`;
        harness.layoutEngine.positions[id] = [Math.cos(i) * 20, Math.sin(i) * 20, i % 3];
        const node = new Node(harness.context, id, bootstrapNodePaint(), { id });
        dataManagerInternals.adoptNode(harness.dataManager, node);
        harness.dataManager.nodeCache.set(id, node);
        harness.layoutEngine.addNode(node);
        node.update();
        nodes.push(node);
    }

    const edges: Edge[] = [];
    for (let i = 0; i < n; i++) {
        const edge = new Edge(harness.context, `n${i}`, `n${(i + 1) % n}`, i, bootstrapEdgePaint(), {});
        dataManagerInternals.adoptEdge(harness.dataManager, edge);
        harness.layoutEngine.addEdge(edge);
        edge.update();
        edges.push(edge);
    }

    return edges;
}

describe("a curve restyle on the objects path (#10046)", () => {
    let scene: Scene | null = null;

    afterEach(() => {
        scene?.getEngine().dispose();
        scene = null;
    });

    for (const arrowHead of ["none", "normal"] as const) {
        it(`creates no mesh and no material per edge, arrowHead ${arrowHead}`, () => {
            const harness = createHarness();
            ({ scene } = harness);
            const edges = ring(harness, 40);
            const style = cloneDeep(bootstrapEdgePaint().style);
            style.line = { ...style.line, bezier: true };
            style.arrowHead = { ...style.arrowHead, type: arrowHead };
            const meshes = scene.meshes.length;
            const materials = scene.materials.length;

            for (const edge of edges) {
                edge.applySessionPaint({ meshKey: `curve|${arrowHead}`, style });
                edge.update();
            }

            const madeMeshes = scene.meshes.length - meshes;
            const madeMaterials = scene.materials.length - materials;
            assert.isAtMost(madeMeshes, 0, "meshes made for the restyle");
            assert.isAtMost(madeMaterials, 0, "materials made for the restyle");
            // and the curves are drawn: each edge's drawn line bows through more than its two ends
            assert.isTrue(
                edges.every((e) => (e.drawnCurve?.length ?? 0) > 2),
                "every edge is drawn as a curve",
            );
            const runs = edges.map((e) => (e as unknown as { lineSlots: number[] }).lineSlots.length);
            if (arrowHead === "none") {
                // a lone curve costs one slot, not one a piece
                assert.deepEqual(new Set(runs), new Set([1]), "slots per curve");
            } else {
                // a capped curve is still a run of a slot a piece
                assert.isTrue(
                    runs.every((r) => r > 1),
                    "a capped curve is a run",
                );
            }
        });
    }
});
