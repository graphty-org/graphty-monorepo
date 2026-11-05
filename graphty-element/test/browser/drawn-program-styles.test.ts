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
import { readDrawn } from "../fidelity/drawn-scene";
import { strokedBarb } from "../fidelity/oracle/primitives";
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

    test("draws count rings, each the offset and a width beyond the one before", async () => {
        const reachOf = async (count: number): Promise<number> => {
            graph?.dispose();
            container?.remove();
            await oneEdge(
                {},
                {
                    "node.borderWidth": 0.1,
                    "node.outerBorderWidth": 0.2,
                    "node.outerBorderOffset": 0.1,
                    "node.outerBorderCount": count,
                },
            );
            assert(graph);
            const ring = (graph.getDataManager().nodes.get("A") as unknown as { outerBorder: AbstractMesh | null })
                .outerBorder;
            assert(ring, "the node draws its outer rings");
            ring.computeWorldMatrix(true);
            const box = ring.getBoundingInfo().boundingBox;
            return box.maximumWorld.x - box.centerWorld.x;
        };
        const one = await reachOf(1);
        const two = await reachOf(2);
        const three = await reachOf(3);
        assert.isAbove(two, one);
        // every further ring reaches out by the same step
        assert.closeTo(three - two, two - one, 1e-3);
    });

    test("draws none without a width", async () => {
        await oneEdge({}, { "node.outerBorderColor": "#ff0000" });
        assert(graph);
        const node = graph.getDataManager().nodes.get("A");
        assert.isNull((node as unknown as { outerBorder: AbstractMesh | null }).outerBorder);
    });
});

describe("an image cap", () => {
    // a 16 x 16 red triangle pointing right, written out as text, as vis-network files carry it
    const picture =
        "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20" +
        "height%3D%2216%22%3E%3Cpath%20d%3D%22M0%200%20L16%208%20L0%2016%20Z%22%20fill%3D%22%23d62728%22%2F%3E%3C%2Fsvg%3E";

    test("draws its picture standing on the line at the target, at the cap's length and width", async () => {
        const edge = await oneEdge({
            "edge.arrowHead": "image",
            "edge.arrowHeadImage": picture,
            "edge.arrowHeadSize": 2,
            "edge.arrowHeadWidth": 3,
        });
        const cap = edge.arrowCap;
        assert(cap, "the edge draws a cap at its target");
        assert.include(cap.name, "image");
        const mesh = cap.batchMesh;
        assert(mesh);
        const texture = (mesh.material as StandardMaterial).diffuseTexture as { url?: string } | null;
        assert.strictEqual(texture?.url, picture, "its material holds the picture");
        // at the target end, as long along the line as the cap and three times as wide across it
        assert.isAbove(cap.position.x, 2);
        const p = mesh.getVerticesData("position") ?? [];
        const xs = p.filter((_, i) => i % 3 === 0);
        const zs = p.filter((_, i) => i % 3 === 2);
        assert.closeTo((Math.max(...zs) - Math.min(...zs)) / (Math.max(...xs) - Math.min(...xs)), 3, 1e-6);
    });

    test("draws nothing without a picture", async () => {
        const edge = await oneEdge({ "edge.arrowHead": "image" });
        assert.isNull(edge.arrowCap);
    });
});

describe("the half arrow's other side and the open box", () => {
    test("each draws its own cap", async () => {
        const edge = await oneEdge({ "edge.arrowHead": "half-open-flipped", "edge.arrowTail": "open-box" });
        assert.include(edge.arrowCap?.name ?? "", "half-open-flipped");
        assert.include(edge.arrowTailCap?.name ?? "", "open-box");
    });
});

/**
 * The one edge's head as drawn on screen: its outline, where the line itself stops, and each measured along the line
 * toward the head (0 at the source) and across it.
 * @returns the head's outline, the line's stop and the head's tip along the line, and its length
 */
function drawnHead(): { outline: [number, number][]; along: number[]; across: number[]; stop: number; tip: number } {
    assert(graph);
    const drawn = [...readDrawn(graph).edges.values()][0];
    const outline = drawn?.caps.find((c) => c.end === "arrowHead")?.outline;
    assert(drawn?.lineEnds && outline, "a flat head and the line's own end are read from the scene");
    const [from, to] = [drawn.points[0], drawn.points.at(-1) ?? drawn.points[0]];
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const [ux, uy] = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
    const along = outline.map(([x, y]) => (x - from[0]) * ux + (y - from[1]) * uy);
    const across = outline.map(([x, y]) => -(x - from[0]) * uy + (y - from[1]) * ux);
    const [lx, ly] = drawn.lineEnds[1];
    return { outline, along, across, stop: (lx - from[0]) * ux + (ly - from[1]) * uy, tip: Math.max(...along) };
}

/**
 * How far back from the head's tip the head first meets its line: the farthest back of its corners on the line.
 * @param head - the drawn head
 * @returns the distance in pixels
 */
function meetsLineFrom(head: ReturnType<typeof drawnHead>): number {
    const onLine = head.along.filter((_, i) => Math.abs(head.across[i]) < 0.5);
    return head.tip - Math.min(...onLine);
}

describe("a half arrow's line and barb (#5490)", () => {
    test.each(["half-open", "half-open-flipped", "half-barb", "half-barb-flipped"])(
        "%s: the line runs on to where the arm meets it, leaving no break",
        async (type) => {
            await oneEdge({ "edge.arrowHead": type, "edge.arrowHeadSize": 3 });
            const head = drawnHead();
            const length = head.tip - Math.min(...head.along);
            assert.isAbove(length, 10, "the head is drawn large enough to measure");
            // the line stops no farther back than where the arm first meets it
            assert.isAtLeast(head.stop, head.tip - meetsLineFrom(head) - 1);
            // and not past the tip
            assert.isAtMost(head.stop, head.tip + 1);
        },
    );

    test("half-barb is one thin stroke where half-open is a filled wedge", async () => {
        await oneEdge({ "edge.arrowHead": "half-barb", "edge.arrowHeadSize": 3 });
        assert.isTrue(strokedBarb(drawnHead().outline));
        graph?.dispose();
        container?.remove();
        await oneEdge({ "edge.arrowHead": "half-open", "edge.arrowHeadSize": 3 });
        assert.isFalse(strokedBarb(drawnHead().outline));
    });
});

describe("a vee turned round, vis-network's crow (#5491)", () => {
    test("inverted-vee has its point back on the line and no tine reaching toward the node, where crow has one", async () => {
        await oneEdge({ "edge.arrowHead": "inverted-vee", "edge.arrowHeadSize": 3 });
        const vee = drawnHead();
        const veeLength = vee.tip - Math.min(...vee.along);
        // its point on the line at its back, its notch a quarter of its length back from its corners
        const onLine = vee.along.filter((_, i) => Math.abs(vee.across[i]) < 0.5);
        assert.closeTo(Math.min(...onLine), vee.tip - veeLength, 1);
        assert.closeTo(Math.max(...onLine), vee.tip - veeLength / 4, 1);
        // its corners at the tip, either side of the line
        assert.isBelow(Math.min(...vee.across), -1);
        assert.isAbove(Math.max(...vee.across), 1);

        graph?.dispose();
        container?.remove();
        await oneEdge({ "edge.arrowHead": "crow", "edge.arrowHeadSize": 3 });
        const crow = drawnHead();
        const crowOnLine = crow.along.filter((_, i) => Math.abs(crow.across[i]) < 0.5);
        // the crow's foot has a tine along the line reaching to its front
        assert.closeTo(Math.max(...crowOnLine), crow.tip, 1);
    });
});

describe("a node's underlay and overlay", () => {
    test("are filled shapes padded past the node, the underlay behind it and the overlay before it", async () => {
        await oneEdge(
            {},
            {
                "node.underlayOpacity": 0.5,
                "node.underlayColor": "#00ff00",
                "node.underlayPadding": 0.5,
                "node.overlayOpacity": 0.25,
                "node.overlayColor": "#0000ff",
                "node.overlayPadding": 0.25,
                "node.overlayShape": "round-rectangle",
            },
        );
        assert(graph);
        const node = graph.getDataManager().nodes.get("A");
        assert(node);
        const parts = node as unknown as {
            mesh: AbstractMesh;
            underlay: AbstractMesh | null;
            overlay: AbstractMesh | null;
        };
        assert(parts.underlay && parts.overlay, "the node draws both");
        const box = (m: AbstractMesh): { reach: number; front: number; back: number } => {
            m.computeWorldMatrix(true);
            const b = m.getBoundingInfo().boundingBox;
            return { reach: b.maximumWorld.x - b.centerWorld.x, front: b.minimumWorld.z, back: b.maximumWorld.z };
        };
        const fill = box(parts.mesh);
        const under = box(parts.underlay);
        const over = box(parts.overlay);
        // past the node by their padding, the underlay the farther
        assert.isAbove(over.reach, fill.reach);
        assert.isAbove(under.reach, over.reach);
        // 2D looks along +z: the underlay behind the node's back, the overlay before its front
        assert.isAbove(under.front, fill.back);
        assert.isBelow(over.back, fill.front);
        const paint = (m: AbstractMesh): StandardMaterial =>
            (m as unknown as { sourceMesh: Mesh }).sourceMesh.material as StandardMaterial;
        assert.strictEqual(paint(parts.underlay).emissiveColor.toHexString().toLowerCase(), "#00ff00");
        assert.strictEqual(paint(parts.underlay).alpha, 0.5);
        assert.strictEqual(paint(parts.overlay).emissiveColor.toHexString().toLowerCase(), "#0000ff");
    });

    test("draws none without an opacity", async () => {
        await oneEdge({}, { "node.underlayColor": "#00ff00", "node.underlayPadding": 0.5 });
        assert(graph);
        const node = graph.getDataManager().nodes.get("A");
        assert.isNull((node as unknown as { underlay: AbstractMesh | null }).underlay);
    });
});

describe("an edge's underlay and overlay", () => {
    test("are bands twice their padding wide, whatever the line's width, beneath and over the line", async () => {
        const edge = await oneEdge({
            "edge.width": 0.5,
            "edge.underlayOpacity": 0.5,
            "edge.underlayColor": "#00ff00",
            "edge.underlayPadding": 2,
            "edge.overlayOpacity": 0.5,
            "edge.overlayColor": "#0000ff",
            "edge.overlayPadding": 1,
        });
        const bands = (edge as unknown as { haloBands: { kind: string; batch: EdgeLineBatch }[] }).haloBands;
        const under = bands.find((b) => b.kind === "underlay");
        const over = bands.find((b) => b.kind === "overlay");
        assert(under && over, "both bands are drawn");
        assert.strictEqual(lookOf(under.batch).color, "#00ff00");
        assert.strictEqual(lookOf(over.batch).color, "#0000ff");
        assert.closeTo(lookOf(under.batch).width / lookOf(over.batch).width, 2, 1e-6);
        // the underlay behind the line, the overlay before it
        assert.isAbove(under.batch.mesh.position.z, 0);
        assert.isBelow(over.batch.mesh.position.z, 0);
    });
});
