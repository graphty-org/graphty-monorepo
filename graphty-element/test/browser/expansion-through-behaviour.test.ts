/**
 * @file On-demand expansion, reached the way a consumer reaches it.
 *
 * Double-clicking a node asks the consumer for that node's neighbourhood and adds what comes
 * back. The two functions that answer -- `fetchNodes` and `fetchEdges` -- are declared in
 * `GraphBehaviorOpts`, so `element.layoutBehavior = { fetchNodes, fetchEdges }` parses and is
 * stored in the configuration. `NodeBehavior` then looks for them somewhere else entirely: on
 * the `Graph` object's own `fetchNodes` and `fetchEdges` fields, which nothing in the package
 * ever assigned. The setting was accepted, kept, and never read; the only way to switch
 * expansion on was to reach past the element and write the field by hand.
 *
 * This file asks for it through the public door instead, double-clicks the node with the real
 * mouse (test/helpers/real-input.ts), and checks that what the double-click fetched is added as
 * one `data.expand` step.
 */

import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";
import { doubleClick, nodePoint } from "../helpers/real-input";

/**
 * Put node "a" on screen at the origin and double-click it with the real mouse.
 * @param graph - the graph to add the node to
 */
async function addAndDoubleClick(graph: Graph): Promise<void> {
    if (graph.getDataManager().getNode("a") === undefined) {
        await graph.addNodes([{ id: "a", position: { x: 0, y: 0, z: 0 } }]);
    }

    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    await doubleClick(graph.canvas, nodePoint(graph, "a"));
}

describe("expansion switched on through the element's own behaviour setting", () => {
    let container: HTMLDivElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setViewMode("2d");
        await graph.setLayout("fixed", { dim: 2 });
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    test("setLayoutBehavior makes double-click ask the consumer for the neighbourhood", async () => {
        const fetchEdges = vi.fn().mockReturnValue(new Set([{ source: "a", target: "b" }]));
        const fetchNodes = vi.fn().mockReturnValue([{ id: "b", data: {} }]);

        graph.setLayoutBehavior({ fetchNodes, fetchEdges });
        await addAndDoubleClick(graph);

        await vi.waitFor(() => {
            assert.isDefined(graph.getDataManager().getNode("b"), "what the consumer returned was added");
        });
        assert.strictEqual(fetchEdges.mock.calls.length, 1, "the consumer was asked for the edges");
        assert.strictEqual(fetchNodes.mock.calls.length, 1, "and for the nodes they name");
    });

    test("a behaviour set after a node is on screen still reaches that node", async () => {
        await graph.addNodes([{ id: "a", position: { x: 0, y: 0, z: 0 } }]);
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();

        const fetchEdges = vi.fn().mockReturnValue(new Set([{ source: "a", target: "b" }]));
        const fetchNodes = vi.fn().mockReturnValue([{ id: "b", data: {} }]);

        graph.setLayoutBehavior({ fetchNodes, fetchEdges });
        await addAndDoubleClick(graph);

        await vi.waitFor(() => {
            assert.isDefined(graph.getDataManager().getNode("b"));
        });
        assert.strictEqual(fetchEdges.mock.calls.length, 1);
    });

    test("an expansion is one step, and redo does not ask the consumer again", async () => {
        const fetchEdges = vi.fn().mockReturnValue(new Set([{ source: "a", target: "b" }]));
        const fetchNodes = vi.fn().mockReturnValue([{ id: "b" }]);
        graph.setLayoutBehavior({ fetchNodes, fetchEdges });
        await graph.addNodes([{ id: "a", position: { x: 0, y: 0, z: 0 } }]);
        const session = graph.getSession();
        const seen: string[] = [];
        dispatcherOf(session).events.dispatched = (command) => {
            seen.push(command.op);
        };
        const steps = session.history.steps.length;

        await addAndDoubleClick(graph);
        await vi.waitFor(() => {
            assert.lengthOf(session.history.steps, steps + 1, "one step");
        });

        assert.deepEqual(seen, ["data.expand"]);
        assert.isDefined(graph.getDataManager().getNode("b"));
        assert.strictEqual(graph.getEdgeCount(), 1);

        await session.undo();
        assert.isUndefined(graph.getDataManager().getNode("b"));
        assert.strictEqual(graph.getEdgeCount(), 0);

        await session.redo();
        assert.isDefined(graph.getDataManager().getNode("b"));
        assert.strictEqual(fetchEdges.mock.calls.length, 1, "the fetched records were kept");
        assert.strictEqual(fetchNodes.mock.calls.length, 1);
    });

    test("naming one pacing setting does not switch expansion back off", async () => {
        const fetchEdges = vi.fn().mockReturnValue(new Set([{ source: "a", target: "b" }]));
        const fetchNodes = vi.fn().mockReturnValue([{ id: "b", data: {} }]);

        graph.setLayoutBehavior({ fetchNodes, fetchEdges });
        graph.setLayoutBehavior({ layout: { preSteps: 5 } });
        await addAndDoubleClick(graph);

        await vi.waitFor(() => {
            assert.isDefined(graph.getDataManager().getNode("b"), "the merge kept the fetchers");
        });
        assert.strictEqual(fetchEdges.mock.calls.length, 1);
    });
});
