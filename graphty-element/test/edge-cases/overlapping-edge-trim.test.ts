/**
 * An edge between two nodes that overlap (issue #7759): walking out to each node's wall crosses the
 * other's centre, and the line used to run from wall to far wall -- 1.9 units for default-size nodes
 * 0.1 apart with an arrow head. It must be no longer than the gap between the centres, and a pattern's
 * elements must stay between them.
 */

import { NullEngine, Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { Edge } from "../../src/Edge";
import { SimpleLayoutEngine } from "../../src/layout/LayoutEngine";
import { DataManager, dataManagerInternals } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import { DefaultGraphContext } from "../../src/managers/GraphContext";
import { LayoutManager, layoutManagerInternals } from "../../src/managers/LayoutManager";
import { StatsManager } from "../../src/managers/StatsManager";
import { bootstrapEdgePaint, bootstrapNodePaint } from "../../src/managers/StylePainter";
import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { TRIM_CLOSED, type TrimEnd, trimEnds } from "../../src/meshes/edgeTrim";
import { MeshCache } from "../../src/meshes/MeshCache";
import { Node } from "../../src/Node";
import { Styles } from "../../src/Styles";

const GAP = 0.1;

class TwoNodeLayout extends SimpleLayoutEngine {
    static override type = "fixed-test-overlapping-nodes";
    override scalingFactor = 1;
    constructor() {
        super();
        this.positions = { src: [0, 0, 0], dst: [GAP, 0, 0] };
    }

    doLayout(): void {
        this.stale = false;
    }
}

describe("an edge between overlapping nodes", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    afterEach(() => {
        scene.getEngine().dispose();
    });

    /**
     * Two default-size nodes of a shape GAP apart along x, joined by an edge with an arrow head, placed by `Edge.update()`.
     * @param shape - The nodes' shape.
     * @param type - The edge's line type.
     * @returns The placed edge.
     */
    function placedEdge(shape: string, type: string): Edge {
        const styles = Styles.default();
        const eventManager = new EventManager();
        const dataManager = new DataManager(eventManager, styles);
        const layoutManager = new LayoutManager(eventManager, dataManager, styles);
        const layout = new TwoNodeLayout();
        layoutManagerInternals.setEngine(layoutManager, layout);
        const context = new DefaultGraphContext(
            () => styles,
            dataManager,
            layoutManager,
            new MeshCache(),
            scene,
            new StatsManager(eventManager),
            {},
        );
        const nodePaint = { ...structuredClone(bootstrapNodePaint()), meshKey: `overlap-${shape}` };
        nodePaint.style.shape = { ...nodePaint.style.shape, type: shape } as typeof nodePaint.style.shape;
        for (const id of ["src", "dst"]) {
            const node = new Node(context, id, nodePaint, { id });
            dataManagerInternals.adoptNode(dataManager, node);
            dataManager.nodeCache.set(id, node);
            layout.addNode(node);
            node.update();
        }

        const style = structuredClone(bootstrapEdgePaint(false).style);
        style.line = { ...style.line, type } as typeof style.line;
        style.arrowHead = { ...style.arrowHead, type: "normal" };
        const edge = new Edge(context, "src", "dst", 0, { meshKey: `overlap-${shape}-${type}`, style }, {});
        dataManagerInternals.adoptEdge(dataManager, edge);
        layout.addEdge(edge);
        edge.update();
        return edge;
    }

    for (const shape of ["sphere", "box"]) {
        for (const type of ["solid", "dash-dot"]) {
            test(`a ${type} edge between ${shape}s ${GAP} apart is no longer than the gap`, () => {
                const edge = placedEdge(shape, type);
                if (EdgeMesh.drawsAsPattern({ line: { type } } as Parameters<typeof EdgeMesh.drawsAsPattern>[0])) {
                    for (const [i, element] of edge.drawnPattern.entries()) {
                        const { x } = element.position;
                        assert.isTrue(x >= -1e-6 && x <= GAP + 1e-6, `element ${i} at x=${x} lies outside the gap`);
                    }
                } else {
                    const line = edge.drawnLine;
                    assert.isNotNull(line);
                    assert.isAtMost(line.length, GAP + 1e-6, "no longer than the gap between centres");
                }
            });
        }
    }
});

describe("trimEnds between overlapping nodes", () => {
    const box = (half: number): TrimEnd => ({
        radius: null,
        half: { x: half, y: half, z: half },
        flat: false,
        border: 0,
        gap: 0,
        measured: TRIM_CLOSED,
        leaves: false,
        group: false,
    });

    test("two boxes that overlap have no line between them", () => {
        const ends = trimEnds({
            src: { x: 0, y: 0, z: 0 },
            dst: { x: GAP, y: 0, z: 0 },
            source: box(0.5),
            target: box(0.5),
            capBack: 0,
        });
        assert.deepEqual(ends, { src: null, dst: null, lineEnd: null });
    });

    test("two boxes apart still meet at their walls", () => {
        const ends = trimEnds({
            src: { x: 0, y: 0, z: 0 },
            dst: { x: 3, y: 0, z: 0 },
            source: box(0.5),
            target: box(0.5),
            capBack: 0,
        });
        assert.closeTo(ends.src?.x ?? Number.NaN, 0.5, 1e-9);
        assert.closeTo(ends.dst?.x ?? Number.NaN, 2.5, 1e-9);
    });
});
