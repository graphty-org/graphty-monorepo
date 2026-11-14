/**
 * @file A node under the real mouse: dragged, hovered and double-clicked through the browser's own
 * input pipeline (test/helpers/real-input.ts), with the outcome read through the graph's public
 * API -- where the node is drawn, the drag events, whether the layout runs, what the expansion
 * added.
 */

import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

import { type Graph, operationQueueOf } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";
import { doubleClick, drag, hover, nodePoint, type Point } from "../helpers/real-input";
import { cleanupTestGraph, configureGraph, createTestGraph } from "../helpers/testSetup";

/**
 * Record every command the graph's session dispatches from here on.
 * @param graph - The graph.
 * @returns The commands, as they arrive.
 */
function watchDispatches(graph: Graph): Readonly<Record<string, unknown>>[] {
    const seen: Readonly<Record<string, unknown>>[] = [];
    dispatcherOf(graph.getSession()).events.dispatched = (command) => {
        seen.push(command as unknown as Readonly<Record<string, unknown>>);
    };
    return seen;
}

/**
 * Add one node at the origin and wait until it is drawn.
 * @param graph - The graph.
 * @param id - The node's id.
 * @returns Where it is drawn.
 */
async function placed(graph: Graph, id: string): Promise<Point> {
    await graph.addNodes([{ id, label: id, position: { x: 0, y: 0, z: 0 } }]);
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    return nodePoint(graph, id);
}

/**
 * Whether each drag that ended left its node pinned, as the drag-end events say.
 * @param graph - The graph.
 * @returns The `pinned` of every drag-end event from here on.
 */
function watchDrops(graph: Graph): boolean[] {
    const drops: boolean[] = [];
    graph.addListener("node-drag-end", (event) => {
        drops.push(event.pinned);
    });
    return drops;
}

/**
 * Drag a node 60 pixels to the right with the real mouse.
 * @param graph - The graph.
 * @param from - Where the node is drawn.
 * @param held - Run with the button still down at the end of the move.
 * @returns Where the pointer let go.
 */
async function dragRight(graph: Graph, from: Point, held?: () => Promise<void>): Promise<Point> {
    const to = { x: from.x + 60, y: from.y };
    await drag(graph.canvas, from, to, 8, held);
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    return to;
}

describe("a node under the real mouse", () => {
    let graph: Graph;

    beforeEach(async () => {
        graph = await createTestGraph();
        await configureGraph(graph, { viewMode: "2d", layout: "fixed", layoutOptions: { dim: 2 } });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        cleanupTestGraph(graph);
    });

    test("a drag with pinOnDrag on moves the node to the pointer and pins it", async () => {
        const from = await placed(graph, "test-node");
        assert.isTrue(graph.getNode("test-node")?.pinOnDrag, "pinOnDrag is on by default");
        const drops = watchDrops(graph);

        const to = await dragRight(graph, from);

        assert.deepEqual(drops, [true], "the drop pinned the node");
        assert.closeTo(nodePoint(graph, "test-node").x, to.x, 2, "the node is drawn where it was dropped");
    });

    test("a drag runs a settled layout again so neighbours respond", async () => {
        const from = await placed(graph, "test-node-2");
        assert.isFalse(graph.isRunning(), "the fixed layout has settled");
        const runningAtPickUp: boolean[] = [];
        graph.addListener("node-drag-start", () => {
            runningAtPickUp.push(graph.isRunning());
        });

        await dragRight(graph, from);

        assert.deepEqual(runningAtPickUp, [true], "picking the node up ran the layout");
    });

    test("a drag while the consumer has paused the layout leaves it paused", async () => {
        const from = await placed(graph, "held");
        graph.setRunning(false);

        let runningWhileHeld = true;
        await dragRight(graph, from, () => {
            runningWhileHeld = graph.isRunning();
            return Promise.resolve();
        });

        assert.isFalse(runningWhileHeld, "picking a node up does not resume the layout");
        assert.isFalse(graph.isRunning(), "and neither does dropping it");

        graph.setRunning(true);
        assert.isTrue(graph.isRunning());
    });

    test("the layout follows the node while the pointer drags it", async () => {
        const from = await placed(graph, "test-node-3");

        const target = from.x + 60;
        await dragRight(graph, from, async () => {
            await vi.waitFor(() => {
                assert.closeTo(nodePoint(graph, "test-node-3").x, target, 2, "drawn under the pointer before the drop");
            });
        });
    });

    test("moving the mouse over a node with no button held does not move it", async () => {
        const from = await placed(graph, "test-node-4");

        await hover(graph.canvas, from);
        await hover(graph.canvas, { x: from.x + 60, y: from.y });
        await graph.waitForStableFrame();

        assert.deepEqual(nodePoint(graph, "test-node-4"), from);
    });

    test("double-click expansion fetches the neighbourhood when fetchNodes/fetchEdges exist", async () => {
        const fetchNodes = vi.fn().mockReturnValue([
            { id: "node2", data: {} },
            { id: "node3", data: {} },
        ]);
        const fetchEdges = vi.fn().mockReturnValue(
            new Set([
                { src: "test-node-5", dst: "node2" },
                { src: "test-node-5", dst: "node3" },
            ]),
        );
        graph.setLayoutBehavior({ fetchNodes, fetchEdges });

        const at = await placed(graph, "test-node-5");
        const node = graph.getNode("test-node-5");
        const dispatched = watchDispatches(graph);

        await doubleClick(graph.canvas, at);
        await vi.waitFor(() => {
            assert.isDefined(graph.getNode("node3"), "what was fetched was added");
        });

        assert.equal(fetchEdges.mock.calls.length, 1);
        assert.equal(fetchEdges.mock.calls[0][0], node);
        assert.equal(fetchEdges.mock.calls[0][1], graph);

        // The nodes fetched are the neighbours, not the node itself
        assert.equal(fetchNodes.mock.calls.length, 1);
        const nodeIds = fetchNodes.mock.calls[0][0];
        assert.equal(nodeIds.size, 2);
        assert.isTrue(nodeIds.has("node2"));
        assert.isTrue(nodeIds.has("node3"));
        assert.isFalse(nodeIds.has("test-node-5"));

        // What was fetched is added as one step
        assert.deepEqual(
            dispatched.map((command) => command.op),
            ["data.expand"],
        );
    });

    test("double-click expansion reads the endpoints a canonical fetchEdges returns", async () => {
        // The handler used to read `e.src` and `e.dst` off whatever `fetchEdges` returned, so a
        // consumer following the guides -- which teach `source`/`target` everywhere -- collected a
        // set of `undefined` neighbours, fetched nothing, and left the edges pending for ever.
        const fetchNodes = vi.fn().mockReturnValue([
            { id: "node2", data: {} },
            { id: "node3", data: {} },
        ]);
        const fetchEdges = vi.fn().mockReturnValue(
            new Set([
                { source: "test-node-7", target: "node2" },
                { source: "test-node-7", target: "node3" },
            ]),
        );
        graph.setLayoutBehavior({ fetchNodes, fetchEdges });

        const at = await placed(graph, "test-node-7");
        const dispatched = watchDispatches(graph);

        await doubleClick(graph.canvas, at);
        await vi.waitFor(() => {
            assert.lengthOf(dispatched, 1, "the double-click dispatched the expansion");
        });

        const nodeIds = fetchNodes.mock.calls[0][0];
        assert.deepStrictEqual([...nodeIds].sort(), ["node2", "node3"], "the handler found the neighbours to fetch");

        // The spelling the handler resolved is passed on, so the edges are read by the same columns
        // rather than probed a second time and possibly answered differently.
        assert.deepInclude(dispatched[0], {
            op: "data.expand",
            seed: "test-node-7",
            source: "source",
            target: "target",
        });
    });

    test("double-click expansion does nothing when fetchNodes/fetchEdges don't exist", async () => {
        const at = await placed(graph, "test-node-6");
        const session = graph.getSession();
        const steps = session.history.steps.length;

        await doubleClick(graph.canvas, at);
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();

        assert.strictEqual(session.data.store.getSnapshot().nodeCount, 1, "no records reached the graph");
        assert.lengthOf(session.history.steps, steps, "and nothing was recorded");
    });

    test("mesh is made pickable", async () => {
        await placed(graph, "test-node-8");

        assert.equal(graph.getNode("test-node-8")?.mesh.isPickable, true);
    });
});
