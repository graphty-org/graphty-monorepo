/**
 * @file What adding one edge repaints on a real element (issue #5893): under layers that paint
 * each element from that element alone it is the new edge and nothing else, whatever the graph's
 * size; a layer reading a node's degree still reaches the new edge's ends and nothing else while
 * its domain stands (issue #5897), and a layer can still take back paint from rows the narrowed pass did not visit. Counted in calls to
 * `applySessionPaint`, never timed.
 *
 * The render loop is stopped, so `graph.update()` is the one frame that applies the paint.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { Edge } from "../../src/Edge";
import { operationQueueOf } from "../../src/Graph";
import { Node } from "../../src/Node";
import { dispatcherOf } from "../../src/session/GraphSession";
import type { ElementSession } from "../../src/session/types";

/**
 * Mount a graphty-element over a path of `size` nodes, its paint applied.
 * @param size - The node count.
 * @returns The element.
 */
async function mount(size: number): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    await element.updateComplete;
    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element initialised its graph");
    });
    const { graph } = element;
    graph.engine.stopRenderLoop();
    await graph.setLayout("random");
    const ids = Array.from({ length: size }, (_, at) => `n${String(at)}`);
    await graph.addNodes(ids.map((id) => ({ id })));
    await graph.addEdges(ids.slice(1).map((id, at) => ({ source: ids[at], target: id })));
    await settle(element);
    return element;
}

/**
 * Let every queued write and pass finish, and draw one frame's update.
 * @param element - The element.
 */
async function settle(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await dispatcherOf(element.graph.getSession()).lane.settled();
    await element.graph.getSession().styles.settled();
    element.graph.update();
}

/**
 * Add one edge and count the elements repainted until its paint is applied.
 * @param element - The element.
 * @param edge - The edge.
 * @param edge.source - Its source.
 * @param edge.target - Its target.
 * @returns How many nodes and edges were repainted.
 */
async function repaintedBy(
    element: Graphty,
    edge: { source: string; target: string },
): Promise<{ nodes: number; edges: number }> {
    const nodes = vi.spyOn(Node.prototype, "applySessionPaint");
    const edges = vi.spyOn(Edge.prototype, "applySessionPaint");
    await element.graph.addEdges([edge]);
    await settle(element);
    const counted = { nodes: nodes.mock.calls.length, edges: edges.mock.calls.length };
    nodes.mockRestore();
    edges.mockRestore();
    return counted;
}

/**
 * The size one node is drawn from.
 * @param element - The element.
 * @param id - Its id.
 * @returns The size the renderer was handed.
 */
function drawnSize(element: Graphty, id: string): number | undefined {
    const node = element.graph.getDataManager().nodes.get(id);
    assert.isDefined(node);
    return element.graph.getStylePainter().nodePaint(node.index)?.style.shape?.size;
}

describe("adding one edge", () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    for (const size of [100, 400]) {
        it(`repaints only the new edge on a graph of ${String(size)} nodes`, async () => {
            const element = await mount(size);

            assert.deepEqual(await repaintedBy(element, { source: "n0", target: "n2" }), { nodes: 0, edges: 1 });
            assert.deepEqual(await repaintedBy(element, { source: "n0", target: "n3" }), { nodes: 0, edges: 1 });
        });
    }

    it("still repaints a node a binding sizes by degree, at both ends", async () => {
        const element = await mount(20);
        await element.graph.getSession().styles.add({
            name: "By degree",
            selector: { match: "everything" },
            encode: { "node.size": { by: "graphty.degree", scale: "linear", range: [1, 3] } },
        });
        await settle(element);
        assert.strictEqual(drawnSize(element, "n1"), drawnSize(element, "n3"), "both have degree two");

        const counted = await repaintedBy(element, { source: "n1", target: "n5" });

        assert.isAbove(counted.nodes, 1, "the ends were repainted");
        const untouched = drawnSize(element, "n3") ?? 0;
        assert.isAbove(drawnSize(element, "n1") ?? 0, untouched, "the source outgrew a node the edge missed");
        assert.isAbove(drawnSize(element, "n5") ?? 0, untouched, "the target outgrew a node the edge missed");
    });

    it("repaints only what the edge reached under encodings whose domain it leaves alone (#5897)", async () => {
        const element = await mount(20);
        const session = element.graph.getSession();
        await session.styles.add({
            name: "By degree",
            selector: { match: "everything" },
            encode: { "node.size": { by: "graphty.degree", scale: "linear", range: [1, 3] } },
        });
        await session.styles.add({
            name: "Hubs",
            selector: { match: "expression", where: "graphty.degree >= `3`" },
            set: { "node.opacity": 0.5 },
        });
        await repaintedBy(element, { source: "n1", target: "n5" });

        const counted = await repaintedBy(element, { source: "n2", target: "n8" });

        assert.deepEqual(counted, { nodes: 2, edges: 1 }, "the two ends and the edge, of 20 nodes");
    });

    it("still reaches the ends of the edge when a selector tests their degree", async () => {
        const element = await mount(20);
        const session = element.graph.getSession() as ElementSession;
        await session.styles.add({
            name: "Hubs",
            selector: { match: "expression", where: "graphty.degree >= `3`" },
            set: { "node.opacity": 0.5 },
        });
        await settle(element);
        const opacity = (id: string): unknown =>
            session.paint.styleOf("node", session.snapshot().ids.indexOf(id))["node.opacity"];
        assert.notStrictEqual(opacity("n1"), 0.5);

        await repaintedBy(element, { source: "n1", target: "n5" });

        assert.strictEqual(opacity("n1"), 0.5);
        assert.strictEqual(opacity("n5"), 0.5);
        assert.notStrictEqual(opacity("n3"), 0.5);
    });

    it("lets a layer take its paint back from a row painted before the add, once its run is gone", async () => {
        const element = await mount(5);
        const session = element.graph.getSession() as ElementSession;
        const run = session.runs.start("degree", {}, { as: "deg" });
        await run;
        await settle(element);
        for (const layer of session.styles.list().filter((entry) => entry.source.by !== "element")) {
            await session.styles.remove(layer.id);
        }

        await session.styles.add({
            name: "Measured",
            selector: { match: "has", path: "results.deg.value" },
            set: { "node.opacity": 0.5 },
        });
        await settle(element);
        const opacity = (): unknown => session.paint.styleOf("node", 0)["node.opacity"];
        assert.strictEqual(opacity(), 0.5);

        assert.deepEqual(await repaintedBy(element, { source: "n0", target: "n2" }), { nodes: 0, edges: 1 });
        session.runs.remove(run.id);
        await settle(element);

        assert.notStrictEqual(opacity(), 0.5);
    });
});
