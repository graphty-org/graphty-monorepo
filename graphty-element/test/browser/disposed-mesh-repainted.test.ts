/**
 * @file A node whose mesh has been disposed is rebuilt when a style change arrives.
 *
 * `test/unit/node-mesh-disposed-regression.test.ts` lost three cases when 2.0 removed
 * `styleUpdates`: all three drove the old pending-style queue, so they went with it and nothing
 * pinned the same fact on the path that replaced them. The fact is worth pinning, because it is
 * the one that used to be broken: a 2D/3D switch clears the mesh cache and disposes every node
 * mesh, and a node that is never rebuilt is a node that is not on screen at all.
 *
 * This asks it through the public door -- add a layer, and the graph is still drawn -- and drives
 * the real disposal rather than a mock of one.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../src/Graph";

/** Three nodes, so a count is a count rather than a coincidence. */
const NODES = [{ id: "alpha" }, { id: "beta" }, { id: "gamma" }];

/** Two edges between them. */
const EDGES = [
    { src: "alpha", dst: "beta" },
    { src: "beta", dst: "gamma" },
];

describe("a node whose mesh has been disposed", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.setLayout("circular");
        await graph.operationQueue.waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * How many of the fixture's nodes currently have a live mesh.
     * @returns the count
     */
    function withLiveMeshes(): number {
        return NODES.filter((record) => {
            const node = graph.getNode(record.id);

            return node !== undefined && !node.mesh.isDisposed();
        }).length;
    }

    /**
     * Render a few frames, which is when a paint reaches a mesh.
     */
    async function frames(): Promise<void> {
        for (let frame = 0; frame < 5; frame++) {
            graph.scene.render();
            await new Promise<void>((done) => {
                setTimeout(done, 10);
            });
        }
    }

    it("is rebuilt by the render loop", async () => {
        assert.strictEqual(withLiveMeshes(), 3, "the fixture is drawn before anything is disposed");

        // What a 2D/3D switch does: every node mesh goes, because they are all instances of
        // source meshes the cache owns.
        graph.getMeshCache().clear();
        assert.strictEqual(withLiveMeshes(), 0, "the disposal really happened, so the rebuild means something");

        await frames();

        assert.strictEqual(withLiveMeshes(), 3, "the render loop noticed and rebuilt them");
    });

    it("comes back carrying a style change that arrived while it was gone", async () => {
        graph.getMeshCache().clear();

        await graph.getSession().styles.add({
            name: "red nodes",
            selector: { match: "everything" },
            set: { "node.color": "#FF0000" },
        });
        await frames();

        assert.strictEqual(withLiveMeshes(), 3, "every mesh is back");

        const node = graph.getNode("alpha");
        assert.isDefined(node);

        const painted = graph.getStylePainter().nodePaint(node.index)?.color ?? null;
        assert.deepStrictEqual(
            painted === null ? null : { r: painted.r, g: painted.g, b: painted.b },
            { r: 255, g: 0, b: 0 },
            "the rebuilt mesh is painted what the layer asked for, not what it was before",
        );
    });
});
