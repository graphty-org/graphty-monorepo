/**
 * @file The number of scene objects grows with styles and nodes, never with edges (issue #441).
 *
 * THE DEFECT THIS GUARDS. Arrow heads were once thin instances of one shared mesh, and a single
 * commit turned each of them back into a `Mesh` with its own material. Nothing in the suite
 * noticed for ten months, until a graph of 18,000 nodes ran the renderer out of heap (issue
 * #419). Every test that looked at edges looked at how they were drawn, and none at how many
 * scene objects drawing them cost.
 *
 * WHAT IS PINNED. The SHAPE of the scene, counted, never timed: a few hundred edges of one
 * appearance add a handful of meshes to the scene, not a few hundred. And the buffer contract a
 * batch lives or dies by: when a node moves, the batch its edges are drawn from uploads its matrix
 * buffer on the next frame, and the matrix Babylon draws that edge's instance with is the moved one.
 * A batch that writes its own array and forgets to tell Babylon draws every edge where it was.
 */
import "@babylonjs/core/Meshes/thinInstanceMesh";

import { Mesh, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Edge } from "../../src/Edge";
import { Graph } from "../../src/Graph";
import { styleEveryEdge } from "../helpers/testSetup";

/** How many nodes sit on the circle. */
const NODE_COUNT = 30;

/** How many edges leave each node, to the next this-many nodes round the circle. */
const EDGES_PER_NODE = 10;

/** How many edges the graph has: a few hundred, far more than the bound below allows meshes for. */
const EDGE_COUNT = NODE_COUNT * EDGES_PER_NODE;

/**
 * Meshes the bound allows beyond one per node and one per edge appearance: the mesh a node
 * batch is instanced from, the source mesh a line batch is cloned from, and room for the few
 * helpers a scene carries. Two digits of slack against three digits of edges, so a renderer
 * that went back to a mesh per edge -- or even one per ten edges -- cannot fit under it.
 */
const SLACK = 10;

describe("the scene grows with styles and nodes, not with edges", () => {
    let container: HTMLElement;
    let graph: Graph;

    /** How many meshes the scene holds before any data is loaded. */
    let empty: number;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        empty = graph.scene.meshes.length;

        const nodes = Array.from({ length: NODE_COUNT }, (_, i) => ({ id: `n${String(i)}` }));
        const edges = nodes.flatMap((_, i) =>
            Array.from({ length: EDGES_PER_NODE }, (__, step) => ({
                src: `n${String(i)}`,
                dst: `n${String((i + step + 1) % NODE_COUNT)}`,
            })),
        );
        await graph.addNodes(nodes);
        await graph.addEdges(edges);
        await graph.setLayout("circular", { scale: 0.5 });
        await graph.operationQueue.waitForCompletion();
    }, 60000);

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Let the last repaint land and run a frame through the whole update-then-render path.
     */
    async function frame(): Promise<void> {
        await graph.operationQueue.waitForCompletion();
        graph.update();
        graph.scene.render();
    }

    /** @returns Every edge in the graph. */
    function edges(): Edge[] {
        return [...graph.getDataManager().edges.values()];
    }

    /**
     * The bound itself.
     *
     * An empty scene already holds `empty` meshes (whatever the camera and environment bring).
     * Each node is one scene object -- an instance of its style's node mesh. Each edge APPEARANCE
     * is one more: the batch every line of that appearance is a thin instance of, and, for a style
     * that draws arrow caps, the batch every cap of that shape is a thin instance of. Nothing in
     * that sum is per edge, so for this graph it is about 40 against 300 edges.
     * @param appearances - How many edge batches the style is entitled to.
     * @returns The most meshes the scene may hold.
     */
    function bound(appearances: number): number {
        return empty + NODE_COUNT + appearances + SLACK;
    }

    it("draws a few hundred edges of one style as one batch", async () => {
        await styleEveryEdge(graph, { "edge.arrowHead": "none" });
        await frame();

        assert.equal(edges().length, EDGE_COUNT, "the graph must actually load");
        const meshes = graph.scene.meshes.length;
        assert.isAtMost(
            meshes,
            bound(1),
            `${String(EDGE_COUNT)} edges of one style left ${String(meshes)} meshes in a scene that ` +
                `started with ${String(empty)}: that is growing with the edges`,
        );

        // The bound counts ONE line appearance, so check there is one, or it is the wrong bound.
        const appearances = new Set(edges().map((edge) => edge.drawnLine?.name));
        assert.notInclude([...appearances], undefined, "every line is a slot in a batch");
        assert.equal(appearances.size, 1, "every edge shares the one line appearance");
    });

    it("draws a few hundred arrow caps of one shape as one batch", async () => {
        await styleEveryEdge(graph, { "edge.arrowHead": "normal" });
        await frame();

        assert.equal(edges().length, EDGE_COUNT, "the graph must actually load");
        const caps = edges().flatMap((edge) => edge.drawnCaps);
        assert.equal(caps.length, EDGE_COUNT, "every edge draws a head, or the count proves nothing");

        // One line batch and one cap batch.
        const meshes = graph.scene.meshes.length;
        assert.isAtMost(
            meshes,
            bound(2),
            `${String(EDGE_COUNT)} edges with heads left ${String(meshes)} meshes in a scene that ` +
                `started with ${String(empty)}: that is growing with the edges`,
        );

        // The bound counts ONE cap shape, so check there is one, or it is the wrong bound.
        const capMeshes = new Set(edges().map((edge) => edge.arrowMesh?.batchMesh));
        assert.notInclude([...capMeshes], null, "every head is a slot in a batch");
        assert.equal(capMeshes.size, 1, "every head is a slot in the one cap batch");
    });

    /**
     * Move a node the way a drag does, and record which thin-instance buffers a batch mesh
     * uploads on the frame after.
     * @param node - Which node to move.
     * @param mesh - The batch mesh to watch.
     * @returns The buffer kinds the mesh uploaded.
     */
    function moveAndWatch(node: string, mesh: Mesh): string[] {
        const uploads: string[] = [];
        const upload = mesh.thinInstanceBufferUpdated.bind(mesh);
        mesh.thinInstanceBufferUpdated = (kind: string): void => {
            uploads.push(kind);
            upload(kind);
        };

        const moved = graph.getDataManager().nodes.get(node);
        assert.isDefined(moved, `node ${node} exists`);
        const to = moved.mesh.position.add(new Vector3(0, 0, 5));
        moved.mesh.position.copyFrom(to);
        graph.getLayoutManager().layoutEngine?.setNodePosition(moved, { x: to.x, y: to.y, z: to.z });
        graph.update();
        graph.scene.render();

        return uploads;
    }

    /**
     * Whether Babylon's own copy of a batch's instance matrices -- the one it draws from --
     * has an instance at a point.
     * @param mesh - The batch mesh.
     * @param at - The point.
     * @returns True when some instance is translated there.
     */
    function drawsAt(mesh: Mesh, at: Vector3): boolean {
        return mesh
            .thinInstanceGetWorldMatrices()
            .some((matrix) => matrix.getTranslation().equalsWithEpsilon(at, 1e-4));
    }

    it("uploads a line batch's matrices, and draws the moved matrix, when a node moves", async () => {
        await styleEveryEdge(graph, { "edge.arrowHead": "none" });
        await frame();

        const edge = edges().find((candidate) => candidate.srcId === "n0");
        assert.isDefined(edge);
        const lineBatch = edge.mesh;
        assert.instanceOf(lineBatch, Mesh, "a batched line points at its batch's mesh");
        const before = edge.drawnCentre.clone();

        const uploads = moveAndWatch("n0", lineBatch);

        assert.include(uploads, "matrix", "the frame after a move uploads the line matrices");
        const after = edge.drawnCentre;
        assert.isFalse(after.equalsWithEpsilon(before, 1e-3), "the edge's slot moved with its node");
        assert.isTrue(drawsAt(lineBatch, after), "Babylon draws the line batch from the moved matrix");
        assert.isFalse(drawsAt(lineBatch, before), "and no instance is still drawn where the edge was");
    });

    it("uploads a cap batch's matrices, and draws the moved matrix, when a node moves", async () => {
        await styleEveryEdge(graph, { "edge.arrowHead": "normal" });
        await frame();

        // The head sits at the destination end, so move the destination.
        const edge = edges().find((candidate) => candidate.dstId === "n0");
        assert.isDefined(edge);
        const cap = edge.arrowMesh;
        assert.isNotNull(cap);
        const capBatch = cap.batchMesh;
        assert.isNotNull(capBatch);
        const before = cap.position.clone();

        const uploads = moveAndWatch("n0", capBatch);

        assert.include(uploads, "matrix", "the frame after a move uploads the cap matrices");
        const after = cap.position;
        assert.isFalse(after.equalsWithEpsilon(before, 1e-3), "the cap's slot moved with its node");
        assert.isTrue(drawsAt(capBatch, after), "Babylon draws the cap batch from the moved matrix");
    });
});
