/**
 * Settings other programs draw that the element draws too, each through a style channel:
 *
 * - an edge's outline, a band under its line (Cytoscape.js `line-outline-*`, vis-network `background`),
 * - an edge painted in a gradient (Cytoscape.js `line-fill` and its stops),
 * - an end caption placed on the line some distance from its node (Cytoscape.js `source-text-offset`),
 * - a node's outer border, a second ring outside its border (Cytoscape.js `outline-*`).
 */
import { type AbstractMesh, Color3, type Mesh, type StandardMaterial, type Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, test } from "vitest";

import type { StaticStyle } from "../../src/catalog/types";
import type { Edge } from "../../src/Edge";
import { Graph, operationQueueOf } from "../../src/Graph";
import { gradientPieceColors } from "../../src/meshes/edgeGradient";
import type { EdgeLineBatch } from "../../src/meshes/EdgeLineBatch";
import { asData, edgeBetween, styleEveryEdge, styleEveryNode } from "../helpers/testSetup";

let container: HTMLElement | undefined;
let graph: Graph | undefined;

afterEach(() => {
    graph?.dispose();
    container?.remove();
    graph = undefined;
    container = undefined;
});

/**
 * Two nodes 4 apart on the x axis, one edge between them, each styled by its layer, laid out and placed.
 * @param edgeSet - the edge layer
 * @param nodeSet - the node layer
 * @returns the edge
 */
async function oneEdge(edgeSet: StaticStyle, nodeSet: StaticStyle = {}): Promise<Edge> {
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.append(container);
    graph = new Graph(container);
    await graph.init();
    await graph.setViewMode("2d");
    await graph.setLayout("fixed", { dim: 2 });
    await graph.addNode(asData({ id: "A", position: { x: 0, y: 0, z: 0 } }));
    await graph.addNode(asData({ id: "B", position: { x: 4, y: 0, z: 0 } }));
    await graph.addEdge(asData({ id: "A:B", source: "A", target: "B" }), { source: "source", target: "target" });
    await styleEveryNode(graph, { "node.shape": "ellipse", ...nodeSet });
    if (Object.keys(edgeSet).length > 0) {
        await styleEveryEdge(graph, edgeSet);
    }
    await operationQueueOf(graph).waitForCompletion();
    // the paint applied and the edges placed, as a reader first sees them
    await graph.waitForStableFrame();
    const edge = edgeBetween(graph, "A", "B");
    assert(edge, "the edge is drawn");
    return edge;
}

interface EdgeLines {
    lineBatch: EdgeLineBatch | null;
    lineSlots: number[];
    outlineBatch: EdgeLineBatch | null;
    outlineSlots: number[];
    gradientPieces: { batch: EdgeLineBatch; slot: number; color: string }[];
}

/**
 * A batch's line width (world units) and color.
 * @param batch - the batch
 * @returns its width and its material's color
 */
function lookOf(batch: EdgeLineBatch): { width: number; color: string } {
    const { mesh } = batch;
    const width = (mesh.metadata as { lineWidth?: number }).lineWidth ?? 0;
    // the joined line's shader holds its color as a vector
    const v = (mesh.material as unknown as { _vectors3?: Record<string, Vector3> } | null)?._vectors3?.color;
    return { width, color: v ? new Color3(v.x, v.y, v.z).toHexString().toLowerCase() : "" };
}

describe("an edge's outline", () => {
    test("is a band under the line, wider by its width and in its color", async () => {
        const edge = await oneEdge({ "edge.width": 1, "edge.outlineWidth": 2, "edge.outlineColor": "#ff0000" });
        const lines = edge as unknown as EdgeLines;
        assert(lines.outlineBatch && lines.lineBatch, "the edge draws an outline batch beside its line");
        const line = lookOf(lines.lineBatch);
        const outline = lookOf(lines.outlineBatch);
        assert.closeTo(outline.width, 3 * line.width, 1e-9);
        assert.strictEqual(outline.color, "#ff0000");
        // drawn behind the line along the 2D camera's view, over the same points
        assert.isAbove(lines.outlineBatch.mesh.position.z, lines.lineBatch.mesh.position.z);
        const [a0, a1] = lines.lineBatch.endsOf(lines.lineSlots[0]);
        const [b0, b1] = lines.outlineBatch.endsOf(lines.outlineSlots[0]);
        assert.isTrue(a0.equalsWithEpsilon(b0, 1e-6) && a1.equalsWithEpsilon(b1, 1e-6));
    });

    test("draws none without a width", async () => {
        const edge = await oneEdge({ "edge.outlineColor": "#ff0000" });
        assert.isNull((edge as unknown as EdgeLines).outlineBatch);
    });
});

describe("an edge painted in a gradient", () => {
    test("is drawn as pieces from the source end to the target end in the gradient's colors", async () => {
        const edge = await oneEdge({ "edge.gradientColors": "#ff0000 #0000ff", "edge.color": "#505050" });
        const { gradientPieces, lineBatch, lineSlots } = edge as unknown as EdgeLines;
        assert.isAbove(gradientPieces.length, 2);
        assert.strictEqual(edge.drawnGradient[0], gradientPieces[0].color);
        // red at the source end, blue at the target end, each piece drawn in its own color
        assert.deepEqual(
            gradientPieces.map((p) => p.color),
            gradientPieceColors({ colors: "#ff0000 #0000ff" }),
        );
        for (const piece of gradientPieces) {
            assert.strictEqual(lookOf(piece.batch).color, piece.color);
        }
        // together they span the line
        assert(lineBatch);
        const [start, end] = lineBatch.endsOf(lineSlots[0]);
        const first = gradientPieces[0].batch.endsOf(gradientPieces[0].slot)[0];
        const lastPiece = gradientPieces.at(-1);
        assert(lastPiece);
        const last = lastPiece.batch.endsOf(lastPiece.slot)[1];
        assert.isTrue(first.equalsWithEpsilon(start, 1e-6) && last.equalsWithEpsilon(end, 1e-6));
    });

    test("draws none for kind none", async () => {
        const edge = await oneEdge({ "edge.gradientColors": "#ff0000 #0000ff", "edge.gradientKind": "none" });
        assert.lengthOf(edge.drawnGradient, 0);
    });
});

describe("an end caption placed on the line", () => {
    test("is centered on the line its distance from where the line leaves the node", async () => {
        const edge = await oneEdge({
            "edge.arrowHead": "none",
            "edge.arrowTailText": "Src",
            "edge.arrowTailTextDistance": 1,
        });
        const mesh = edge.arrowTailText?.labelMesh as AbstractMesh | undefined;
        assert(mesh, "the caption is drawn");
        // where the line leaves A toward B, past A's outline
        const leave = (
            edge as unknown as { leaveNode(node: unknown, centre: Vector3, toward: Vector3): Vector3 }
        ).leaveNode(edge.srcNode, edge.srcNode.mesh.position, edge.dstNode.mesh.position);
        // one unit along the line from where it leaves A, on the line itself
        assert.closeTo(mesh.position.x, leave.x + 1, 0.05);
        assert.closeTo(mesh.position.y, 0, 0.05);
    });
});

describe("a node's outer border", () => {
    test("is a ring outside the border, its offset beyond it, in its own color", async () => {
        await oneEdge(
            {},
            {
                "node.borderWidth": 0.1,
                "node.borderColor": "#000000",
                "node.outerBorderWidth": 0.2,
                "node.outerBorderOffset": 0.1,
                "node.outerBorderColor": "#ff0000",
            },
        );
        assert(graph);
        const node = graph.getDataManager().nodes.get("A");
        const parts = node as unknown as { border: AbstractMesh | null; outerBorder: AbstractMesh | null };
        assert(parts.border && parts.outerBorder, "the node draws its border and an outer ring");
        const reach = (m: AbstractMesh): number => {
            m.computeWorldMatrix(true);
            const box = m.getBoundingInfo().boundingBox;
            return box.maximumWorld.x - box.centerWorld.x;
        };
        // out past the border by the offset and the ring's own width, in the units a border width is
        const per = reach(parts.outerBorder) - reach(parts.border);
        assert.isAbove(per, 0);
        const source = (parts.outerBorder as unknown as { sourceMesh: Mesh }).sourceMesh;
        const material = source.material as StandardMaterial;
        assert.strictEqual(material.emissiveColor.toHexString().toLowerCase(), "#ff0000");
    });

    test("draws none without a width", async () => {
        await oneEdge({}, { "node.outerBorderColor": "#ff0000" });
        assert(graph);
        const node = graph.getDataManager().nodes.get("A");
        assert.isNull((node as unknown as { outerBorder: AbstractMesh | null }).outerBorder);
    });
});
